import axios from "axios";
import { env } from "../../config/env";

export class SarvamProvider {
  async generate(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const finalSystemPrompt = `
${systemPrompt}

RAG ANSWER MODE:
- Use Agent/System Prompt and Uploaded Knowledge Context as the source.
- The context may be fragmented because it comes from PDF chunks.
- Combine related chunks and create a proper helpful answer.
- You may explain, summarize, expand, and simplify the topic when the topic is clearly present in the context.
- Do NOT answer unrelated questions outside the agent prompt or uploaded knowledge.
- If there is no related topic in prompt/context, say:
"Sorry, I don't have that information in my current knowledge base."
- Do not say "not present" when the topic or related terms are present in context.
- Keep voice-call answers short: 2 to 4 sentences.
- Reply in the same language as the user.
- Return only the final answer.
`.trim();

      const response = await axios.post(
        "https://api.sarvam.ai/v1/chat/completions",
        {
          model: "sarvam-30b",
          messages: [
            { role: "system", content: finalSystemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.35,
          top_p: 1,
          max_tokens: 450,
        },
        {
          headers: {
            Authorization: `Bearer ${env.sarvamApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("SARVAM RAW:", JSON.stringify(response.data, null, 2));

      const content = response.data?.choices?.[0]?.message?.content;

      if (typeof content === "string" && content.trim()) {
        return content.trim();
      }

      return "Sorry, I don't have that information in my current knowledge base.";
    } catch (error: any) {
      console.error("SARVAM ERROR:", error.response?.data || error.message);
      return "Sorry, I don't have that information in my current knowledge base.";
    }
  }
}