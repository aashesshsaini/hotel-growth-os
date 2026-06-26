import { config } from '../config';
import { logger } from '../utils/logger';

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
}

const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');

export const whatsappProvider = {
  isConfigured(): boolean {
    return Boolean(config.whatsapp.accessToken && config.whatsapp.phoneNumberId);
  },

  async sendMessage(payload: SendWhatsAppPayload): Promise<SendWhatsAppResult> {
    const phone = normalizePhone(payload.phone);
    if (!phone) {
      return { success: false, simulated: true, error: 'Invalid phone number' };
    }

    if (!this.isConfigured()) {
      return {
        success: true,
        simulated: true,
        whatsappMessageId: `sim_${Date.now()}_${phone.slice(-4)}`,
      };
    }

    try {
      const url = `${config.whatsapp.apiUrl}/${config.whatsapp.phoneNumberId}/messages`;
      const body =
        payload.messageType === 'template' && payload.templateName
          ? {
              messaging_product: 'whatsapp',
              to: phone,
              type: 'template',
              template: {
                name: payload.templateName,
                language: { code: payload.templateLanguage || 'en' },
              },
            }
          : {
              messaging_product: 'whatsapp',
              to: phone,
              type: 'text',
              text: { body: payload.content },
            };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.whatsapp.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as { messages?: Array<{ id: string }>; error?: { message?: string } };
      if (!response.ok) {
        return {
          success: false,
          simulated: false,
          error: data.error?.message || 'WhatsApp API request failed',
        };
      }

      return {
        success: true,
        simulated: false,
        whatsappMessageId: data.messages?.[0]?.id,
      };
    } catch (error) {
      logger.error('WhatsApp send failed', error);
      return {
        success: false,
        simulated: false,
        error: error instanceof Error ? error.message : 'WhatsApp send failed',
      };
    }
  },

  verifyWebhook(mode: string | undefined, token: string | undefined, challenge: string | undefined): string | null {
    if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
      return challenge || '';
    }
    return null;
  },
};

// Backward-compatible export
export const whatsappService = whatsappProvider;
