import { AgentStore, AgentRecord } from "../storage/agent-store";

const store = new AgentStore();

export class AgentService {
  create(data: {
    name: string;
    systemPrompt: string;
    language?: string;
  }): AgentRecord {
    const agent: AgentRecord = {
      id: `agent_${Date.now()}`,
      name: data.name,
      systemPrompt: data.systemPrompt,
      language: data.language || "en",
      sttProvider: "deepgram",
      llmProvider: "sarvam",
      ttsProvider: "deepgram",
      createdAt: new Date().toISOString(),
    };

    store.save(agent);

    return agent;
  }

  list() {
    return store.list();
  }
}