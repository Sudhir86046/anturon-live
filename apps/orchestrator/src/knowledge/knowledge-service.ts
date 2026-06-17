import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { KnowledgeStore } from "./knowledge-store";
import { prisma } from "../db/prisma";

const store = new KnowledgeStore();

function chunkText(text: string, size = 700): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];

  for (let i = 0; i < clean.length; i += size) {
    chunks.push(clean.slice(i, i + size));
  }

  return chunks.filter(Boolean);
}

export class KnowledgeService {
  async uploadKnowledge(params: {
    agentId: string;
    filePath: string;
    originalName: string;
  }) {
    const ext = path.extname(params.originalName).toLowerCase();

    let text = "";

    if (ext === ".pdf") {
      const buffer = fs.readFileSync(params.filePath);
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: params.filePath });
      text = result.value;
    } else if (ext === ".txt" || ext === ".md") {
      text = fs.readFileSync(params.filePath, "utf-8");
    } else {
      throw new Error("Only PDF, DOCX, TXT, and MD files are supported.");
    }

    if (!text.trim()) {
      throw new Error("No text could be extracted from this file.");
    }

    const knowledgeDir = path.resolve("./knowledge", params.agentId);
    fs.mkdirSync(knowledgeDir, { recursive: true });

    const safeFileName = params.originalName.replace(/[^a-zA-Z0-9.-]/g, "_");

    const textPath = path.join(
      knowledgeDir,
      `${Date.now()}-${safeFileName}.txt`
    );

    fs.writeFileSync(textPath, text);

    const record = await store.save({
      id: `kb_${Date.now()}`,
      agentId: params.agentId,
      fileName: params.originalName,
      filePath: params.filePath,
      textPath,
      createdAt: new Date(),
    });

    const chunks = chunkText(text);

    await prisma.knowledgeChunk.createMany({
      data: chunks.map((content, index) => ({
        id: `chunk_${Date.now()}_${index}`,
        knowledgeId: record.id,
        agentId: params.agentId,
        content,
        chunkIndex: index,
      })),
    });

    return {
      ...record,
      chunksCreated: chunks.length,
    };
  }

    async getAgentContext(agentId: string, query: string) {
    const stopWords = new Set([
      "what",
      "which",
      "when",
      "where",
      "does",
      "your",
      "you",
      "are",
      "the",
      "and",
      "for",
      "with",
      "from",
      "this",
      "that",
      "have",
      "provide",
      "provides",
      "service",
      "services",
    ]);

    const words = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 2 && !stopWords.has(word));

    const chunks = await prisma.knowledgeChunk.findMany({
      where: { agentId },
      take: 300,
      orderBy: { createdAt: "desc" },
    });

    if (!chunks.length) return "";

    const scored = chunks
      .map((chunk) => {
        const content = chunk.content.toLowerCase();

        let score = 0;

        for (const word of words) {
          if (content.includes(word)) score += 3;
        }

        if (content.includes(query.toLowerCase())) score += 10;

        // Prefer chunks that look like company/service/FAQ content.
        if (
          content.includes("provide") ||
          content.includes("service") ||
          content.includes("support") ||
          content.includes("business hours") ||
          content.includes("pricing") ||
          content.includes("appointment")
        ) {
          score += 2;
        }

        return {
          content: chunk.content,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored.filter((item) => item.score > 0).slice(0, 5);

    const selected = best.length ? best : scored.slice(0, 3);

    return selected
      .map((item) => item.content)
      .join("\n\n")
      .slice(0, 2500);
  }
  async list(agentId: string) {
    return await store.list(agentId);
  }
}