import { Orchestrator } from "./core/orchestrator";
import { ConversationStore } from "./storage/conversation-store";

async function bootstrap() {
  const orchestrator = new Orchestrator();
  const store = new ConversationStore();

  const result = await orchestrator.execute({
    audio: "./audio/sample.wav",
  });

  store.save({
    inputAudio: result.input.audio,
    transcript: result.transcript,
    llmResponse: result.llmResponse,
    outputAudio: result.audioOutputPath,
    createdAt: new Date().toISOString(),
  });

  console.log({
    transcript: result.transcript,
    llmResponse: result.llmResponse,
    audioOutputPath: result.audioOutputPath,
  });
}

bootstrap();