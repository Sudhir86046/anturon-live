import fs from "fs";
import path from "path";

export interface ConversationLog {
  inputAudio: string;
  transcript?: string;
  llmResponse?: string;
  outputAudio?: string;
  createdAt: string;
}

export class ConversationStore {
  private filePath = path.resolve("./storage/conversations.json");

  save(log: ConversationLog) {
    const dir = path.dirname(this.filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let existing: ConversationLog[] = [];

    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      existing = raw ? JSON.parse(raw) : [];
    }

    existing.push(log);

    fs.writeFileSync(
      this.filePath,
      JSON.stringify(existing, null, 2)
    );

    console.log("Conversation saved:", this.filePath);
  }
}