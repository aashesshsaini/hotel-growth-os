import { apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import type { ListParams, PaginatedResponse } from '@/types';

export type ComebackChannel = 'whatsapp' | 'email' | 'sms';
export type ComebackStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled' | 'archived' | 'failed';

export interface ComebackSettings {
  _id?: string;
  isEnabled: boolean;
  isPaused: boolean;
  inactiveAfterDays: number[];
  cooldownDays: number;
  defaultChannel: ComebackChannel;
  fallbackChannel: ComebackChannel | 'none';
  sendTime: string;
  timezone: string;
  retryEnabled: boolean;
  signature?: string;
}

export interface ComebackTemplate {
  _id?: string;
  id?: string;
  name: string;
  channel: ComebackChannel;
  subject?: string;
  body: string;
  variables?: string[];
  isActive: boolean;
  isDefault: boolean;
  archivedAt?: string;
}

export interface ComebackCampaign {
  _id?: string;
  id?: string;
  campaignNumber?: string;
  name: string;
  channel: ComebackChannel;
  status: ComebackStatus;
  inactiveAfterDays: number;
  audienceFilters?: Record<string, unknown>;
  offer: { type: string; title: string; value?: number; couponCode?: string; expiryDate?: string; bookingLink?: string; description?: string };
  scheduledAt?: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  bookingsGenerated: number;
  revenueGenerated: number;
  timeline?: Array<{ action: string; message?: string; createdAt: string }>;
}

export interface ComebackDelivery {
  _id?: string;
  id?: string;
  recipientName: string;
  recipientMasked: string;
  channel: ComebackChannel;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'opened' | 'failed' | 'cancelled' | 'skipped';
  lastStayDate?: string;
  messagePreview?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedReason?: string;
  retryCount: number;
  createdAt?: string;
}

export interface ComebackDashboard {
  inactiveGuests: number;
  campaignsRunning: number;
  guestsReengaged: number;
  messagesSent: number;
  pendingMessages: number;
  failedMessages: number;
  upcomingCampaigns: number;
}

export interface ComebackAnalytics {
  deliveryRate: number;
  failureRate: number;
  guestReturnRate: number;
  repeatBookingRate: number;
  campaignPerformance: Array<{ _id: string; reach: number; sent: number; failed: number }>;
  monthlyTrends: Array<{ month: string; count: number }>;
}

export const entityId = (entity: { _id?: string; id?: string }) => entity.id || entity._id || '';

export const getComebackDashboard = () => apiGet<ComebackDashboard>('/comeback-campaigns/dashboard');
export const getComebackAnalytics = (params?: Record<string, unknown>) => apiGet<ComebackAnalytics>('/comeback-campaigns/analytics', params);
export const getComebackSettings = () => apiGet<ComebackSettings>('/comeback-campaigns/settings');
export const updateComebackSettings = (payload: ComebackSettings) => apiPut<ComebackSettings>('/comeback-campaigns/settings', payload);
export const pauseComebackAutomation = () => apiPost<ComebackSettings>('/comeback-campaigns/pause');
export const resumeComebackAutomation = () => apiPost<ComebackSettings>('/comeback-campaigns/resume');
export const scanComebackAudience = () => apiPost<{ queued: number; skipped?: string }>('/comeback-campaigns/scan');
export const previewComebackAudience = (payload: Record<string, unknown>) => apiPost<{ total: number; sample: Array<{ id: string; name: string; contact: string; lastStayDate?: string; totalSpend?: number; totalBookings?: number }> }>('/comeback-campaigns/audience/preview', payload);
export const retryFailedComebackMessages = () => apiPost<{ retried: number }>('/comeback-campaigns/retry-failed');
export const sendComebackTest = (payload: Record<string, unknown>) => apiPost('/comeback-campaigns/test-message', payload);
export const exportComebackHistory = () => apiGet<{ generatedAt: string; count: number; rows: unknown[] }>('/comeback-campaigns/export');

export const getComebackTemplates = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<ComebackTemplate>>('/comeback-campaigns/templates', params);
export const createComebackTemplate = (payload: Partial<ComebackTemplate>) => apiPost<ComebackTemplate>('/comeback-campaigns/templates', payload);
export const updateComebackTemplate = (id: string, payload: Partial<ComebackTemplate>) => apiPatch<ComebackTemplate>(`/comeback-campaigns/templates/${id}`, payload);
export const duplicateComebackTemplate = (id: string, name?: string) => apiPost<ComebackTemplate>(`/comeback-campaigns/templates/${id}/duplicate`, { name });
export const archiveComebackTemplate = (id: string) => apiPost<ComebackTemplate>(`/comeback-campaigns/templates/${id}/archive`);
export const previewComebackTemplate = (id: string) => apiPost<{ subject: string; body: string; variables: string[] }>(`/comeback-campaigns/templates/${id}/preview`);

export const getComebackCampaigns = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<ComebackCampaign>>('/comeback-campaigns/campaigns', params);
export const createComebackCampaign = (payload: Record<string, unknown>) => apiPost<ComebackCampaign>('/comeback-campaigns/campaigns', payload);
export const updateComebackCampaign = (id: string, payload: Record<string, unknown>) => apiPatch<ComebackCampaign>(`/comeback-campaigns/campaigns/${id}`, payload);
export const duplicateComebackCampaign = (id: string) => apiPost<ComebackCampaign>(`/comeback-campaigns/campaigns/${id}/duplicate`);
export const pauseComebackCampaign = (id: string) => apiPost<ComebackCampaign>(`/comeback-campaigns/campaigns/${id}/pause`);
export const resumeComebackCampaign = (id: string) => apiPost<ComebackCampaign>(`/comeback-campaigns/campaigns/${id}/resume`);
export const archiveComebackCampaign = (id: string) => apiPost<ComebackCampaign>(`/comeback-campaigns/campaigns/${id}/archive`);
export const cancelComebackCampaign = (id: string) => apiPost<ComebackCampaign>(`/comeback-campaigns/campaigns/${id}/cancel`);
export const getComebackHistory = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<ComebackDelivery>>('/comeback-campaigns/history', params);
