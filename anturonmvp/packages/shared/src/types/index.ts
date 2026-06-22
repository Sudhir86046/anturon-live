import { z } from 'zod';

// Organization / Multi-tenancy
export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  industry: z.enum(['retail', 'real_estate', 'ecommerce', 'fintech', 'banking', 'other']),
  region: z.enum(['uae', 'saudi', 'india', 'other']),
  plan: z.enum(['free', 'starter', 'growth', 'enterprise']),
  settings: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// User
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['super_admin', 'admin', 'agent', 'viewer']),
  organizationId: z.string(),
  phoneNumber: z.string().optional(),
  isActive: z.boolean(),
  lastLoginAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Voice Agent / Assistant
export const VoiceAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  organizationId: z.string(),
  type: z.enum(['customer_support', 'lead_qualification', 'sales', 'appointment_booking', 'survey']),
  language: z.enum(['en', 'ar', 'hi', 'ur', 'ta', 'te', 'bn']),
  voiceId: z.string(), // ElevenLabs voice ID
  personality: z.string(), // System prompt/personality
  knowledgeBase: z.array(z.string()), // URLs or document IDs
  webhookUrl: z.string().optional(),
  isActive: z.boolean(),
  callSettings: z.object({
    maxDuration: z.number(),
    recordingEnabled: z.boolean(),
    transcriptionEnabled: z.boolean(),
    handoffEnabled: z.boolean(),
    handoffPhone: z.string().optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type VoiceAgent = z.infer<typeof VoiceAgentSchema>;

// Call/Conversation
export const CallStatusSchema = z.enum([
  'queued',
  'ringing',
  'in_progress',
  'completed',
  'failed',
  'busy',
  'no_answer',
  'voicemail',
  'transferred',
]);

export const CallSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  agentId: z.string(),
  customerPhone: z.string(),
  customerName: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']),
  status: CallStatusSchema,
  startedAt: z.date(),
  endedAt: z.date().optional(),
  duration: z.number().optional(), // seconds
  recordingUrl: z.string().optional(),
  transcription: z.array(z.object({
    speaker: z.enum(['agent', 'customer']),
    text: z.string(),
    timestamp: z.number(),
    confidence: z.number(),
  })).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  outcome: z.enum([
    'resolved',
    'escalated',
    'callback_scheduled',
    'appointment_booked',
    'sale_made',
    'lead_qualified',
    'unqualified',
    'no_answer',
    'voicemail_left',
  ]).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()),
  metadata: z.record(z.any()).optional(),
  cost: z.number().optional(), // in USD
});

export type Call = z.infer<typeof CallSchema>;
export type CallStatus = z.infer<typeof CallStatusSchema>;

// Analytics
export const AnalyticsSchema = z.object({
  organizationId: z.string(),
  period: z.enum(['day', 'week', 'month']),
  date: z.string(),
  totalCalls: z.number(),
  completedCalls: z.number(),
  failedCalls: z.number(),
  avgDuration: z.number(),
  avgResponseTime: z.number(),
  sentimentBreakdown: z.object({
    positive: z.number(),
    neutral: z.number(),
    negative: z.number(),
  }),
  outcomeBreakdown: z.record(z.number()),
  topTags: z.array(z.object({ tag: z.string(), count: z.number() })),
  cost: z.number(),
});

export type Analytics = z.infer<typeof AnalyticsSchema>;

// Industry Templates
export const IndustryTemplateSchema = z.object({
  id: z.string(),
  industry: z.enum(['retail', 'real_estate', 'ecommerce', 'fintech', 'banking']),
  useCase: z.enum(['customer_support', 'lead_qualification', 'sales', 'appointment_booking']),
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  welcomeMessage: z.record(z.string()), // language -> message
  suggestedQuestions: z.array(z.string()),
  handoffTriggers: z.array(z.string()),
  requiredIntegrations: z.array(z.string()),
});

export type IndustryTemplate = z.infer<typeof IndustryTemplateSchema>;

// Webhook Events
export const WebhookEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  event: z.enum([
    'call.started',
    'call.ended',
    'call.transcribed',
    'call.transferred',
    'agent.created',
    'agent.updated',
  ]),
  payload: z.record(z.any()),
  createdAt: z.date(),
  deliveredAt: z.date().optional(),
  retryCount: z.number(),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

// WebSocket Events
export interface WebSocketMessage {
  type: 'call_update' | 'transcript' | 'agent_speaking' | 'user_speaking' | 'error';
  callId: string;
  payload: Record<string, any>;
  timestamp: number;
}
