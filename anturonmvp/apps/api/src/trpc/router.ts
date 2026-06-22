import { router } from './trpc.js';
import { authRouter } from '../routers/auth.js';
import { onboardingRouter } from '../routers/onboarding.js';
import { agentsRouter } from '../routers/agents.js';
import { callsRouter } from '../routers/calls.js';
import { analyticsRouter } from '../routers/analytics.js';
import { organizationRouter } from '../routers/organization.js';
import { webhooksRouter } from '../routers/webhooks.js';
import { phoneNumbersRouter } from '../routers/phone-numbers.js';
import { notificationsRouter } from '../routers/notifications.js';

export const appRouter = router({
  auth: authRouter,
  onboarding: onboardingRouter,
  agents: agentsRouter,
  calls: callsRouter,
  analytics: analyticsRouter,
  organization: organizationRouter,
  webhooks: webhooksRouter,
  phoneNumbers: phoneNumbersRouter,
  notifications: notificationsRouter,
});

// Export type definition for the API
export type AppRouter = typeof appRouter;
