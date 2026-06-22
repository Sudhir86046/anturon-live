import { z } from 'zod';
import { router, organizationProcedure } from '../trpc/trpc.js';
import { vapi } from '../lib/vapi.js';

// ── helpers ────────────────────────────────────────────────────────
function callDate(c: any): Date | null {
  const ts = c.startedAt || c.createdAt;
  return ts ? new Date(ts) : null;
}

function sumDuration(arr: any[]): number {
  return arr.reduce((s, c) => s + (c.duration || 0), 0);
}

export const analyticsRouter = router({
  // Dashboard overview — today / week / month + per-agent breakdown
  overview: organizationProcedure
    .query(async () => {
      const [calls, assistants] = await Promise.all([
        vapi.calls.list({ limit: 100 }),
        vapi.assistants.list().catch(() => [] as any[]),
      ]);

      const assistantMap = new Map(assistants.map((a: any) => [a.id, a.name]));

      const now = new Date();
      const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const inRange = (c: any, from: Date) => { const d = callDate(c); return !!d && d >= from; };

      const todayCalls = calls.filter(c => inRange(c, startOfDay));
      const weekCalls  = calls.filter(c => inRange(c, startOfWeek));
      const monthCalls = calls.filter(c => inRange(c, startOfMonth));

      // Per-assistant performance
      const byAssistant: Record<string, { name: string; calls: number; duration: number; ended: number }> = {};
      calls.forEach(c => {
        const id = c.assistantId || 'unknown';
        if (!byAssistant[id]) byAssistant[id] = { name: assistantMap.get(id) || id, calls: 0, duration: 0, ended: 0 };
        byAssistant[id].calls++;
        byAssistant[id].duration += c.duration || 0;
        if (c.status === 'ended') byAssistant[id].ended++;
      });

      return {
        today: { calls: todayCalls.length, minutes: Math.round(sumDuration(todayCalls) / 60) },
        week:  { calls: weekCalls.length,  minutes: Math.round(sumDuration(weekCalls) / 60) },
        month: { calls: monthCalls.length, minutes: Math.round(sumDuration(monthCalls) / 60) },
        total: { calls: calls.length, minutes: Math.round(sumDuration(calls) / 60) },
        agentPerformance: Object.entries(byAssistant).map(([id, v]) => ({
          agentId:   id,
          agentName: v.name,
          calls:     v.calls,
          ended:     v.ended,
          minutes:   Math.round(v.duration / 60),
          successRate: v.calls > 0 ? Math.round((v.ended / v.calls) * 100) : 0,
        })),
      };
    }),

  // Daily call volume for the last N days (for charts)
  timeSeries: organizationProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(30) }))
    .query(async ({ input }) => {
      const calls = await vapi.calls.list({ limit: 100 });
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - input.days);

      const grouped: Record<string, { calls: number; ended: number; duration: number; cost: number }> = {};

      calls.forEach(c => {
        const d = callDate(c);
        if (!d || d < cutoff) return;
        const key = d.toISOString().split('T')[0];
        if (!grouped[key]) grouped[key] = { calls: 0, ended: 0, duration: 0, cost: 0 };
        grouped[key].calls++;
        grouped[key].duration += c.duration || 0;
        grouped[key].cost += c.cost || 0;
        if (c.status === 'ended') grouped[key].ended++;
      });

      // Fill all dates in range
      const result = [];
      for (let i = input.days - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const data = grouped[key] || { calls: 0, ended: 0, duration: 0, cost: 0 };
        result.push({ date: key, ...data, minutes: Math.round(data.duration / 60) });
      }

      return result;
    }),
});
