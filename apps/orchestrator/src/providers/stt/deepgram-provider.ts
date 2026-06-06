import fs from "fs";
import path from "path";
import axios from "axios";
import { env } from "../../config/env";

export class DeepgramSTTProvider {
  async transcribe(filePath: string): Promise<string> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Audio file not found: ${absolutePath}`);
    }

    const stats = fs.statSync(absolutePath);

    if (stats.size === 0) {
      throw new Error(`Audio file is empty: ${absolutePath}`);
    }

    const audioBuffer = fs.readFileSync(absolutePath);

    console.log("Audio file:", absolutePath);
    console.log("Audio size:", audioBuffer.length, "bytes");

    const response = await axios.post(
      "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true",
      audioBuffer,
      {
        headers: {
          Authorization: `Token ${env.deepgramApiKey}`,
          "Content-Type": "audio/wav",
          "Content-Length": audioBuffer.length
        }
      }
    );

    return (
      response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ""
    );
  }
}