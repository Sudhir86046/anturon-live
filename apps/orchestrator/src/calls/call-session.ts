export type CallStatus =
  | "started"
  | "processing"
  | "completed"
  | "failed";

export interface CallSession {
  callId: string;
  callerNumber?: string;
  agentId?: string;
  status: CallStatus;
  inputAudio?: string;
  transcript?: string;
  responseText?: string;
  outputAudio?: string;
  startedAt: string;
  endedAt?: string;
}