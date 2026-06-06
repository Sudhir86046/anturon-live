export interface Agent {
  id: string;

  name: string;

  prompt: string;

  language: string;

  llmProvider: "sarvam";

  sttProvider: "deepgram";

  ttsProvider: "deepgram";
}