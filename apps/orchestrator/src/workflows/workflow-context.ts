import { defaultAgent } from "../agents/agent-config";

export interface WorkflowContext {
  input: {
    audio: string;
  };

  agent?: typeof defaultAgent;

  transcript?: string;

  llmResponse?: string;

  audioOutput?: Buffer;

  audioOutputPath?: string;
}