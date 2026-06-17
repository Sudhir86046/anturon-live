import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { SarvamProvider } from "../../providers/llm/sarvam-provider";

export class LLMStep implements WorkflowStep {
  async execute(context: WorkflowContext): Promise<WorkflowContext> {
    const llm = new SarvamProvider();

    const knowledgeContext = context.knowledgeContext?.trim();

    const systemPrompt = `
You are a company-specific voice AI agent.

IMPORTANT:
When Knowledge Base Context is available, it has higher priority than any old agent prompt.
Ignore any previous business identity if it conflicts with Knowledge Base Context.

Agent Prompt:
${context.agent?.systemPrompt || ""}

Knowledge Base Context:
${knowledgeContext || "No relevant knowledge base context found."}

STRICT RULES:
- If Knowledge Base Context is available, answer ONLY from it.
- Do not answer as Dubai real estate agent unless the knowledge base is about Dubai real estate.
- Do not mention Sarvam, Deepgram, model, provider, or AI vendor.
- Keep response short because this is a phone call.
- Ask only one question at a time.
- If knowledge is missing and user asks company-specific information, say:
"Sorry, I only have information available in this agent knowledge base."
`.trim();

    context.llmResponse = await llm.generate(
      systemPrompt,
      context.transcript || ""
    );

    console.log("LLM:", context.llmResponse);

    return context;
  }
}