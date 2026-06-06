import fs from "fs";
import path from "path";
import { CallSession } from "../calls/call-session";

export class CallStore {
  private filePath = path.resolve("./storage/calls.json");

  save(session: CallSession) {
    const dir = path.dirname(this.filePath);

    fs.mkdirSync(dir, { recursive: true });

    let existing: CallSession[] = [];

    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      existing = raw ? JSON.parse(raw) : [];
    }

    existing.push(session);

    fs.writeFileSync(this.filePath, JSON.stringify(existing, null, 2));

    console.log("Call saved:", this.filePath);
  }

  list(): CallSession[] {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    const raw = fs.readFileSync(this.filePath, "utf-8");

    return raw ? JSON.parse(raw) : [];
  }
}