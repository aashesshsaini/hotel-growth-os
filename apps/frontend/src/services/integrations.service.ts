import { apiGet, apiPost, apiPut } from '@/lib/api';

export type IntegrationType = 'whatsapp' | 'email' | 'googleReview';
export type IntegrationStatus = 'connected' | 'disconnected' | 'connection_failed' | 'token_expired' | 'invalid_credentials';

export interface IntegrationHealth {
  status: IntegrationStatus;
  lastTestedAt?: string;
  lastSuccessfulConnectionAt?: string;
  lastFailedAttemptAt?: string;
  lastError?: string;
  lastUpdatedAt?: string;
}

export interface HotelIntegrationSettings {
  whatsapp: {
    businessName: string;
    phoneNumber: string;
    phoneNumberId: string;
    businessAccountId: string;
    permanentAccessTokenMasked?: string;
    webhookVerifyTokenMasked?: string;
    webhookSecretMasked?: string;
    health: IntegrationHealth;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    username: string;
    passwordMasked?: string;
    encryption: 'none' | 'ssl' | 'tls' | 'starttls';
    senderName: string;
    senderEmail: string;
    replyToEmail: string;
    health: IntegrationHealth;
  };
  googleReview: {
    googleReviewUrl: string;
    googleBusinessName: string;
    googlePlaceId?: string;
    reviewButtonLabel: string;
    automationEnabled: boolean;
    health: IntegrationHealth;
  };
  supportedIntegrations: Array<{ type: IntegrationType; name: string; description: string }>;
}

export interface WhatsAppIntegrationPayload {
  businessName: string;
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  permanentAccessToken?: string;
  webhookVerifyToken?: string;
  webhookSecret?: string;
}

export interface EmailIntegrationPayload {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password?: string;
  encryption: 'none' | 'ssl' | 'tls' | 'starttls';
  senderName: string;
  senderEmail: string;
  replyToEmail?: string;
}

export interface GoogleReviewIntegrationPayload {
  googleReviewUrl: string;
  googleBusinessName: string;
  googlePlaceId?: string;
  reviewButtonLabel: string;
  automationEnabled: boolean;
}

export const getHotelIntegrations = () => apiGet<HotelIntegrationSettings>('/hotel-integrations');
export const getHotelIntegrationHealth = () => apiGet<Record<IntegrationType, IntegrationHealth>>('/hotel-integrations/health');
export const updateWhatsAppIntegration = (payload: WhatsAppIntegrationPayload) => apiPut<HotelIntegrationSettings>('/hotel-integrations/whatsapp', payload);
export const updateEmailIntegration = (payload: EmailIntegrationPayload) => apiPut<HotelIntegrationSettings>('/hotel-integrations/email', payload);
export const updateGoogleReviewIntegration = (payload: GoogleReviewIntegrationPayload) => apiPut<HotelIntegrationSettings>('/hotel-integrations/googleReview', payload);
export const testHotelIntegration = (type: IntegrationType) => apiPost<{ success: boolean; status: string; message: string }>(`/hotel-integrations/${type}/test`);
export const disconnectHotelIntegration = (type: IntegrationType) => apiPost<HotelIntegrationSettings>(`/hotel-integrations/${type}/disconnect`);
