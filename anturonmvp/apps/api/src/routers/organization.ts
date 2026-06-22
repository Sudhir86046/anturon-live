import { z } from 'zod';
import { router, organizationProcedure, adminProcedure } from '../trpc/trpc.js';
import { TRPCError } from '@trpc/server';
import { provisionOrganization } from '../services/provision.js';

export const organizationRouter = router({
  // Get current organization
  get: organizationProcedure
    .query(async ({ ctx }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organizationId },
      });
      
      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }
      
      return org;
    }),

  // Provision this org — assigns default VAPI resources + wallet (idempotent)
  provision: adminProcedure
    .mutation(async ({ ctx }) => {
      await provisionOrganization(ctx.organizationId);
      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { defaultVapiAssistantId: true, defaultVapiPhoneNumberId: true, walletBalance: true },
      });
      return { success: true, ...org };
    }),

  // Update organization settings
  update: adminProcedure
    .input(z.object({
      name: z.string().min(2).optional(),
      settings: z.record(z.any()).optional(),
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
      billingEmail: z.string().email().optional(),
      billingPhone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.organization.update({
        where: { id: ctx.organizationId },
        data: input,
      });
      
      return org;
    }),

  // List organization users
  listUsers: organizationProcedure
    .query(async ({ ctx }) => {
      const users = await ctx.prisma.user.findMany({
        where: { organizationId: ctx.organizationId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phoneNumber: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      return users;
    }),

  // Invite new user
  inviteUser: adminProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(2),
      role: z.enum(['admin', 'agent', 'viewer']),
      phoneNumber: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, organizationId } = ctx;
      
      // Check if email already exists
      const existing = await prisma.user.findUnique({
        where: { email: input.email },
      });
      
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Email already registered' });
      }
      
      // Create user with random password (they'll reset it)
      const user = await prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          role: input.role,
          organizationId,
          phoneNumber: input.phoneNumber,
          passwordHash: '', // Will require password reset
          emailVerified: false,
        },
      });
      
      // TODO: Send invitation email
      
      return user;
    }),

  // Update user
  updateUser: adminProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum(['admin', 'agent', 'viewer']).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, organizationId } = ctx;
      
      // Verify user belongs to organization
      const existing = await prisma.user.findFirst({
        where: { id: input.userId, organizationId },
      });
      
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }
      
      const user = await prisma.user.update({
        where: { id: input.userId },
        data: {
          role: input.role,
          isActive: input.isActive,
        },
      });
      
      return user;
    }),

  // Delete user
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, organizationId } = ctx;
      
      // Prevent deleting self
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot delete yourself' });
      }
      
      // Verify user belongs to organization
      const existing = await prisma.user.findFirst({
        where: { id: input.userId, organizationId },
      });
      
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }
      
      await prisma.user.delete({
        where: { id: input.userId },
      });
      
      return { success: true };
    }),

  // Get usage stats
  usage: organizationProcedure
    .query(async ({ ctx }) => {
      const { prisma, organizationId } = ctx;
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [
        totalAgents,
        activeAgents,
        totalCalls,
        monthCalls,
        totalMinutes,
        monthMinutes,
      ] = await Promise.all([
        prisma.voiceAgent.count({ where: { organizationId } }),
        prisma.voiceAgent.count({ where: { organizationId, isActive: true } }),
        prisma.call.count({ where: { organizationId } }),
        prisma.call.count({ where: { organizationId, startedAt: { gte: startOfMonth } } }),
        prisma.call.aggregate({
          where: { organizationId, status: 'completed' },
          _sum: { duration: true },
        }),
        prisma.call.aggregate({
          where: { organizationId, status: 'completed', startedAt: { gte: startOfMonth } },
          _sum: { duration: true },
        }),
      ]);
      
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { plan: true },
      });
      
      return {
        plan: org?.plan || 'free',
        agents: { total: totalAgents, active: activeAgents },
        calls: { total: totalCalls, thisMonth: monthCalls },
        minutes: { 
          total: Math.round((totalMinutes._sum.duration || 0) / 60),
          thisMonth: Math.round((monthMinutes._sum.duration || 0) / 60),
        },
      };
    }),
});
