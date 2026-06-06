import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";

import { Orchestrator } from "./core/orchestrator";
import { CallController } from "./calls/call-controller";
import { AgentService } from "./agents/agent-service";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3000;

const uploadDir = path.resolve("./audio/uploads");
const outputDir = path.resolve("./audio/output");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

app.use("/audio/output", express.static(outputDir));

const upload = multer({
  dest: uploadDir,
});

const orchestrator = new Orchestrator();
const callController = new CallController();
const agentService = new AgentService();

function buildAudioUrl(audioOutputPath?: string) {
  if (!audioOutputPath) return null;

  const fileName = path.basename(audioOutputPath);

  return `/audio/output/${fileName}`;
}

app.get("/", (_, res) => {
  res.json({
    service: "Anturon Orchestrator",
    status: "running",
    version: "1.0.0",
    endpoints: [
      "GET /health",
      "POST /orchestrate",
      "POST /orchestrate/upload",
      "GET /conversations",
      "POST /calls/incoming",
      "POST /calls/incoming/upload",
      "GET /calls",
    ],
  });
});

app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    service: "anturon-orchestrator",
  });
});

app.post("/orchestrate", async (req, res) => {
  try {
    const { audioPath } = req.body;

    if (!audioPath) {
      return res.status(400).json({
        success: false,
        error: "audioPath is required",
      });
    }

    const result = await orchestrator.execute({
      audio: audioPath,
    });

    return res.json({
      success: true,
      transcript: result.transcript,
      response: result.llmResponse,
      audioOutputPath: result.audioOutputPath,
      audioOutputUrl: buildAudioUrl(result.audioOutputPath),
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/orchestrate/upload", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "audio file is required",
      });
    }

    const result = await orchestrator.execute({
      audio: req.file.path,
    });

    return res.json({
      success: true,
      originalFileName: req.file.originalname,
      uploadedPath: req.file.path,
      transcript: result.transcript,
      response: result.llmResponse,
      audioOutputPath: result.audioOutputPath,
      audioOutputUrl: buildAudioUrl(result.audioOutputPath),
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/calls/incoming", async (req, res) => {
  try {
    const { callId, callerNumber, audioPath, agentId } = req.body;

    if (!callId || !audioPath) {
      return res.status(400).json({
        success: false,
        error: "callId and audioPath are required",
      });
    }

    const session = await callController.handleIncomingCall({
      callId,
      callerNumber,
      audioPath,
      agentId,
    });

    return res.json({
      success: true,
      session: {
        ...session,
        outputAudioUrl: buildAudioUrl(session.outputAudio),
      },
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/calls/incoming/upload", upload.single("audio"), async (req, res) => {
  try {
    const { callId, callerNumber, agentId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "audio file is required",
      });
    }

    if (!callId) {
      return res.status(400).json({
        success: false,
        error: "callId is required",
      });
    }

    const session = await callController.handleIncomingCall({
      callId,
      callerNumber,
      agentId,
      audioPath: req.file.path,
    });

    return res.json({
      success: true,
      originalFileName: req.file.originalname,
      uploadedPath: req.file.path,
      session: {
        ...session,
        outputAudioUrl: buildAudioUrl(session.outputAudio),
      },
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/calls", (_, res) => {
  res.json({
    success: true,
    calls: callController.listSessions().map((session) => ({
      ...session,
      outputAudioUrl: buildAudioUrl(session.outputAudio),
    })),
  });
});

app.get("/conversations", (_, res) => {
  const filePath = path.resolve("./storage/conversations.json");

  if (!fs.existsSync(filePath)) {
    return res.json({
      success: true,
      conversations: [],
    });
  }

  const raw = fs.readFileSync(filePath, "utf-8");

  return res.json({
    success: true,
    conversations: raw ? JSON.parse(raw) : [],
  });
});
app.post("/agents", (req, res) => {
  const { name, systemPrompt, language } = req.body;

  if (!name || !systemPrompt) {
    return res.status(400).json({
      success: false,
      error: "name and systemPrompt are required",
    });
  }

  const agent = agentService.create({
    name,
    systemPrompt,
    language,
  });

  return res.json({
    success: true,
    agent,
  });
});

app.get("/agents", (_, res) => {
  return res.json({
    success: true,
    agents: agentService.list(),
  });
});
app.listen(PORT, () => {
  console.log(`🚀 Orchestrator running on http://localhost:${PORT}`);
});