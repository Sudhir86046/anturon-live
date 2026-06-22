import { Router, Request, Response } from 'express';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Store SSE clients per org: orgId → Set<Response>
const sseClients = new Set<Response>();
// Also broadcast per-org so frontend can filter
const orgSseClients = new Map<string, Set<Response>>();

function broadcastToAll(data: string) {
  sseClients.forEach(client => client.write(`data: ${data}\n\n`));
}

function broadcastToOrg(orgId: string, data: string) {
  orgSseClients.get(orgId)?.forEach(client => client.write(`data: ${data}\n\n`));
}

// ── Notification helpers ─────────────────────────────────────────────────────
async function findOrgByVapiCall(call: any): Promise<string | null> {
  const assistantId   = call?.assistantId;
  const phoneNumberId = call?.phoneNumberId;

  if (!assistantId && !phoneNumberId) return null;

  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        assistantId   ? { defaultVapiAssistantId:   assistantId   } : {},
        phoneNumberId ? { defaultVapiPhoneNumberId: phoneNumberId } : {},
      ],
    },
    select: { id: true, walletBalance: true },
  });
  return org?.id ?? null;
}

async function createNotification(
  organizationId: string,
  type: string,
  title: string,
  message: string,
  extra?: { vapiCallId?: string; agentName?: string; meta?: string }
) {
  try {
    const notif = await prisma.notification.create({
      data: {
        organizationId,
        type,
        title,
        message,
        vapiCallId: extra?.vapiCallId,
        agentName:  extra?.agentName,
        meta:       extra?.meta,
      },
    });

    // Push to org-specific SSE clients as a `notification` event
    const sseData = JSON.stringify({
      type: 'notification',
      notification: notif,
    });
    broadcastToOrg(organizationId, sseData);
    broadcastToAll(sseData);

    return notif;
  } catch (err) {
    console.error('[notifications] Failed to create notification:', err);
  }
}

async function checkLowWallet(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { walletBalance: true },
  });
  if (!org) return;

  // Compute real remaining from DB call cost aggregate
  const agg = await prisma.call.aggregate({
    where: { organizationId },
    _sum: { cost: true, duration: true },
  });
  const spent = (agg._sum.cost ?? 0) + ((agg._sum.duration ?? 0) / 60) * 0.015;
  const remaining = Math.max(0, org.walletBalance - spent);

  if (remaining < 1.00) {
    // Only create if there's no unread low_wallet notif in last 1h
    const recent = await prisma.notification.findFirst({
      where: {
        organizationId,
        type: 'low_wallet',
        dismissed: false,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (!recent) {
      await createNotification(
        organizationId,
        'low_wallet',
        'Low wallet balance',
        `Only $${remaining.toFixed(2)} remaining. Top up soon to avoid interruptions.`,
      );
    }
  }
}

// VAPI webhook receiver
router.post('/webhook', async (req: Request, res: Response) => {
  const event = req.body;
  console.log('📞 VAPI webhook:', event?.message?.type || event?.type);

  try {
    const type    = event?.message?.type || event?.type;
    const payload = event?.message || event;

    // Store in Redis for persistence (TTL 24h)
    await redis.lpush('vapi:events', JSON.stringify({ type, payload, receivedAt: new Date().toISOString() }));
    await redis.ltrim('vapi:events', 0, 499);

    // Broadcast to all SSE clients (for real-time UI updates)
    const data = JSON.stringify({ type, payload, receivedAt: new Date().toISOString() });
    broadcastToAll(data);

    // ── Generate real notifications ──────────────────────────────────────────
    const call = payload?.call || payload;

    if (type === 'end-of-call-report' || type === 'call-ended') {
      const orgId = await findOrgByVapiCall(call);
      if (orgId) {
        const agentName   = call?.assistant?.name || call?.assistantId || 'Agent';
        const duration    = call?.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : '';
        const callType    = call?.type === 'webCall' ? 'Web call' : call?.type === 'inboundPhoneCall' ? 'Inbound call' : 'Outbound call';
        const endedReason = call?.endedReason || '';
        const isFailed    = endedReason && !['assistant-ended-call', 'customer-ended-call', 'hangup'].includes(endedReason);

        if (isFailed) {
          await createNotification(orgId, 'call_failed',
            'Call ended unexpectedly',
            `${callType} via ${agentName} ended: ${endedReason.replace(/-/g, ' ')}${duration ? ` · ${duration}` : ''}`,
            { vapiCallId: call?.id, agentName }
          );
        } else {
          await createNotification(orgId, 'call_completed',
            'Call completed',
            `${callType} handled by ${agentName}${duration ? ` · ${duration}` : ''}`,
            { vapiCallId: call?.id, agentName }
          );
        }

        // Check wallet balance after every completed call
        checkLowWallet(orgId).catch(() => {});
      }
    }

    if (type === 'assistant-request-returned-error' || type === 'function-call-result-failed') {
      const orgId = await findOrgByVapiCall(call);
      if (orgId) {
        await createNotification(orgId, 'agent_error',
          'Agent error',
          `An error occurred during a call: ${payload?.error?.message || type}`,
          { vapiCallId: call?.id }
        );
      }
    }

  } catch (err) {
    console.error('Webhook processing error:', err);
  }

  res.status(200).json({ received: true });
});

// SSE endpoint for real-time frontend updates
// Optional ?orgId= query param registers the client for org-scoped notification events
router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.flushHeaders();

  const orgId = req.query.orgId as string | undefined;

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', receivedAt: new Date().toISOString() })}\n\n`);

  // Register client globally + per-org if orgId provided
  sseClients.add(res);
  if (orgId) {
    if (!orgSseClients.has(orgId)) orgSseClients.set(orgId, new Set());
    orgSseClients.get(orgId)!.add(res);
  }
  console.log(`📡 SSE client connected org=${orgId ?? 'global'} (${sseClients.size} total)`);

  // Send recent events from Redis on connect
  redis.lrange('vapi:events', 0, 9).then(events => {
    events.reverse().forEach(e => {
      res.write(`data: ${e}\n\n`);
    });
  }).catch(() => {});

  // Keepalive ping every 30s
  const keepalive = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepalive);
    sseClients.delete(res);
    if (orgId) orgSseClients.get(orgId)?.delete(res);
    console.log(`📡 SSE client disconnected (${sseClients.size} total)`);
  });
});

export default router;
