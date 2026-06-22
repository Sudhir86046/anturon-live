import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { type CreateExpressContextOptions } from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { prisma } from '@voice-ai/database';

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Context
export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  let user = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; organizationId: string };
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { organization: true },
      });
    } catch {
      // Invalid token
    }
  }

  return {
    req,
    res,
    user,
    prisma,
  };
};

type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
      },
    };
  },
});

// Export reusable router and procedure helpers
export const router = t.router;
export const middleware = t.middleware;

// Public procedure (no auth required)
export const publicProcedure = t.procedure;

// Protected procedure (requires authentication)
const enforceUserIsAuthed = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Organization-scoped procedure (ensures user can only access their org data)
const enforceOrganizationScope = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  
  const organizationId = ctx.user.organizationId;
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      organizationId,
    },
  });
});

export const organizationProcedure = t.procedure.use(enforceUserIsAuthed).use(enforceOrganizationScope);

// Admin-only procedure
const enforceAdmin = middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  
  if (ctx.user.role !== 'super_admin' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminProcedure = t.procedure.use(enforceUserIsAuthed).use(enforceAdmin);
