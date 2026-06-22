const VAPI_BASE_URL = process.env.VAPI_BASE_URL || 'https://api.vapi.ai';
const VAPI_API_KEY = process.env.VAPI_API_KEY!;

async function vapiRequest<T>(
  method: string,
  path: string,
  body?: any
): Promise<T> {
  const res = await fetch(`${VAPI_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`VAPI ${method} ${path} failed: ${err.message || res.status}`);
  }

  return res.json();
}

// ─── Assistants ────────────────────────────────────────────────────
export const vapi = {
  assistants: {
    list: () => vapiRequest<VapiAssistant[]>('GET', '/assistant'),
    get: (id: string) => vapiRequest<VapiAssistant>('GET', `/assistant/${id}`),
    create: (data: Partial<VapiAssistant>) =>
      vapiRequest<VapiAssistant>('POST', '/assistant', data),
    update: (id: string, data: Partial<VapiAssistant>) =>
      vapiRequest<VapiAssistant>('PATCH', `/assistant/${id}`, data),
    delete: (id: string) => vapiRequest<void>('DELETE', `/assistant/${id}`),
  },

  calls: {
    list: async (params?: VapiCallsParams): Promise<VapiCall[]> => {
      const p: Record<string, string> = {};
      if (params?.assistantId) p.assistantId = params.assistantId;
      if (params?.limit) p.limit = String(params.limit);
      if (params?.createdAtGt) p.createdAtGt = params.createdAtGt;
      if (params?.createdAtLt) p.createdAtLt = params.createdAtLt;
      const query = Object.keys(p).length ? '?' + new URLSearchParams(p).toString() : '';
      const raw = await vapiRequest<VapiCall[]>('GET', `/call${query}`);
      return raw.map(enrichCall);
    },
    get: async (id: string): Promise<VapiCall> => {
      const raw = await vapiRequest<VapiCall>('GET', `/call/${id}`);
      return enrichCall(raw);
    },
    create: (data: VapiCreateCallInput) =>
      vapiRequest<VapiCall>('POST', '/call', data),
  },

  phoneNumbers: {
    list: () => vapiRequest<VapiPhoneNumber[]>('GET', '/phone-number'),
    update: (id: string, data: Partial<VapiPhoneNumber>) =>
      vapiRequest<VapiPhoneNumber>('PATCH', `/phone-number/${id}`, data),
  },
};

// ─── Helpers ───────────────────────────────────────────────────────
function enrichCall(c: any): VapiCall {
  const computed = (c.startedAt && c.endedAt)
    ? Math.round((new Date(c.endedAt).getTime() - new Date(c.startedAt).getTime()) / 1000)
    : c.duration ?? null;
  return { ...c, duration: computed };
}

// ─── Types ─────────────────────────────────────────────────────────
export interface VapiAssistant {
  id: string;
  name: string;
  model?: { provider: string; model: string; messages?: any[] };
  voice?: { provider: string; voiceId: string };
  firstMessage?: string;
  firstMessageMode?: 'assistant-speaks-first' | 'assistant-waits-for-user' | 'assistant-speaks-first-with-model-generated-message';
  systemPrompt?: string;
  endCallMessage?: string;
  transcriber?: { provider: string; language?: string };
  recordingEnabled?: boolean;
  maxDurationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VapiCall {
  id: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  type: 'inboundPhoneCall' | 'outboundPhoneCall' | 'webCall';
  assistantId?: string;
  assistant?: VapiAssistant;
  customer?: { number?: string; name?: string; sipUri?: string };
  phoneNumberId?: string;
  startedAt?: string;
  endedAt?: string;
  endedReason?: string;
  duration?: number | null;
  cost?: number;
  costs?: any[];
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  analysis?: {
    summary?: string;
    structuredData?: Record<string, any>;
    successEvaluation?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VapiCallsParams {
  assistantId?: string;
  limit?: number;
  createdAtGt?: string;
  createdAtLt?: string;
}

export interface VapiCreateCallInput {
  assistantId: string;
  customer: { number: string; name?: string };
  phoneNumberId?: string;
}

export interface VapiPhoneNumber {
  id: string;
  number: string;
  provider: string;
  name?: string;
  assistantId?: string;
  fallbackDestination?: any;
  createdAt?: string;
  updatedAt?: string;
}
