import { z } from 'zod';
import { router, organizationProcedure } from '../trpc/trpc.js';
import { prisma } from '../lib/prisma.js';

export const notificationsRouter = router({
  // List unread + recent notifications for this org (last 50, not dismissed)
  list: organizationProcedure
    .query(async ({ ctx }) => {
      const notifs = await prisma.notification.findMany({
        where: { organizationId: ctx.organizationId, dismissed: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return notifs;
    }),

  // Mark a single notification as read
  markRead: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.notification.updateMany({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { read: true },
      });
      return { success: true };
    }),

  // Mark all as read
  markAllRead: organizationProcedure
    .mutation(async ({ ctx }) => {
      await prisma.notification.updateMany({
        where: { organizationId: ctx.organizationId, read: false },
        data: { read: true },
      });
      return { success: true };
    }),

  // Dismiss (hide) a notification
  dismiss: organizationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.notification.updateMany({
        where: { id: input.id, organizationId: ctx.organizationId },
        data: { dismissed: true },
      });
      return { success: true };
    }),
});
