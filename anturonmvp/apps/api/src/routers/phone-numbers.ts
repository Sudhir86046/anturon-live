import { z } from 'zod';
import { router, organizationProcedure } from '../trpc/trpc.js';
import { TRPCError } from '@trpc/server';
import { vapi } from '../lib/vapi.js';
import { prisma } from '../lib/prisma.js';

export const phoneNumbersRouter = router({
  // List phone numbers scoped to this org's assigned number
  list: organizationProcedure
    .query(async ({ ctx }) => {
      try {
        const [org, allNumbers, assistants, dbConfigs] = await Promise.all([
          prisma.organization.findUnique({
            where: { id: ctx.organizationId },
            select: { defaultVapiPhoneNumberId: true },
          }),
          vapi.phoneNumbers.list(),
          vapi.assistants.list().catch(() => [] as any[]),
          prisma.phoneNumberConfig.findMany({ where: { organizationId: ctx.organizationId } }),
        ]);

        const assistantMap = new Map(assistants.map((a: any) => [a.id, a]));
        const configMap = new Map(dbConfigs.map(c => [c.vapiPhoneNumberId, c]));

        // Scope to this org's assigned phone number; fall back to all if none set
        const numbers = org?.defaultVapiPhoneNumberId
          ? allNumbers.filter(n => n.id === org.defaultVapiPhoneNumberId)
          : allNumbers;

        return numbers.map(n => {
          const cfg = configMap.get(n.id);
          return {
            ...n,
            assistant: n.assistantId ? (assistantMap.get(n.assistantId) || null) : null,
            allowedCallTypes: cfg
              ? JSON.parse(cfg.allowedCallTypes)
              : ['inbound', 'outbound'],
          };
        });
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),

  // Update: push assistantId to VAPI + persist allowedCallTypes in our DB
  update: organizationProcedure
    .input(z.object({
      id: z.string(),
      assistantId: z.string().nullable().optional(),
      allowedCallTypes: z.array(z.enum(['inbound', 'outbound'])).optional(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. Push assistantId (and optional name) to VAPI
        const vapiPayload: Record<string, any> = {};
        if (input.assistantId !== undefined) vapiPayload.assistantId = input.assistantId ?? null;
        if (input.name !== undefined) vapiPayload.name = input.name;

        const [updated] = await Promise.all([
          Object.keys(vapiPayload).length
            ? vapi.phoneNumbers.update(input.id, vapiPayload)
            : vapi.phoneNumbers.list().then(ns => ns.find(n => n.id === input.id)),

          // 2. Persist allowedCallTypes in our DB
          input.allowedCallTypes
            ? prisma.phoneNumberConfig.upsert({
                where: { vapiPhoneNumberId: input.id },
                create: {
                  vapiPhoneNumberId: input.id,
                  organizationId: ctx.organizationId,
                  allowedCallTypes: JSON.stringify(input.allowedCallTypes),
                },
                update: {
                  allowedCallTypes: JSON.stringify(input.allowedCallTypes),
                },
              })
            : Promise.resolve(null),
        ]);

        return { ...updated, allowedCallTypes: input.allowedCallTypes };
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),
});
