import fs from "fs";
import { parse } from "csv-parse/sync";
import { Campaign, CampaignLead } from "./campaign-types";
import { CampaignStore } from "../storage/campaign-store";
import { CallController } from "../calls/call-controller";
import { TwilioProvider } from "../providers/telephony/twilio-provider";
import { prisma } from "../db/prisma";

const store = new CampaignStore();
const callController = new CallController();

export class CampaignService {
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async requireActiveTelephony(agentId: string) {
    const config = await prisma.telephonyConfig.findFirst({
      where: {
        agentId,
        status: "active",
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    if (!config) {
      throw new Error(
        "Please connect and activate a telephony provider before starting campaign."
      );
    }
    return config;
  }

  private hasTwilioConfig() {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER &&
        process.env.PUBLIC_BASE_URL
    );
  }

  private async processLead(params: {
    campaign: Campaign;
    lead: CampaignLead;
    callId: string;
  }) {
    const { campaign, lead, callId } = params;

    lead.lastAttemptAt = new Date().toISOString();

    if (this.hasTwilioConfig()) {
      const twilioProvider = new TwilioProvider();

      const call = await twilioProvider.makeOutboundCall({
        to: lead.phone,
        agentId: campaign.agentId,
        campaignId: campaign.id,
      });

      lead.status = "called";
      lead.callId = call.sid;
      lead.error = undefined;

      return;
    }

    const session = await callController.handleIncomingCall({
      callId,
      callerNumber: lead.phone,
      agentId: campaign.agentId,
      audioPath: "./audio/sample.wav",
    });

    lead.status = "called";
    lead.callId = session.callId;
    lead.error = undefined;
  }

  async createCampaign(params: {
    name: string;
    agentId: string;
    csvPath: string;
  }): Promise<Campaign> {
    const csv = fs.readFileSync(params.csvPath, "utf-8");

    const rows = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as any[];

    const leads: CampaignLead[] = rows
      .map((row) => ({
        name: row.name || row.Name || "",
        phone: row.phone || row.Phone || row.mobile || row.Mobile || "",
        status: "pending" as const,
        retryCount: 0,
      }))
      .filter((lead) => lead.phone);

    const campaign: Campaign = {
      id: `campaign_${Date.now()}`,
      name: params.name,
      agentId: params.agentId,
      csvPath: params.csvPath,
      totalContacts: leads.length,
      completedCalls: 0,
      failedCalls: 0,
      status: "pending",
      leads,
      createdAt: new Date().toISOString(),
      maxRetries: 3,
    };

    await store.save(campaign);

    return campaign;
  }

  async startCampaign(id: string): Promise<Campaign> {
    const campaign = await store.findById(id);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status === "running") {
      throw new Error("Campaign is already running");
    }

    await this.requireActiveTelephony(campaign.agentId);

    campaign.status = "running";
    campaign.startedAt = campaign.startedAt || new Date().toISOString();

    await store.update(campaign);

    for (const lead of campaign.leads) {
      const latestCampaign = await store.findById(campaign.id);

      if (latestCampaign?.status === "paused") {
        campaign.status = "paused";
        campaign.pausedAt = new Date().toISOString();
        await store.update(campaign);
        return campaign;
      }

      if (lead.status === "called") {
        continue;
      }

      try {
        const callId = `call_${campaign.id}_${Date.now()}`;

        await this.processLead({
          campaign,
          lead,
          callId,
        });

        campaign.completedCalls += 1;
      } catch (error: any) {
        lead.status = "failed";
        lead.error = error.message;
        lead.retryCount = (lead.retryCount || 0) + 1;
        lead.lastAttemptAt = new Date().toISOString();
        campaign.failedCalls += 1;
      }

      await store.update(campaign);

      await this.sleep(3000);
    }

    campaign.status = "completed";
    campaign.completedAt = new Date().toISOString();

    await store.update(campaign);

    return campaign;
  }

  async pauseCampaign(id: string): Promise<Campaign> {
    const campaign = await store.findById(id);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    campaign.status = "paused";
    campaign.pausedAt = new Date().toISOString();

    await store.update(campaign);

    return campaign;
  }

  async resumeCampaign(id: string): Promise<Campaign> {
    const campaign = await store.findById(id);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "paused") {
      throw new Error("Only paused campaigns can be resumed");
    }

    campaign.status = "running";

    await store.update(campaign);

    return await this.startCampaign(id);
  }

  async retryFailedLeads(id: string): Promise<Campaign> {
    const campaign = await store.findById(id);

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    await this.requireActiveTelephony(campaign.agentId);

    const maxRetries = campaign.maxRetries || 3;

    campaign.status = "running";
    await store.update(campaign);

    for (const lead of campaign.leads) {
      if (lead.status !== "failed") continue;

      if ((lead.retryCount || 0) >= maxRetries) {
        continue;
      }

      try {
        const callId = `retry_${campaign.id}_${Date.now()}`;

        await this.processLead({
          campaign,
          lead,
          callId,
        });

        lead.retryCount = (lead.retryCount || 0) + 1;
        campaign.completedCalls += 1;
        campaign.failedCalls = Math.max(0, campaign.failedCalls - 1);
      } catch (error: any) {
        lead.retryCount = (lead.retryCount || 0) + 1;
        lead.lastAttemptAt = new Date().toISOString();
        lead.error = error.message;
      }

      await store.update(campaign);

      await this.sleep(3000);
    }

    const remainingFailed = campaign.leads.some(
      (lead) => lead.status === "failed" && (lead.retryCount || 0) < maxRetries
    );

    const allDone = campaign.leads.every(
      (lead) => lead.status === "called" || (lead.retryCount || 0) >= maxRetries
    );

    if (allDone) {
      campaign.status = "completed";
      campaign.completedAt = new Date().toISOString();
    } else if (remainingFailed) {
      campaign.status = "failed";
    }

    await store.update(campaign);

    return campaign;
  }

  async listCampaigns() {
    return await store.list();
  }

  async findById(id: string) {
    return await store.findById(id);
  }
}