import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import type { ListParams, PaginatedResponse } from '@/types';

export type Occasion = 'birthday' | 'anniversary';
export type OccasionChannel = 'whatsapp' | 'email' | 'sms';

export interface OccasionSettings {
  _id?: string;
  birthdayEnabled: boolean;
  anniversaryEnabled: boolean;
  daysBeforeBirthday: number;
  daysBeforeAnniversary: number;
  sendTime: string;
  timezone: string;
  preferredChannel: OccasionChannel;
  fallbackChannel: OccasionChannel | 'none';
  signature?: string;
  reminderEnabled: boolean;
  retryEnabled: boolean;
  isPaused: boolean;
}

export interface OccasionTemplate {
  _id?: string;
  id?: string;
  name: string;
  occasion: Occasion;
  channel: OccasionChannel;
  subject?: string;
  body: string;
  variables?: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OccasionCampaign {
  _id?: string;
  id?: string;
  name: string;
  occasion: Occasion;
  channel: OccasionChannel;
  templateId?: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled' | 'failed';
  scheduledAt?: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt?: string;
}

export interface OccasionDelivery {
  _id?: string;
  id?: string;
  guestId?: unknown;
  occasion: Occasion;
  channel: OccasionChannel;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'opened' | 'failed' | 'cancelled' | 'skipped';
  occurrenceDate: string;
  recipientName: string;
  recipientMasked: string;
  messagePreview?: string;
  sentAt?: string;
  openedAt?: string;
  failedReason?: string;
  retryCount: number;
  createdAt?: string;
}

export interface OccasionDashboard {
  todayBirthdays: number;
  todayAnniversaries: number;
  upcomingEvents: number;
  messagesSent: number;
  failedMessages: number;
  pendingMessages: number;
  automationHealth: 'healthy' | 'paused' | 'disabled';
  settings: OccasionSettings;
  todayGuests: Array<{ id: string; name: string; contact: string }>;
}

export interface OccasionAnalytics {
  birthdayMessagesSent: number;
  anniversaryMessagesSent: number;
  deliveryRate: number;
  failureRate: number;
  monthlyTrend: Array<{ month: string; occasion: Occasion; count: number }>;
  campaignPerformance: Array<{ _id: string; total: number; sent: number; failed: number }>;
}

export const entityId = (entity: { _id?: string; id?: string }) => entity.id || entity._id || '';

export const getOccasionDashboard = () => apiGet<OccasionDashboard>('/birthday-automation/dashboard');
export const getOccasionAnalytics = (params?: Record<string, unknown>) => apiGet<OccasionAnalytics>('/birthday-automation/analytics', params);
export const getOccasionSettings = () => apiGet<OccasionSettings>('/birthday-automation/settings');
export const updateOccasionSettings = (payload: OccasionSettings) => apiPut<OccasionSettings>('/birthday-automation/settings', payload);
export const pauseOccasionAutomation = () => apiPost<OccasionSettings>('/birthday-automation/pause');
export const resumeOccasionAutomation = () => apiPost<OccasionSettings>('/birthday-automation/resume');
export const scanOccasionAutomation = () => apiPost<{ queued: number; skipped?: string }>('/birthday-automation/scan', {});
export const retryFailedOccasionMessages = () => apiPost<{ retried: number }>('/birthday-automation/retry-failed', {});
export const exportOccasionHistory = () => apiGet<{ generatedAt: string; count: number; rows: unknown[] }>('/birthday-automation/export');
export const sendOccasionTestMessage = (payload: Record<string, unknown>) => apiPost('/birthday-automation/test-message', payload);
export const sendOccasionManual = (payload: Record<string, unknown>) => apiPost<{ queued: number; failed: number }>('/birthday-automation/manual-send', payload);

export const getOccasionTemplates = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<OccasionTemplate>>('/birthday-automation/templates', params);
export const createOccasionTemplate = (payload: Partial<OccasionTemplate>) => apiPost<OccasionTemplate>('/birthday-automation/templates', payload);
export const updateOccasionTemplate = (id: string, payload: Partial<OccasionTemplate>) => apiPatch<OccasionTemplate>(`/birthday-automation/templates/${id}`, payload);
export const deleteOccasionTemplate = (id: string) => apiDelete<void>(`/birthday-automation/templates/${id}`);
export const duplicateOccasionTemplate = (id: string, name?: string) => apiPost<OccasionTemplate>(`/birthday-automation/templates/${id}/duplicate`, { name });
export const previewOccasionTemplate = (id: string) => apiPost<{ subject: string; body: string; variables: string[] }>(`/birthday-automation/templates/${id}/preview`);

export const getOccasionCampaigns = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<OccasionCampaign>>('/birthday-automation/campaigns', params);
export const createOccasionCampaign = (payload: Record<string, unknown>) => apiPost<OccasionCampaign>('/birthday-automation/campaigns', payload);
export const cancelOccasionCampaign = (id: string) => apiPost<OccasionCampaign>(`/birthday-automation/campaigns/${id}/cancel`);
export const previewOccasionRecipients = (payload: Record<string, unknown>) => apiPost<{ total: number; sample: Array<{ id: string; name: string; contact: string }> }>('/birthday-automation/campaigns/preview-recipients', payload);
export const getOccasionHistory = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<OccasionDelivery>>('/birthday-automation/history', params);
