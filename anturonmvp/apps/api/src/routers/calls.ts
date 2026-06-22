import { z } from 'zod';
import { router, organizationProcedure } from '../trpc/trpc.js';
import { TRPCError } from '@trpc/server';
import { vapi } from '../lib/vapi.js';
import { prisma } from '../lib/prisma.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Derive a short human-readable Anturon ID from a cuid, e.g. ANT-A3F2B1 */
function toAnturonId(cuid: string): string {
  const hex = Buffer.from(cuid.slice(-6)).toString('hex').slice(0, 6).toUpperCase();
  return `ANT-${hex}`;
}

/** Mask a phone number: +919876543210 → +91 98765 ••••• */
function maskPhone(phone?: string | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return phone;
  return phone.slice(0, -5) + '•••••';
}

export const callsRouter = router({
  // List calls from VAPI — enriched with assistant names + Anturon call IDs
  list: organizationProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(100),
      assistantId: z.string().optional(),
      createdAtGt: z.string().optional(),
      createdAtLt: z.string().optional(),
    }).default({ limit: 100 }))
    .query(async ({ ctx, input }) => {
      try {
        // Get org's assigned VAPI resource IDs for scoping
        const org = await prisma.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { defaultVapiAssistantId: true, defaultVapiPhoneNumberId: true },
        });

        // Fetch all VAPI calls, then filter to org's assigned assistant/phone
        const [allVapiCalls, assistants] = await Promise.all([
          vapi.calls.list({
            assistantId: input.assistantId || org?.defaultVapiAssistantId || undefined,
            limit: input.limit,
            createdAtGt: input.createdAtGt,
            createdAtLt: input.createdAtLt,
          }),
          vapi.assistants.list().catch(() => [] as any[]),
        ]);

        // Secondary filter: also include calls made via org's assigned phone number
        const orgAssistantId   = org?.defaultVapiAssistantId;
        const orgPhoneNumberId = org?.defaultVapiPhoneNumberId;

        const vapiCalls = (orgAssistantId || orgPhoneNumberId)
          ? allVapiCalls.filter(c =>
              (orgAssistantId   && c.assistantId    === orgAssistantId)   ||
              (orgPhoneNumberId && c.phoneNumberId  === orgPhoneNumberId)
            )
          : allVapiCalls;

        const assistantMap = new Map(assistants.map((a: any) => [a.id, a]));

        // Upsert DB records so we maintain a stable Anturon call ID per VAPI call
        const upsertResults = await Promise.all(
          vapiCalls.map(c =>
            prisma.call.upsert({
              where: { vapiCallId: c.id },
              create: {
                vapiCallId: c.id,
                organizationId: ctx.organizationId,
                customerPhone: c.customer?.number || null,
                customerName: c.customer?.name || null,
                status: c.status,
                direction: c.type === 'outboundPhoneCall' ? 'outbound' : 'inbound',
                startedAt: c.startedAt ? new Date(c.startedAt) : new Date(),
                endedAt: c.endedAt ? new Date(c.endedAt) : null,
                duration: c.duration ?? null,
                cost: c.cost ?? null,
                recordingUrl: c.recordingUrl ?? null,
              },
              update: {
                status: c.status,
                endedAt: c.endedAt ? new Date(c.endedAt) : null,
                duration: c.duration ?? null,
                cost: c.cost ?? null,
                recordingUrl: c.recordingUrl ?? null,
              },
              select: { id: true, vapiCallId: true },
            }).catch(() => null)
          )
        );

        // Build a vapiCallId → anturonCallId map
        const idMap = new Map<string, string>();
        for (const r of upsertResults) {
          if (r?.vapiCallId) idMap.set(r.vapiCallId, toAnturonId(r.id));
        }

        const MARKUP_PER_MIN = 0.015;
        const enriched = vapiCalls.map(c => ({
          ...c,
          cost: c.cost != null
            ? c.cost + ((c.duration || 0) / 60) * MARKUP_PER_MIN
            : null,
          assistant: assistantMap.get(c.assistantId) || c.assistant || null,
          anturonCallId: idMap.get(c.id) || null,
          // Mask phone for display
          customerDisplay: c.customer?.number
            ? { masked: maskPhone(c.customer.number), raw: c.customer.number }
            : c.type === 'webCall'
              ? { masked: 'Web Call', raw: null }
              : { masked: 'Unknown', raw: null },
        }));

        return { calls: enriched, nextCursor: undefined };
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),

  // Get single call from VAPI
  get: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        return await vapi.calls.get(input.id);
      } catch (err: any) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Call not found' });
      }
    }),

  // Initiate outbound call via VAPI
  initiate: organizationProcedure
    .input(z.object({
      assistantId: z.string(),
      phoneNumber: z.string(),
      customerName: z.string().optional(),
      phoneNumberId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const call = await vapi.calls.create({
          assistantId: input.assistantId,
          customer: { number: input.phoneNumber, name: input.customerName },
          phoneNumberId: input.phoneNumberId,
        });
        // Return full call object so frontend can show status/errors
        return {
          id: call.id,
          status: call.status,
          type: call.type,
          phoneNumberId: (call as any).phoneNumberId,
          assistantId: call.assistantId,
          createdAt: call.createdAt,
          endedReason: call.endedReason,
          raw: call,
        };
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),

  // AI analysis of a call — key points, next actions, disposition
  analyze: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const call = await vapi.calls.get(input.id);

        // If VAPI already has structured analysis, use it as base
        const vapiSummary = call.analysis?.summary || '';
        const transcript  = call.transcript || '';

        if (!transcript && !vapiSummary) {
          return { keyPoints: [], nextActions: [], disposition: 'No transcript available', sentiment: null, summary: '' };
        }

        const groqKey = process.env.GROQ_API_KEY;

        if (groqKey) {
          const prompt = `You are an expert call analyst. Analyze the following call transcript and return a JSON object with exactly these fields:
- "summary": a 1-2 sentence summary of the call
- "keyPoints": array of 3-5 key discussion points (strings)
- "nextActions": array of 2-4 recommended next actions (strings)
- "disposition": one of: "Interested", "Not Interested", "Needs Follow-up", "Converted", "Escalated", "No Action Required", "Callback Requested", "Wrong Number"
- "sentiment": one of: "Positive", "Neutral", "Negative"

Transcript:
${transcript || vapiSummary}

Respond ONLY with valid JSON, no markdown, no explanation.`;

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: 'json_object' },
              max_tokens: 600,
              temperature: 0.2,
            }),
          });
          const aiData = await res.json();
          const raw = aiData.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(raw);
          return {
            summary:     parsed.summary     || vapiSummary,
            keyPoints:   Array.isArray(parsed.keyPoints)   ? parsed.keyPoints   : [],
            nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : [],
            disposition: parsed.disposition || 'No Action Required',
            sentiment:   parsed.sentiment   || null,
          };
        }

        // Fallback — use VAPI's own analysis fields
        return {
          summary:     vapiSummary,
          keyPoints:   vapiSummary ? [vapiSummary] : [],
          nextActions: call.analysis?.structuredData?.nextActions || [],
          disposition: call.analysis?.successEvaluation || 'No Action Required',
          sentiment:   null,
        };
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),

  // Get call stats computed from VAPI data
  stats: organizationProcedure
    .query(async ({ ctx }) => {
      try {
        // Sum cost + Anturon markup ($0.015/min) from DB — all records, no limit
        const [costAgg, org] = await Promise.all([
          prisma.call.aggregate({
            where: { organizationId: ctx.organizationId },
            _sum: { cost: true, duration: true },
          }),
          prisma.organization.findUnique({
            where: { id: ctx.organizationId },
            select: { walletBalance: true },
          }),
        ]);

        const calls = await vapi.calls.list({ limit: 100 });
        const ended = calls.filter(c => c.status === 'ended');
        const totalDuration = ended.reduce((sum, c) => sum + (c.duration || 0), 0);
        const totalCalls = calls.length;
        const completedCalls = ended.length;

        return {
          totalCalls,
          completedCalls,
          failedCalls: calls.filter(c => c.endedReason && c.endedReason !== 'assistant-ended-call').length,
          totalDuration,
          avgDuration: completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0,
          totalCost: (costAgg._sum.cost ?? 0) + ((costAgg._sum.duration ?? 0) / 60) * 0.015,
          walletBalance: org?.walletBalance ?? 5.00,
        };
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),
});
