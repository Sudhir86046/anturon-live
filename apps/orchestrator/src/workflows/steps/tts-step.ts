import { WorkflowContext } from "../workflow-context";
import { WorkflowStep } from "../workflow-step";
import { DeepgramTTSProvider } from "../../providers/tts/deepgram-provider";

export class TTSStep implements WorkflowStep {
  async execute(context: WorkflowContext): Promise<WorkflowContext> {
    const provider = new DeepgramTTSProvider();

    const result = await provider.synthesize(context.llmResponse || "");

    context.audioOutput = result.audioBuffer;
    context.audioOutputPath = result.outputPath;

    console.log("TTS audio saved:", result.outputPath);

    return context;
  }
}