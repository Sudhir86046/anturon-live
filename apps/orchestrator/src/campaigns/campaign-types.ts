export type CampaignStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export interface CampaignLead {
  name?: string;
  phone: string;

  status:
    | "pending"
    | "called"
    | "failed"
    | "retry_pending";

  callId?: string;
  error?: string;

  retryCount?: number;
  lastAttemptAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  agentId: string;
  csvPath: string;

  totalContacts: number;
  completedCalls: number;
  failedCalls: number;

  status: CampaignStatus;

  leads: CampaignLead[];

  createdAt: string;
  startedAt?: string;
  pausedAt?: string;
  completedAt?: string;

  maxRetries?: number;
}