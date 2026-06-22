import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@voice-ai/api';

export const trpc = createTRPCReact<AppRouter>();
