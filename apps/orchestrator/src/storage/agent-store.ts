import fs from "fs";
import path from "path";

export interface AgentRecord {
  id: string;
  name: string;
  systemPrompt: string;
  language: string;
  sttProvider: "deepgram";
  llmProvider: "sarvam";
  ttsProvider: "deepgram";
  createdAt: string;
}

export class AgentStore {
  private filePath = path.resolve("./storage/agents.json");

  list(): AgentRecord[] {
    if (!fs.existsSync(this.filePath)) return [];
    const raw = fs.readFileSync(this.filePath, "utf-8");
    return raw ? JSON.parse(raw) : [];
  }

  save(agent: AgentRecord) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const agents = this.list();
    agents.push(agent);

    fs.writeFileSync(this.filePath, JSON.stringify(agents, null, 2));
  }
}