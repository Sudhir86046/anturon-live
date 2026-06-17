import axios from "axios";
import { env } from "../../config/env";

export class SarvamProvider {
  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    const finalSystemPrompt = `
${systemPrompt}

IMPORTANT OUTPUT RULES:
- Answer only from the provided knowledge/context.
- Do not invent anything.
- Do not show reasoning.
- Return final answer only.
- Keep answer short and clear.
- Start final answer directly, without bullets unless needed.
`.trim();

    const response = await axios.post(
      "https://api.sarvam.ai/v1/chat/completions",
      {
        messages: [
          {
            role: "system",
            content: finalSystemPrompt,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        model: "sarvam-30b",
        temperature: 0,
        top_p: 1,
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${env.sarvamApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const choice = response.data?.choices?.[0];
    const message = choice?.message;

    console.log("SARVAM FINISH:", choice?.finish_reason);

    if (message?.content && typeof message.content === "string") {
      return message.content.trim();
    }

    console.log("SARVAM RAW:", JSON.stringify(response.data, null, 2));

    return "Sorry, I could not generate a proper answer from the knowledge base.";
  }
}