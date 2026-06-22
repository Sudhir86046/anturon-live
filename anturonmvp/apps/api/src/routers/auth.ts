import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc/trpc.js';
import { INDUSTRY_TEMPLATES, VOICE_IDS } from '@voice-ai/shared';
import { sendPasswordResetEmail, sendVerificationEmail } from '../lib/email.js';
import { provisionOrganization } from '../services/provision.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

export const authRouter = router({
  // Register new organization with admin user
  register: publicProcedure
    .input(z.object({
      organizationName: z.string().min(2),
      industry: z.enum(['retail', 'real_estate', 'ecommerce', 'fintech', 'banking', 'other']),
      region: z.enum(['uae', 'saudi', 'india', 'other']),
      adminName: z.string().min(2),
      adminEmail: z.string().email(),
      adminPassword: z.string().min(8),
      phone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;
      
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.adminEmail },
      });
      
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already registered',
        });
      }
      
      // Generate slug from organization name
      const slug = input.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Check if slug exists
      const existingOrg = await prisma.organization.findUnique({
        where: { slug },
      });
      
      if (existingOrg) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Organization name already taken',
        });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(input.adminPassword, SALT_ROUNDS);
      
      // Create organization and user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: input.organizationName,
            slug,
            industry: input.industry,
            region: input.region,
            plan: 'free',
          },
        });
        
        // Create admin user
        const user = await tx.user.create({
          data: {
            email: input.adminEmail,
            name: input.adminName,
            role: 'admin',
            organizationId: organization.id,
            phoneNumber: input.phone,
            passwordHash,
          },
        });
        
        return { organization, user };
      });
      
      // Generate JWT
      const token = jwt.sign(
        { 
          userId: result.user.id, 
          organizationId: result.organization.id,
          role: result.user.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Send verification email
      const verifyToken = jwt.sign(
        { userId: result.user.id, purpose: 'email-verify' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      try {
        const emailResult = await sendVerificationEmail(result.user.email, result.user.name, verifyToken);
        console.log('Verification email result:', JSON.stringify(emailResult));
      } catch (e) {
        console.error('Failed to send verification email:', e);
      }
      
      return {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
          industry: result.organization.industry,
          region: result.organization.region,
        },
      };
    }),

  // Login
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        include: { organization: true },
      });
      
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }
      
      // Verify password
      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }
      
      // Check if user is active
      if (!user.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Account is deactivated',
        });
      }

      // Block unverified emails (Google users are always verified)
      if (!user.emailVerified) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Please verify your email address before signing in. Check your inbox for the verification link.',
        });
      }
      
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      
      // Generate JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          organizationId: user.organizationId,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
          industry: user.organization.industry,
          region: user.organization.region,
        },
      };
    }),

  // Forgot password — generate a reset token (JWT)
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;
      const user = await prisma.user.findUnique({ where: { email: input.email } });

      if (!user) {
        // Don't reveal whether email exists
        return { success: true };
      }

      const resetToken = jwt.sign(
        { userId: user.id, purpose: 'password-reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      try {
        const emailResult = await sendPasswordResetEmail(user.email, user.name, resetToken);
        console.log('Password reset email result:', JSON.stringify(emailResult));
      } catch (e) {
        console.error('Failed to send password reset email:', e);
      }

      return { success: true };
    }),

  // Reset password using token
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;

      let payload: any;
      try {
        payload = jwt.verify(input.token, JWT_SECRET);
      } catch {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired reset link' });
      }

      if (payload.purpose !== 'password-reset') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid reset token' });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
      await prisma.user.update({
        where: { id: payload.userId },
        data: { passwordHash },
      });

      return { success: true };
    }),

  // Verify email from token link
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;

      let payload: any;
      try {
        payload = jwt.verify(input.token, JWT_SECRET);
      } catch {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired verification link' });
      }

      if (payload.purpose !== 'email-verify') {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid verification token' });
      }

      await prisma.user.update({
        where: { id: payload.userId },
        data: { emailVerified: true },
      });

      return { success: true };
    }),

  // Google OAuth login — find existing user or signal new user needs onboarding
  googleLogin: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string(),
      googleId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;

      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
        include: { organization: true },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { lastLoginAt: new Date() },
        });

        const token = jwt.sign(
          { userId: existingUser.id, organizationId: existingUser.organizationId, role: existingUser.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return {
          isNewUser: false,
          token,
          user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, role: existingUser.role },
          organization: {
            id: existingUser.organization.id,
            name: existingUser.organization.name,
            slug: existingUser.organization.slug,
            industry: existingUser.organization.industry,
            region: existingUser.organization.region,
          },
        };
      }

      // New user — frontend must collect org details first
      return { isNewUser: true, token: null, user: null, organization: null };
    }),

  // Complete Google signup after org details collected
  googleRegister: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string(),
      googleId: z.string(),
      organizationName: z.string().min(2),
      industry: z.enum(['retail', 'real_estate', 'ecommerce', 'fintech', 'banking', 'other']),
      region: z.enum(['uae', 'saudi', 'india', 'other']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;

      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Email already registered' });

      const slug = input.organizationName
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const existingOrg = await prisma.organization.findUnique({ where: { slug } });
      if (existingOrg) throw new TRPCError({ code: 'CONFLICT', message: 'Organization name already taken' });

      const result = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: { name: input.organizationName, slug, industry: input.industry, region: input.region, plan: 'free' },
        });
        const user = await tx.user.create({
          data: { email: input.email, name: input.name, role: 'admin', organizationId: organization.id, emailVerified: true },
        });
        return { organization, user };
      });

      const token = jwt.sign(
        { userId: result.user.id, organizationId: result.organization.id, role: result.user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Provision org with default VAPI resources + $5 wallet
      provisionOrganization(result.organization.id).catch(err =>
        console.error('[provision] Google register provision error:', err)
      );

      return {
        token,
        user: { id: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role },
        organization: {
          id: result.organization.id, name: result.organization.name, slug: result.organization.slug,
          industry: result.organization.industry, region: result.organization.region,
        },
      };
    }),

  // Change password (authenticated user)
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ ctx, input }) => {
      const { prisma, user } = ctx;

      const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!fullUser?.passwordHash) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No password set on this account' });
      }

      const isValid = await bcrypt.compare(input.currentPassword, fullUser.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

      return { success: true };
    }),

  // Save notification preferences
  updateNotifications: protectedProcedure
    .input(z.object({
      callCompleted:  z.boolean(),
      failedCalls:    z.boolean(),
      weeklyReport:   z.boolean(),
      productUpdates: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: { notificationPrefs: JSON.stringify(input) },
      });
      return { success: true };
    }),

  // Get notification preferences
  getNotifications: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id }, select: { notificationPrefs: true } });
      if (user?.notificationPrefs) {
        return JSON.parse(user.notificationPrefs);
      }
      return { callCompleted: true, failedCalls: true, weeklyReport: false, productUpdates: true };
    }),

  // Get current user
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx;
      
      const fullUser = await ctx.prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true },
      });
      
      if (!fullUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      
      return {
        user: {
          id: fullUser.id,
          email: fullUser.email,
          name: fullUser.name,
          role: fullUser.role,
          phoneNumber: fullUser.phoneNumber,
          isActive: fullUser.isActive,
          lastLoginAt: fullUser.lastLoginAt,
        },
        organization: {
          id: fullUser.organization.id,
          name: fullUser.organization.name,
          slug: fullUser.organization.slug,
          industry: fullUser.organization.industry,
          region: fullUser.organization.region,
          plan: fullUser.organization.plan,
        },
      };
    }),
});
