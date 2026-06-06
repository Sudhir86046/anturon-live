import axios from "axios";
import { env } from "../../config/env";

export class SarvamProvider {
  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await axios.post(
      "https://api.sarvam.ai/v1/chat/completions",
      {
        messages: [
          {
            role: "system",
            content:
              systemPrompt +
              "\n\nIMPORTANT: Return only the final spoken answer. Do not include reasoning.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        model: "sarvam-30b",
        temperature: 0.3,
        top_p: 1,
        max_tokens: 800,
      },
      {
        headers: {
          Authorization: `Bearer ${env.sarvamApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const message = response.data?.choices?.[0]?.message;

    console.log("SARVAM FINISH:", response.data?.choices?.[0]?.finish_reason);

    if (message?.content) {
      return message.content;
    }

    return "Hello, how can I help you today?";
  }
}