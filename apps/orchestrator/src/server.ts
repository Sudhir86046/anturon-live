import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";

import { DashboardService } from "./dashboard/dashboard-service";
import { CampaignService } from "./campaigns/campaign-service";
import { KnowledgeService } from "./knowledge/knowledge-service";
import { TwilioWebhook } from "./webhooks/twilio-webhook";
import { Orchestrator } from "./core/orchestrator";
import { CallController } from "./calls/call-controller";
import { AgentService } from "./agents/agent-service";
import { validateEnv } from "./config/validate-env";
import morgan from "morgan";
import { prisma } from "./db/prisma";
import { DeepgramTTSProvider } from "./providers/tts/deepgram-provider";
import authRoutes from "./auth/auth.routes";
import { CallStore } from "./storage/call-store";

const app = express();

validateEnv();

app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use("/auth", authRoutes);

const PORT = Number(process.env.PORT || 3000);

const uploadDir = path.resolve("./audio/uploads");
const outputDir = path.resolve("./audio/output");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

app.use("/audio/uploads", (req, res, next) => {
  if (req.path.endsWith(".webm")) {
    res.setHeader("Content-Type", "audio/webm");
  }
  next();
});

app.use("/audio/output", express.static(outputDir));
app.use("/audio/uploads", express.static(uploadDir));

const upload = multer({
  dest: uploadDir,
});

const orchestrator = new Orchestrator();
const callController = new CallController();
const agentService = new AgentService();
const twilioWebhook = new TwilioWebhook();
const knowledgeService = new KnowledgeService();
const campaignService = new CampaignService();
const dashboardService = new DashboardService();
const callStore = new CallStore();
const webCallSessions = new Map<string, any>();

function buildAudioUrl(audioPath?: string | null) {
  if (!audioPath) return null;

  const file = path.basename(audioPath);

  if (audioPath.includes("uploads")) {
    return `/audio/uploads/${file}`;
  }

  return `/audio/output/${file}`;
}

// Voice AI ke liye answer short karo — HARD 20 word cap
function trimAnswer(text: string): string {
  // Sirf pehla sentence lo
  const firstSentence = text.split(/[.!?]/)[0]?.trim() || text.trim();
  // Max 20 words — voice call ke liye
  const words = firstSentence.split(/\s+/);
  if (words.length > 20) {
    return words.slice(0, 20).join(" ").replace(/[,;:]+$/, "") + ".";
  }
  return firstSentence.endsWith(".") || firstSentence.endsWith("!") || firstSentence.endsWith("?")
    ? firstSentence
    : firstSentence + ".";
}

app.get("/", (_, res) => {
  res.json({
    service: "Anturon Orchestrator",
    status: "running",
    version: "1.0.0",
  });
});

app.get("/health", async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const [agents, calls, campaigns, knowledgeDocs] = await Promise.all([
      prisma.agent.count(),
      prisma.call.count(),
      prisma.campaign.count(),
      prisma.knowledge.count(),
    ]);

    return res.json({
      status: "ok",
      service: "anturon-orchestrator",
      database: "connected",
      stats: {
        agents,
        calls,
        campaigns,
        knowledgeDocs,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      service: "anturon-orchestrator",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/agents", async (req, res) => {
  try {
    const { name, systemPrompt, language } = req.body;

    if (!name || !systemPrompt) {
      return res.status(400).json({
        success: false,
        error: "name and systemPrompt are required",
      });
    }

    const agent = await agentService.create({
      name,
      systemPrompt,
      language,
    });

    return res.json({
      success: true,
      agent,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/agents", async (_, res) => {
  try {
    const agents = await agentService.list();

    return res.json({
      success: true,
      agents,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/calls", async (_, res) => {
  try {
    const calls = await prisma.call.findMany({
      include: { agent: true },
      orderBy: { startedAt: "desc" },
    });

    return res.json({
      success: true,
      calls: calls.map((call) => ({
        id: call.id,
        callId: call.callId,
        anturonCallId: call.callId,
        callerNumber: call.callerNumber,
        customer: {
          name: call.callerNumber || "Web Test",
          number: call.callerNumber || "Web Test",
        },
        type: call.callerNumber === "Web Test" ? "webCall" : "outboundPhoneCall",
        agentId: call.agentId,
        agent: call.agent ? { id: call.agent.id, name: call.agent.name } : null,
        assistant: call.agent ? { id: call.agent.id, name: call.agent.name } : null,
        status: call.status,
        transcript: call.transcript,
        responseText: call.responseText,
        outputAudio: call.outputAudio,
        outputAudioUrl: buildAudioUrl(call.outputAudio),
        recordingUrl: buildAudioUrl(call.outputAudio),
        startedAt: call.startedAt.toISOString(),
        endedAt: call.endedAt ? call.endedAt.toISOString() : null,
        duration: call.endedAt
          ? Math.max(1, Math.round((call.endedAt.getTime() - call.startedAt.getTime()) / 1000))
          : 0,
        cost: 0,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
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

app.post(
  "/agents/:agentId/knowledge/upload",
  upload.single("file"),
  async (req, res) => {
    try {
      const agentId = String(req.params.agentId);

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "knowledge file is required",
        });
      }

      const record = await knowledgeService.uploadKnowledge({
        agentId,
        filePath: req.file.path,
        originalName: req.file.originalname,
      });

      return res.json({
        success: true,
        knowledge: record,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

app.get("/agents/:agentId/knowledge", async (req, res) => {
  const agentId = String(req.params.agentId);

  return res.json({
    success: true,
    knowledge: await knowledgeService.list(agentId),
  });
});

app.post("/campaigns/upload", upload.single("csv"), async (req, res) => {
  try {
    const { name, agentId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "csv file is required",
      });
    }

    if (!name || !agentId) {
      return res.status(400).json({
        success: false,
        error: "name and agentId are required",
      });
    }

    const campaign = await campaignService.createCampaign({
      name,
      agentId,
      csvPath: req.file.path,
    });

    return res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/campaigns", async (_, res) => {
  return res.json({
    success: true,
    campaigns: await campaignService.listCampaigns(),
  });
});

app.get("/campaigns/:id", async (req, res) => {
  const campaign = await campaignService.findById(String(req.params.id));

  if (!campaign) {
    return res.status(404).json({
      success: false,
      error: "Campaign not found",
    });
  }

  return res.json({
    success: true,
    campaign,
  });
});

app.post("/campaigns/:id/start", async (req, res) => {
  try {
    const campaign = await campaignService.startCampaign(String(req.params.id));

    return res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post(
  "/webhooks/twilio/incoming",
  express.urlencoded({ extended: false }),
  (req, res) => {
    const call = twilioWebhook.handleIncomingCall(req.body);

    console.log("Twilio incoming call:", call);

    const twiml = twilioWebhook.generateVoiceResponse(
      "Hello, welcome to Anturon Voice Assistant. Please say how I can help you."
    );

    res.type("text/xml");
    return res.send(twiml);
  }
);

app.post(
  "/webhooks/twilio/recording",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      const callId = req.body.CallSid;
      const recordingUrl = req.body.RecordingUrl;
      const from = req.body.From;

      if (!callId || !recordingUrl) {
        res.type("text/xml");
        return res.send(
          twilioWebhook.generateVoiceResponse(
            "Sorry, I could not receive your recording. Please try again."
          )
        );
      }

      const audioResponse = await axios.get(`${recordingUrl}.wav`, {
        responseType: "arraybuffer",
      });

      const twilioAudioPath = path.resolve(
        "./audio/uploads",
        `${callId}-${Date.now()}.wav`
      );

      fs.writeFileSync(twilioAudioPath, Buffer.from(audioResponse.data));

      const session = await callController.handleIncomingCall({
        callId,
        callerNumber: from,
        audioPath: twilioAudioPath,
        agentId: "agent_1780804724110",
      });

      const outputAudioUrl = buildAudioUrl(session.outputAudio);

      const publicBaseUrl =
        process.env.PUBLIC_BASE_URL || "http://localhost:3000";

      const fullAudioUrl = `${publicBaseUrl}${outputAudioUrl}`;

      res.type("text/xml");
      return res.send(twilioWebhook.generatePlayResponse(fullAudioUrl));
    } catch (error: any) {
      console.error("Twilio recording error:", error.message);

      res.type("text/xml");
      return res.send(
        twilioWebhook.generateVoiceResponse(
          "Sorry, something went wrong. Please try again."
        )
      );
    }
  }
);

app.post("/test/knowledge", async (req, res) => {
  try {
    const { agentId, question } = req.body;

    if (!agentId || !question) {
      return res.status(400).json({
        success: false,
        error: "agentId and question are required",
      });
    }

    const agent = await agentService.findById(String(agentId));
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found",
      });
    }

    const knowledgeContext = await knowledgeService.getAgentContext(String(agentId), String(question));

    const { SarvamProvider } = await import("./providers/llm/sarvam-provider");
    const llm = new SarvamProvider();

    const systemPrompt = `
You are ${agent.name}, a helpful AI assistant.

Agent/System Prompt:
${agent.systemPrompt}

Uploaded Knowledge Context:
${knowledgeContext || "No uploaded knowledge context found."}

Answer Policy:
- Answer ONLY from Uploaded Knowledge Context and Agent/System Prompt.
- Do not use outside/general knowledge.
- If the answer is not present, say: "Sorry, I don't have that information."

STRICT OUTPUT RULES:
- ONE sentence only. Ek sentence mein answer do.
- Maximum 20 words.
- No intro like "Based on the context" or "The context mentions".
- Just the direct answer. Nothing else.
`.trim();

    let answer = await llm.generate(systemPrompt, String(question));

    const refused =
      answer.toLowerCase().includes("don't have that information") ||
      answer.toLowerCase().includes("current knowledge base") ||
      answer.toLowerCase().includes("could not generate");

    if (refused && knowledgeContext && knowledgeContext.trim().length > 50) {
      const forceContextPrompt = `
You are ${agent.name}, a helpful AI assistant.

The uploaded knowledge context below is related to the user's question.
Use ONLY this uploaded context and agent prompt to create a helpful answer.
Do not refuse.

Agent/System Prompt:
${agent.systemPrompt}

Uploaded Knowledge Context:
${knowledgeContext}

Rules:
- ONE sentence only.
- Maximum 20 words.
- No intro phrases. Direct answer only.
- Do not use outside unrelated knowledge.
`.trim();

      answer = await llm.generate(forceContextPrompt, String(question));
    }


    answer = answer
      .replace(/\s+/g, " ")
      .split(". ")
      .slice(0, 2)
      .join(". ")
      .trim();

    if (answer.length > 220) {
      answer = answer.slice(0, 220).trim() + "...";
    }

    if (answer && !/[.!?]$/.test(answer)) {
      answer += ".";
    }
    await prisma.knowledgeQuery.create({
      data: {
        id: `kq_${Date.now()}`,
        agentId: String(agentId),
        question: String(question),
        context: knowledgeContext,
        answer,
      },
    });

    return res.json({
      success: true,
      answer,
      knowledgeContext,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/dashboard/stats", async (_, res) => {
  try {
    const stats = await dashboardService.getStats();

    return res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/dashboard/recent-calls", async (_, res) => {
  try {
    const calls = await dashboardService.getRecentCalls();

    return res.json({
      success: true,
      calls,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/dashboard/recent-agents", async (_, res) => {
  try {
    const agents = await dashboardService.getRecentAgents();

    return res.json({
      success: true,
      agents,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/dashboard/recent-campaigns", async (_, res) => {
  try {
    const campaigns = await dashboardService.getRecentCampaigns();

    return res.json({
      success: true,
      campaigns,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/campaigns/:id/pause", async (req, res) => {
  try {
    const campaign = await campaignService.pauseCampaign(String(req.params.id));

    return res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/campaigns/:id/resume", async (req, res) => {
  try {
    const campaign = await campaignService.resumeCampaign(String(req.params.id));

    return res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/campaigns/:id/retry-failed", async (req, res) => {
  try {
    const campaign = await campaignService.retryFailedLeads(
      String(req.params.id)
    );

    return res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/test/agent-question", async (req, res) => {
  try {
    const { agentId, question } = req.body;

    if (!agentId || !question) {
      return res.status(400).json({
        success: false,
        error: "agentId and question are required",
      });
    }

    const agent = await agentService.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found",
      });
    }

    const knowledgeContext = await knowledgeService.getAgentContext(
      agentId,
      question
    );
    const { SarvamProvider } = await import("./providers/llm/sarvam-provider");
    const llm = new SarvamProvider();

    const systemPrompt = `
You are a company-specific voice AI agent.

IMPORTANT:
When Knowledge Base Context is available, it has higher priority than any old agent prompt.
Ignore any previous business identity if it conflicts with Knowledge Base Context.

Agent Prompt:
${agent.systemPrompt}

Knowledge Base Context:
${knowledgeContext || "No relevant knowledge base context found."}

STRICT RULES:
- If Knowledge Base Context is available, answer ONLY from it.
- Do not answer as Dubai real estate agent unless the knowledge base is about Dubai real estate.
- Do not mention Sarvam, Deepgram, model, provider, or AI vendor.
- Keep response short because this is a phone call.
- Ask only one question at a time.
- If knowledge is missing and user asks company-specific information, say:
"Sorry, I only have information available in this agent knowledge base."
`.trim();

    const answer = await llm.generate(systemPrompt, question);
    const tts = new DeepgramTTSProvider();
    const audio = await tts.synthesize(answer);
    const audioFileName = audio.outputPath.split("\\").pop();

    const publicBaseUrl = process.env.PUBLIC_BASE_URL || "http://35.168.16.223";
    const audioUrl = `${publicBaseUrl}/audio/output/${path.basename(audio.outputPath)}`;

    await prisma.knowledgeQuery.create({
      data: {
        id: `kq_${Date.now()}`,
        agentId,
        question,
        context: knowledgeContext,
        answer,
      },
    });

    const startedAt = new Date();
    const endedAt = new Date();

    await callStore.save({
      callId: `web_${Date.now()}`,
      callerNumber: "Web Test",
      agentId,
      status: "completed",
      inputAudio: "browser-mic",
      transcript: question,
      responseText: answer,
      outputAudio: audio.outputPath,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
    });

    return res.json({
      success: true,
      question,
      knowledgeContext,
      answer,
      audioFile: audioFileName,
      audioPath: audio.outputPath,
      audioUrl,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post(
  "/webhooks/twilio/outbound",
  express.urlencoded({ extended: false }),
  (req, res) => {
    const agentId = String(req.query.agentId || "");
    const campaignId = String(req.query.campaignId || "");

    console.log("Twilio outbound call connected:", {
      agentId,
      campaignId,
      body: req.body,
    });

    const twiml = twilioWebhook.generateVoiceResponse(
      "Hello, this is Anturon Voice Assistant. Please say how I can help you."
    );

    res.type("text/xml");
    return res.send(twiml);
  }
);

app.get("/agents/:agentId/knowledge/queries", async (req, res) => {
  try {
    const agentId = String(req.params.agentId);

    const queries = await prisma.knowledgeQuery.findMany({
      where: { agentId },
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      queries,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/agents/:id", async (req, res) => {
  try {
    const id = String(req.params.id);

    const agent = await agentService.findById(id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found",
      });
    }

    return res.json({
      success: true,
      agent,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.put("/agents/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const {
      name,
      systemPrompt,
      language,
      sttProvider,
      llmProvider,
      ttsProvider,
    } = req.body;

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        name,
        systemPrompt,
        language: language || "en",
        sttProvider: sttProvider || "deepgram",
        llmProvider: llmProvider || "sarvam",
        ttsProvider: ttsProvider || "deepgram",
      },
    });

    return res.json({
      success: true,
      agent,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.delete("/agents/:id", async (req, res) => {
  try {
    const id = String(req.params.id);

    await prisma.telephonyConfig.deleteMany({ where: { agentId: id } });
    await prisma.knowledgeQuery.deleteMany({ where: { agentId: id } });
    await prisma.knowledgeChunk.deleteMany({ where: { agentId: id } });
    await prisma.knowledge.deleteMany({ where: { agentId: id } });
    await prisma.campaign.deleteMany({ where: { agentId: id } });
    await prisma.call.updateMany({
      where: { agentId: id },
      data: { agentId: null },
    });

    await prisma.agent.delete({ where: { id } });

    return res.json({
      success: true,
      deleted: true,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/agents/:agentId/telephony/config", async (req, res) => {
  try {
    const agentId = String(req.params.agentId);

    const {
      provider,
      accountSid,
      authToken,
      phoneNumber,
      sipUsername,
      sipPassword,
      sipDomain,
      status,
    } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        error: "provider is required",
      });
    }

    const agent = await agentService.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found",
      });
    }

    const existing = await prisma.telephonyConfig.findFirst({
      where: { agentId, provider },
    });

    const config = existing
      ? await prisma.telephonyConfig.update({
          where: { id: existing.id },
          data: {
            accountSid,
            authToken,
            phoneNumber,
            sipUsername,
            sipPassword,
            sipDomain,
            status: status || "inactive",
          },
        })
      : await prisma.telephonyConfig.create({
          data: {
            id: `tel_${Date.now()}`,
            agentId,
            provider,
            accountSid,
            authToken,
            phoneNumber,
            sipUsername,
            sipPassword,
            sipDomain,
            status: status || "inactive",
          },
        });

    return res.json({
      success: true,
      config,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/agents/:agentId/telephony/config", async (req, res) => {
  try {
    const agentId = String(req.params.agentId);

    const configs = await prisma.telephonyConfig.findMany({
      where: { agentId },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      configs,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/agents/:agentId/web-call/message", async (req, res) => {
  try {
    const agentId = String(req.params.agentId);
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "message is required",
      });
    }

    const agent = await agentService.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: "Agent not found",
      });
    }

    const knowledgeContext = await knowledgeService.getAgentContext(
      agentId,
      message
    );

    const { SarvamProvider } = await import("./providers/llm/sarvam-provider");
    const llm = new SarvamProvider();

    const systemPrompt = `
You are ${agent.name}, a voice AI agent.

Agent/System Prompt:
${agent.systemPrompt}

Uploaded Knowledge Context:
${knowledgeContext || "No uploaded knowledge context found."}

Answer Policy:
- You are allowed to answer ONLY from Agent/System Prompt and Uploaded Knowledge Context.
- If Uploaded Knowledge Context contains relevant answer, use it.
- If Agent/System Prompt contains relevant answer, use it.
- If neither contains the answer, politely say you don't have that information.
- Do not use outside/general knowledge.

Voice Rules:
- ONE sentence only. Maximum 20 words.
- No intro like "Based on the context" — direct answer.
- Voice-call friendly and natural.
- Reply in the same language as user.
`.trim();

    let answer = await llm.generate(systemPrompt, message);

    const refused =
      answer.toLowerCase().includes("don't have that information") ||
      answer.toLowerCase().includes("current knowledge base") ||
      answer.toLowerCase().includes("could not generate");

    if (refused && knowledgeContext && knowledgeContext.trim().length > 50) {
      const forceContextPrompt = `
You are ${agent.name}, a helpful AI voice agent.

The uploaded knowledge context below is related to the user's question.
Use ONLY this uploaded context and agent prompt to create a helpful answer.
Do not refuse.

Agent/System Prompt:
${agent.systemPrompt}

Uploaded Knowledge Context:
${knowledgeContext}

Rules:
- ONE sentence only.
- Maximum 20 words.
- No intro phrases. Direct answer only.
- Do not use outside unrelated knowledge.
- Reply in the same language as user.
`.trim();

      answer = await llm.generate(forceContextPrompt, message);
    }


    answer = answer
      .replace(/\s+/g, " ")
      .split(". ")
      .slice(0, 2)
      .join(". ")
      .trim();

    if (answer.length > 220) {
      answer = answer.slice(0, 220).trim() + "...";
    }

    if (answer && !/[.!?]$/.test(answer)) {
      answer += ".";
    }
    const tts = new DeepgramTTSProvider();
    const audio = await tts.synthesize(answer);

    const publicBaseUrl = process.env.PUBLIC_BASE_URL || "http://35.168.16.223";
    const audioUrl = `${publicBaseUrl}/audio/output/${path.basename(audio.outputPath)}`;

    await prisma.knowledgeQuery.create({
      data: {
        id: `kq_${Date.now()}`,
        agentId,
        question: message,
        context: knowledgeContext,
        answer,
      },
    });

    const webSessionId = sessionId || `web_${Date.now()}`;

    const existing = webCallSessions.get(webSessionId) || {
      callId: webSessionId,
      agentId,
      callerNumber: "Web Test",
      startedAt: new Date().toISOString(),
      messages: [],
      audioPaths: [],
    };

    existing.messages.push({
      role: "user",
      text: message,
      at: new Date().toISOString(),
    });

    existing.messages.push({
      role: "assistant",
      text: answer,
      at: new Date().toISOString(),
    });

    existing.audioPaths.push(audio.outputPath);

    webCallSessions.set(webSessionId, existing);

    return res.json({
      success: true,
      mode: "web-call-test",
      agentId,
      sessionId: webSessionId,
      transcript: message,
      answer,
      audioUrl,
      audioPath: audio.outputPath,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post(
  "/agents/:agentId/web-call/end",
  upload.single("recording"),
  async (req, res) => {
    try {
      const agentId = String(req.params.agentId);
      const sessionId = String(req.body.sessionId || "");

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: "sessionId is required",
        });
      }

      const session = webCallSessions.get(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Web call session not found",
        });
      }

      const transcript = session.messages
        .map((m: any) => `${m.role === "user" ? "User" : "AI"}: ${m.text}`)
        .join("\n\n");

      const aiResponse = session.messages
        .filter((m: any) => m.role === "assistant")
        .map((m: any) => m.text)
        .join("\n\n");

      const recordingPath = req.file?.path || undefined;

      if (!recordingPath) {
        return res.status(400).json({
          success: false,
          error: "Full web-call recording was not uploaded from browser",
        });
      }

      await callStore.save({
        callId: session.callId,
        callerNumber: "Web Test",
        agentId,
        status: "completed",
        inputAudio: "browser-web-call",
        transcript,
        responseText: aiResponse,
        outputAudio: recordingPath,
        startedAt: session.startedAt,
        endedAt: new Date().toISOString(),
      });

      webCallSessions.delete(sessionId);

      return res.json({
        success: true,
        saved: true,
        transcript,
        outputAudioUrl: buildAudioUrl(recordingPath),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

app.post("/agents/:agentId/web-call/save", async (req, res) => {
  try {
    const agentId = String(req.params.agentId);
    const { messages, lastAudioUrl, startedAt, endedAt } = req.body;

    const agent = await agentService.findById(agentId);

    const userLines = (messages || [])
      .filter((m: any) => m.role === "user")
      .map((m: any) => m.text)
      .join("\n");

    const assistantLines = (messages || [])
      .filter((m: any) => m.role === "assistant")
      .map((m: any) => m.text)
      .join("\n");

    await callStore.save({
      callId: `web_${Date.now()}`,
      callerNumber: "Web Test",
      agentId,
      status: "completed",
      inputAudio: "browser-mic",
      transcript: userLines,
      responseText: assistantLines,
      outputAudio: lastAudioUrl
        ? lastAudioUrl.replace(`${process.env.PUBLIC_BASE_URL || "http://35.168.16.223"}/audio/output/`, "./audio/output/")
        : undefined,
      startedAt: startedAt || new Date().toISOString(),
      endedAt: endedAt || new Date().toISOString(),
    });

    return res.json({
      success: true,
      saved: true,
      agentName: agent?.name,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

app.use((error: any, req: any, res: any, next: any) => {
  console.error("Unhandled Error:", {
    message: error.message,
    stack: error.stack,
    path: req.originalUrl,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Orchestrator running on http://localhost:${PORT}`);
});