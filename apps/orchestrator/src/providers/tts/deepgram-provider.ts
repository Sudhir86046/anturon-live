import fs from "fs";
import path from "path";
import axios from "axios";
import { env } from "../../config/env";

export class DeepgramTTSProvider {
  async synthesize(text: string): Promise<{
    audioBuffer: Buffer;
    outputPath: string;
  }> {
    if (!text || text.trim().length === 0) {
      throw new Error("TTS text is empty");
    }

    const response = await axios.post(
      "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en",
      { text },
      {
        headers: {
          Authorization: `Token ${env.deepgramApiKey}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    const audioBuffer = Buffer.from(response.data);

    const outputDir = path.resolve("./audio/output");
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `response-${Date.now()}.mp3`);

    fs.writeFileSync(outputPath, audioBuffer);

    return {
      audioBuffer,
      outputPath,
    };
  }
}