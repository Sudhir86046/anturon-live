import { z } from 'zod';
import { router, organizationProcedure, adminProcedure } from '../trpc/trpc.js';
import { TRPCError } from '@trpc/server';
import { vapi } from '../lib/vapi.js';
import { prisma } from '../lib/prisma.js';

export const agentsRouter = router({
  // Expose VAPI public key to authenticated frontend users
  getPublicKey: organizationProcedure
    .query(() => {
      return { publicKey: process.env.VAPI_PUBLIC_KEY || '' };
    }),

  // List agents scoped to this org (default assigned + any org-created ones)
  list: organizationProcedure
    .query(async ({ ctx }) => {
      try {
        // Get org's assigned default assistant ID + any extra agents stored in DB
        const org = await prisma.organization.findUnique({
          where: { id: ctx.organizationId },
          select: { defaultVapiAssistantId: true },
        });

        // Get extra agent IDs created by this org stored in DB
        const dbAgents = await prisma.voiceAgent.findMany({
          where: { organizationId: ctx.organizationId },
          select: { id: true },
        });

        const allowedIds = new Set<string>();
        if (org?.defaultVapiAssistantId) allowedIds.add(org.defaultVapiAssistantId);
        dbAgents.forEach(a => allowedIds.add(a.id));

        const allAgents = await vapi.assistants.list();

        // If no isolation set up yet (fresh deploy), return all — otherwise filter
        if (allowedIds.size === 0) return allAgents;
        return allAgents.filter((a: any) => allowedIds.has(a.id));
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),

  // Get single agent from VAPI
  get: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        return await vapi.assistants.get(input.id);
      } catch (err: any) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }
    }),

  // Create agent in VAPI
  create: organizationProcedure
    .input(z.object({
      name: z.string().min(2),
      systemPrompt: z.string().optional(),
      firstMessage: z.string().optional(),
      firstMessageMode: z.enum(['assistant-speaks-first', 'assistant-waits-for-user', 'assistant-speaks-first-with-model-generated-message']).optional(),
      transcriber: z.object({
        provider: z.string(),
        model: z.string().optional(),
        language: z.string().optional(),
      }).optional(),
      model: z.object({
        provider: z.string().default('openai'),
        model: z.string().default('gpt-4o-mini'),
      }).optional(),
      voice: z.object({
        provider: z.string().default('11labs'),
        voiceId: z.string(),
      }).optional(),
      maxDurationSeconds: z.number().default(600),
      recordingEnabled: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      try {
        const agent = await vapi.assistants.create({
          name: input.name,
          model: input.model
            ? { ...input.model, messages: input.systemPrompt ? [{ role: 'system', content: input.systemPrompt }] : [] }
            : { provider: 'openai', model: 'gpt-4o-mini', messages: input.systemPrompt ? [{ role: 'system', content: input.systemPrompt }] : [] },
          transcriber: input.transcriber as any,
          voice: input.voice,
          firstMessage: input.firstMessage,
          firstMessageMode: input.firstMessageMode ?? 'assistant-speaks-first',
          maxDurationSeconds: input.maxDurationSeconds,
          recordingEnabled: input.recordingEnabled,
        });
        return agent;
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),

  // Update agent in VAPI
  update: organizationProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      systemPrompt: z.string().optional(),
      firstMessage: z.string().optional(),
      firstMessageMode: z.enum(['assistant-speaks-first', 'assistant-waits-for-user', 'assistant-speaks-first-with-model-generated-message']).optional(),
      transcriber: z.object({
        provider: z.string(),
        model: z.string().optional(),
        language: z.string().optional(),
      }).optional(),
      model: z.object({
        provider: z.string(),
        model: z.string(),
      }).optional(),
      voice: z.object({
        provider: z.string(),
        voiceId: z.string(),
      }).optional(),
      maxDurationSeconds: z.number().optional(),
      recordingEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const { id, systemPrompt, ...rest } = input;
        const updateData: any = { ...rest };
        if (systemPrompt !== undefined) {
          const current = await vapi.assistants.get(id);
          updateData.model = {
            ...(current.model || { provider: 'openai', model: 'gpt-4o-mini' }),
            messages: [{ role: 'system', content: systemPrompt }],
          };
        }
        return await vapi.assistants.update(id, updateData);
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),

  // Delete agent from VAPI
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await vapi.assistants.delete(input.id);
        return { success: true };
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),

  // Get phone numbers from VAPI
  getPhoneNumbers: organizationProcedure
    .query(async () => {
      try {
        return await vapi.phoneNumbers.list();
      } catch (err: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: err.message });
      }
    }),
});
