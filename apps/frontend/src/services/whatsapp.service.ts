import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  ListParams,
  PaginatedResponse,
  WhatsAppAutomationRule,
  WhatsAppConversation,
  WhatsAppIntegrationStatus,
  WhatsAppMessage,
  WhatsAppStats,
  WhatsAppTemplate,
} from '@/types';

export const getWhatsAppMessages = (params?: ListParams) =>
  apiGet<PaginatedResponse<WhatsAppMessage>>('/whatsapp', params);

export const getWhatsAppMessagesAlias = (params?: ListParams) =>
  apiGet<PaginatedResponse<WhatsAppMessage>>('/whatsapp/messages', params);

export const getWhatsAppMessageById = (id: string) => apiGet<WhatsAppMessage>(`/whatsapp/${id}`);

export const getWhatsAppStats = () => apiGet<WhatsAppStats>('/whatsapp/stats');

export const getWhatsAppIntegrationStatus = () =>
  apiGet<WhatsAppIntegrationStatus>('/whatsapp/integration-status');

export const getWhatsAppConversations = (params?: ListParams) =>
  apiGet<{ data: WhatsAppConversation[]; pagination: PaginatedResponse<WhatsAppMessage>['pagination'] }>(
    '/whatsapp/conversations',
    params
  );

export const getWhatsAppConversationThread = (phone: string) =>
  apiGet<WhatsAppMessage[]>(`/whatsapp/conversations/${encodeURIComponent(phone)}`);

export const sendWhatsAppMessage = (payload: Record<string, unknown>) =>
  apiPost<WhatsAppMessage>('/whatsapp/send', payload);

export const scheduleWhatsAppMessage = (payload: Record<string, unknown>) =>
  apiPost<WhatsAppMessage>('/whatsapp/schedule', payload);

export const broadcastWhatsAppMessage = (payload: Record<string, unknown>) =>
  apiPost<{ sent: number; messages: WhatsAppMessage[] }>('/whatsapp/broadcast', payload);

export const retryWhatsAppMessage = (id: string) => apiPost<WhatsAppMessage>(`/whatsapp/${id}/retry`, {});

export const createWhatsAppMessage = (payload: Record<string, unknown>) =>
  apiPost<WhatsAppMessage>('/whatsapp', payload);

export const updateWhatsAppMessage = (id: string, payload: Record<string, unknown>) =>
  apiPatch<WhatsAppMessage>(`/whatsapp/${id}`, payload);

export const deleteWhatsAppMessage = (id: string) => apiDelete<void>(`/whatsapp/${id}`);

export const getWhatsAppTemplates = (params?: ListParams) =>
  apiGet<PaginatedResponse<WhatsAppTemplate>>('/whatsapp/templates', params);

export const createWhatsAppTemplate = (payload: Record<string, unknown>) =>
  apiPost<WhatsAppTemplate>('/whatsapp/templates', payload);

export const updateWhatsAppTemplate = (id: string, payload: Record<string, unknown>) =>
  apiPatch<WhatsAppTemplate>(`/whatsapp/templates/${id}`, payload);

export const getWhatsAppAutomationRules = (params?: ListParams) =>
  apiGet<PaginatedResponse<WhatsAppAutomationRule>>('/whatsapp/automation-rules', params);

export const createWhatsAppAutomationRule = (payload: Record<string, unknown>) =>
  apiPost<WhatsAppAutomationRule>('/whatsapp/automation-rules', payload);

export const updateWhatsAppAutomationRule = (id: string, payload: Record<string, unknown>) =>
  apiPatch<WhatsAppAutomationRule>(`/whatsapp/automation-rules/${id}`, payload);

export const processScheduledWhatsAppMessages = () =>
  apiPost<WhatsAppMessage[]>('/whatsapp/process-scheduled', {});

// Backward-compatible aliases
export const getWhatsapp = getWhatsAppMessages;
export const getWhatsappById = getWhatsAppMessageById;
export const createWhatsapp = createWhatsAppMessage;
export const updateWhatsapp = updateWhatsAppMessage;
export const deleteWhatsapp = deleteWhatsAppMessage;
