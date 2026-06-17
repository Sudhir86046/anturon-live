import twilio from "twilio";

export class TwilioProvider {
  private client: ReturnType<typeof twilio>;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials are missing");
    }

    this.client = twilio(accountSid, authToken);
  }

  async makeOutboundCall(params: {
    to: string;
    agentId: string;
    campaignId?: string;
  }) {
    const from = process.env.TWILIO_PHONE_NUMBER;
    const publicBaseUrl = process.env.PUBLIC_BASE_URL;

    if (!from) {
      throw new Error("TWILIO_PHONE_NUMBER is missing");
    }

    if (!publicBaseUrl) {
      throw new Error("PUBLIC_BASE_URL is missing");
    }

    return this.client.calls.create({
      to: params.to,
      from,
      url: `${publicBaseUrl}/webhooks/twilio/outbound?agentId=${params.agentId}&campaignId=${params.campaignId || ""}`,
      method: "POST",
    });
  }
}