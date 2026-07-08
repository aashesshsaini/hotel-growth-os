import { config } from "../config";
import { logger } from "../utils/logger";

export interface SendWhatsAppPayload {
  phone: string;
  messageType?: string;
  content: string;
  templateName?: string;
  templateLanguage?: string;
  mediaUrl?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  whatsappMessageId?: string;
  simulated: boolean;
  error?: string;
  status?: string;
  response?: unknown;
}

type WhatsAppDeliveryContext =
  | "review_request"
  | "reminder"
  | "internal_feedback_alert"
  | "message";

const normalizePhone = (phone: string): string => phone.replace(/\D/g, "");

const getWhatsAppSettings = () => ({
  accessToken:
    process.env.WHATSAPP_ACCESS_TOKEN || config.whatsapp.accessToken || "",
  phoneNumberId:
    process.env.WHATSAPP_PHONE_NUMBER_ID || config.whatsapp.phoneNumberId || "",
  apiVersion:
    process.env.WHATSAPP_API_VERSION || config.whatsapp.apiVersion || "v18.0",
  apiUrl:
    process.env.WHATSAPP_API_URL ||
    config.whatsapp.apiUrl ||
    "https://graph.facebook.com",
  verifyToken:
    process.env.WHATSAPP_VERIFY_TOKEN || config.whatsapp.verifyToken || "",
});

const resolveApiEndpoint = (
  settings: ReturnType<typeof getWhatsAppSettings>,
) => {
  const baseUrl = settings.apiUrl.replace(/\/+$/, "");
  return /\/v\d+(?:\.\d+)?$/i.test(baseUrl)
    ? `${baseUrl}/${settings.phoneNumberId}/messages`
    : `${baseUrl}/${settings.apiVersion}/${settings.phoneNumberId}/messages`;
};

export class WhatsAppService {
  isConfigured(): boolean {
    const { accessToken, phoneNumberId } = getWhatsAppSettings();
    return Boolean(accessToken && phoneNumberId);
  }

  async sendMessage(payload: SendWhatsAppPayload): Promise<SendWhatsAppResult> {
    return this.sendTextMessage(payload, "message");
  }

  async sendReviewRequest(
    payload: SendWhatsAppPayload,
  ): Promise<SendWhatsAppResult> {
    return this.sendTextMessage(payload, "review_request");
  }

  async sendReminder(
    payload: SendWhatsAppPayload,
  ): Promise<SendWhatsAppResult> {
    return this.sendTextMessage(payload, "reminder");
  }

  async sendInternalFeedbackAlert(
    payload: SendWhatsAppPayload,
  ): Promise<SendWhatsAppResult> {
    return this.sendTextMessage(payload, "internal_feedback_alert");
  }

  private async sendTextMessage(
    payload: SendWhatsAppPayload,
    context: WhatsAppDeliveryContext,
  ): Promise<SendWhatsAppResult> {
    const phone = normalizePhone(payload.phone);
    console.log(phone, "phone.......");
    if (!phone) {
      return {
        success: false,
        simulated: true,
        error: "Invalid phone number",
        status: "failed",
      };
    }

    const settings = getWhatsAppSettings();
    if (!this.isConfigured()) {
      const simulatedId = `sim_${Date.now()}_${phone.slice(-4)}`;
      logger.info("WhatsApp delivery simulated", {
        messageId: simulatedId,
        status: "simulated",
        response: { context },
      });
      return {
        success: true,
        simulated: true,
        whatsappMessageId: simulatedId,
        status: "simulated",
        response: { context },
      };
    }

    try {
      const url = resolveApiEndpoint(settings);
      const body =
        payload.messageType === "template" && payload.templateName
          ? {
              messaging_product: "whatsapp",
              to: phone,
              type: "template",
              template: {
                name: payload.templateName,
                language: { code: payload.templateLanguage || "en" },
              },
            }
          : {
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: { body: payload.content },
            };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json().catch(() => null)) as {
        messages?: Array<{ id: string }>;
        error?: { message?: string };
      } | null;
      const messageId = data?.messages?.[0]?.id;
      const errorMessage =
        data?.error?.message || "WhatsApp API request failed";

      if (!response.ok) {
        logger.error("WhatsApp delivery failed", {
          messageId,
          status: "failed",
          error: errorMessage,
          response: data,
        });
        return {
          success: false,
          simulated: false,
          error: errorMessage,
          status: "failed",
          response: data,
        };
      }

      logger.info("WhatsApp delivery succeeded", {
        messageId,
        status: "sent",
        error: null,
        response: data,
      });

      return {
        success: true,
        simulated: false,
        whatsappMessageId: messageId,
        status: "sent",
        response: data,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "WhatsApp send failed";
      logger.error("WhatsApp delivery failed", {
        messageId: undefined,
        status: "failed",
        error: message,
        response: null,
      });
      return {
        success: false,
        simulated: false,
        error: message,
        status: "failed",
        response: null,
      };
    }
  }

  verifyWebhook(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): string | null {
    const { verifyToken } = getWhatsAppSettings();
    if (mode === "subscribe" && token === verifyToken) {
      return challenge || "";
    }
    return null;
  }
}

// Backward-compatible export
export const whatsappProvider = new WhatsAppService();
export const whatsappService = whatsappProvider;
