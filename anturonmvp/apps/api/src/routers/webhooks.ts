import { z } from 'zod';
import { router, organizationProcedure, adminProcedure } from '../trpc/trpc.js';
import { TRPCError } from '@trpc/server';

export const webhooksRouter = router({
  // List webhooks
  list: organizationProcedure
    .query(async ({ ctx }) => {
      const webhooks = await ctx.prisma.webhookConfig.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { createdAt: 'desc' },
      });
      
      return webhooks;
    }),

  // Get single webhook
  get: organizationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const webhook = await ctx.prisma.webhookConfig.findFirst({
        where: { 
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });
      
      if (!webhook) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }
      
      return webhook;
    }),

  // Create webhook
  create: adminProcedure
    .input(z.object({
      name: z.string().min(2),
      url: z.string().url(),
      secret: z.string().optional(),
      events: z.array(z.enum([
        'call_started',
        'call_ended',
        'call_transcribed',
        'call_transferred',
        'agent_created',
        'agent_updated',
      ])),
    }))
    .mutation(async ({ ctx, input }) => {
      const webhook = await ctx.prisma.webhookConfig.create({
        data: {
          organizationId: ctx.organizationId,
          url: input.url,
          secret: input.secret,
          events: input.events,
        },
      });
      
      return webhook;
    }),

  // Update webhook
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      url: z.string().url().optional(),
      secret: z.string().optional(),
      events: z.array(z.enum([
        'call_started',
        'call_ended',
        'call_transcribed',
        'call_transferred',
        'agent_created',
        'agent_updated',
      ])).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, organizationId } = ctx;
      
      // Verify webhook belongs to organization
      const existing = await prisma.webhookConfig.findFirst({
        where: { id: input.id, organizationId },
      });
      
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }
      
      const webhook = await prisma.webhookConfig.update({
        where: { id: input.id },
        data: {
          url: input.url,
          secret: input.secret,
          events: input.events,
          isActive: input.isActive,
        },
      });
      
      return webhook;
    }),

  // Delete webhook
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, organizationId } = ctx;
      
      // Verify webhook belongs to organization
      const existing = await prisma.webhookConfig.findFirst({
        where: { id: input.id, organizationId },
      });
      
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }
      
      await prisma.webhookConfig.delete({
        where: { id: input.id },
      });
      
      return { success: true };
    }),

  // Test webhook
  test: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, organizationId } = ctx;
      
      const webhook = await prisma.webhookConfig.findFirst({
        where: { id: input.id, organizationId },
      });
      
      if (!webhook) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Webhook not found' });
      }
      
      // Send test payload
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        organizationId,
        data: { message: 'This is a test webhook event' },
      };
      
      try {
        // TODO: Implement actual webhook delivery with signature
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Test': 'true',
          },
          body: JSON.stringify(testPayload),
        });
        
        return {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
});
