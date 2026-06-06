import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { SarvamProvider } from "../../providers/llm/sarvam-provider";

export class LLMStep implements WorkflowStep {
  async execute(context: WorkflowContext): Promise<WorkflowContext> {
    const llm = new SarvamProvider();

    context.llmResponse = await llm.generate(
      context.agent?.systemPrompt || "",
      context.transcript || ""
    );

    console.log("LLM:", context.llmResponse);

    return context;
  }
}