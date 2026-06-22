import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { router, publicProcedure } from '../trpc/trpc.js';
import { TRPCError } from '@trpc/server';
import { prisma } from '@voice-ai/database';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/email.js';
import { INDUSTRY_TEMPLATES, VOICE_IDS, LANGUAGES } from '@voice-ai/shared';
import { provisionOrganization } from '../services/provision.js';

const SALT_ROUNDS = 10;

export const onboardingRouter = router({
  // Self-service organization signup
  signup: publicProcedure
    .input(z.object({
      organizationName: z.string().min(2).max(100),
      industry: z.enum(['retail', 'real_estate', 'ecommerce', 'fintech', 'banking', 'other']),
      region: z.enum(['uae', 'saudi', 'india', 'other']),
      adminName: z.string().min(2).max(100),
      adminEmail: z.string().email(),
      adminPassword: z.string().min(8),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Check if email exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.adminEmail },
      });
      
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This email is already registered. Please sign in instead.',
        });
      }

      // Generate unique slug
      let slug = input.organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Check if slug exists, append random suffix if needed
      let slugExists = await prisma.organization.findUnique({ where: { slug } });
      if (slugExists) {
        slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
        slugExists = await prisma.organization.findUnique({ where: { slug } });
        if (slugExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Organization name already taken. Please try a different name.',
          });
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.adminPassword, SALT_ROUNDS);
      
      // Generate verification token
      const verifyToken = crypto.randomBytes(32).toString('hex');
      const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create organization and user in transaction
      const result = await prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: input.organizationName,
            slug,
            industry: input.industry,
            region: input.region,
            plan: 'free',
            settings: JSON.stringify({ onboardingCompleted: false }),
          },
        });

        const user = await tx.user.create({
          data: {
            email: input.adminEmail,
            name: input.adminName,
            role: 'admin',
            organizationId: organization.id,
            phoneNumber: input.phone,
            passwordHash,
            emailVerified: false,
            // Store verification token (in production, use separate table)
            // For now, we'll use a workaround - store in settings
          },
        });

        // Store verification token in a simple way
        await tx.organization.update({
          where: { id: organization.id },
          data: {
            settings: JSON.stringify({
              onboardingCompleted: false,
              verificationToken: verifyToken,
              verifyTokenExpiry: verifyTokenExpiry.toISOString(),
              pendingUserId: user.id,
            }),
          },
        });

        return { organization, user, verifyToken };
      });

      // Send verification email
      await sendVerificationEmail(
        input.adminEmail,
        input.adminName,
        result.verifyToken,
        result.organization.slug
      );

      return {
        success: true,
        message: 'Organization created successfully. Please check your email to verify your account.',
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
        requiresEmailVerification: true,
      };
    }),

  // Verify email
  verifyEmail: publicProcedure
    .input(z.object({
      token: z.string(),
      orgSlug: z.string(),
    }))
    .mutation(async ({ input }) => {
      const organization = await prisma.organization.findUnique({
        where: { slug: input.orgSlug },
      });

      if (!organization) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      const settings = JSON.parse(organization.settings || '{}');
      
      if (settings.verificationToken !== input.token) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired verification token' });
      }

      if (new Date(settings.verifyTokenExpiry) < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Verification token has expired' });
      }

      const userId = settings.pendingUserId;

      // Update user and organization
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { emailVerified: true },
        });

        await tx.organization.update({
          where: { id: organization.id },
          data: {
            settings: JSON.stringify({
              onboardingCompleted: false,
              emailVerified: true,
              verifiedAt: new Date().toISOString(),
            }),
          },
        });
      });

      // Get user for welcome email
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await sendWelcomeEmail(user.email, user.name, organization.slug);
      }

      // Provision the org with default agent, phone number, and $5 wallet
      await provisionOrganization(organization.id).catch(err =>
        console.error('[provision] Non-fatal provisioning error:', err)
      );

      return {
        success: true,
        message: 'Email verified successfully!',
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
      };
    }),

  // Check if email is verified
  checkVerification: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        include: { organization: true },
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      return {
        emailVerified: user.emailVerified,
        organization: {
          slug: user.organization.slug,
          name: user.organization.name,
        },
      };
    }),

  // Complete onboarding - create first agent
  completeOnboarding: publicProcedure
    .input(z.object({
      orgSlug: z.string(),
      agentType: z.enum(['customer_support', 'lead_qualification', 'sales', 'appointment_booking']),
      language: z.enum(['en', 'ar', 'hi']),
      useTemplate: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const organization = await prisma.organization.findUnique({
        where: { slug: input.orgSlug },
      });

      if (!organization) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      // Get template for industry
      const templates = INDUSTRY_TEMPLATES[organization.industry as keyof typeof INDUSTRY_TEMPLATES];
      const template = templates?.[input.agentType as keyof typeof templates];

      // Select voice ID
      const langVoices = VOICE_IDS[input.language as keyof typeof VOICE_IDS];
      const voiceId = langVoices?.professional_female || VOICE_IDS.en.professional_female;

      // Build welcome message
      let welcomeMessage: Record<string, string> = { [input.language]: 'Hello, how can I help you?' };
      let systemPrompt = 'You are a helpful AI assistant.';

      if (input.useTemplate && template) {
        const region = organization.region === 'uae' ? 'Dubai' : organization.region === 'india' ? 'India' : '';
        const langName = LANGUAGES.find(l => l.code === input.language)?.name || 'English';
        
        systemPrompt = template.systemPrompt
          .replace(/\{\{region\}\}/g, region)
          .replace(/\{\{language\}\}/g, langName)
          .replace(/\{\{company\}\}/g, organization.name);
        
        welcomeMessage = template.welcomeMessage;
      }

      // Create the first agent
      const agent = await prisma.voiceAgent.create({
        data: {
          name: `${organization.name} ${input.agentType.replace('_', ' ')}`,
          organizationId: organization.id,
          type: input.agentType,
          language: input.language,
          voiceId,
          systemPrompt,
          welcomeMessage: JSON.stringify(welcomeMessage),
          knowledgeBase: '[]',
          isActive: true,
        },
      });

      // Mark onboarding as completed
      const currentSettings = JSON.parse(organization.settings || '{}');
      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          settings: JSON.stringify({
            ...currentSettings,
            onboardingCompleted: true,
            onboardingCompletedAt: new Date().toISOString(),
            firstAgentId: agent.id,
          }),
        },
      });

      return {
        success: true,
        agent: {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          language: agent.language,
          isActive: agent.isActive,
        },
        message: 'Your first AI voice agent has been created! You can now test it or create more agents.',
      };
    }),

  // Resend verification email
  resendVerification: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { email: input.email },
        include: { organization: true },
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      if (user.emailVerified) {
        return { success: true, message: 'Email is already verified' };
      }

      // Generate new token
      const verifyToken = crypto.randomBytes(32).toString('hex');
      const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const settings = JSON.parse(user.organization.settings || '{}');
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          settings: JSON.stringify({
            ...settings,
            verificationToken: verifyToken,
            verifyTokenExpiry: verifyTokenExpiry.toISOString(),
            pendingUserId: user.id,
          }),
        },
      });

      await sendVerificationEmail(
        input.email,
        user.name,
        verifyToken,
        user.organization.slug
      );

      return {
        success: true,
        message: 'Verification email sent. Please check your inbox.',
      };
    }),
});
