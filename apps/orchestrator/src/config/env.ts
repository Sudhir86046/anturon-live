import "dotenv/config";

export const env = {
  sarvamApiKey:
    process.env.SARVAM_API_KEY || "",

  deepgramApiKey:
    process.env.DEEPGRAM_API_KEY || ""
};