import { Orchestrator } from "../core/orchestrator";
import { CallSession } from "./call-session";
import { CallStore } from "../storage/call-store";

const orchestrator = new Orchestrator();
const callStore = new CallStore();

const sessions: CallSession[] = [];

export class CallController {
  async handleIncomingCall(payload: {
    callId: string;
    callerNumber?: string;
    audioPath: string;
    agentId?: string;
  }) {
    const session: CallSession = {
      callId: payload.callId,
      callerNumber: payload.callerNumber,
      agentId: payload.agentId,
      status: "processing",
      inputAudio: payload.audioPath,
      startedAt: new Date().toISOString(),
    };

    sessions.push(session);

    try {
      const result = await orchestrator.execute({
        audio: payload.audioPath,
      });

      session.status = "completed";
      session.transcript = result.transcript;
      session.responseText = result.llmResponse;
      session.outputAudio = result.audioOutputPath;
      session.endedAt = new Date().toISOString();

      callStore.save(session);

      return session;
    } catch (error: any) {
      session.status = "failed";
      session.endedAt = new Date().toISOString();

      callStore.save(session);

      throw error;
    }
  }

  listSessions() {
    return callStore.list();
  }
}