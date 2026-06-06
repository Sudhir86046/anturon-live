import { WorkflowRunner } from "../workflows/workflow-runner";
import { STTStep } from "../workflows/steps/stt-step";
import { LLMStep } from "../workflows/steps/llm-step";
import { TTSStep } from "../workflows/steps/tts-step";
import { defaultAgent } from "../agents/agent-config";

export class Orchestrator {
  async execute(input: any) {
    const runner = new WorkflowRunner();

    const result = await runner.run(
      [
        new STTStep(),
        new LLMStep(),
        new TTSStep()
      ],
      {
        input,
        agent: defaultAgent
      }
    );

    return result;
  }
}