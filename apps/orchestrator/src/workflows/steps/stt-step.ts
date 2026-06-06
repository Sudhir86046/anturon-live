import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { DeepgramSTTProvider } from "../../providers/stt/deepgram-provider";

export class STTStep implements WorkflowStep {
  async execute(context: WorkflowContext): Promise<WorkflowContext> {
    const provider = new DeepgramSTTProvider();

    context.transcript = await provider.transcribe(context.input.audio);

    console.log("STT:", context.transcript);

    return context;
  }
}