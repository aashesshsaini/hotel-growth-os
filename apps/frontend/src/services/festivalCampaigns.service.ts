import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import type { ListParams, PaginatedResponse } from '@/types';

export type FestivalChannel = 'whatsapp' | 'email' | 'sms';
export type FestivalStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled' | 'archived' | 'failed';
export type AudienceSegment = 'all_guests' | 'repeat_guests' | 'vip_guests' | 'inactive_guests' | 'recent_guests' | 'birthday_guests' | 'anniversary_guests' | 'referral_guests' | 'custom';

export interface FestivalSettings {
  _id?: string;
  isEnabled: boolean;
  isPaused: boolean;
  defaultChannel: FestivalChannel;
  fallbackChannel: FestivalChannel | 'none';
  sendTime: string;
  timezone: string;
  retryEnabled: boolean;
  recurringEnabled: boolean;
  signature?: string;
}

export interface Festival {
  _id?: string;
  id?: string;
  name: string;
  date: string;
  category: string;
  defaultBanner?: string;
  defaultMessage: string;
  defaultOffer: string;
  isBuiltIn: boolean;
  isRecurring: boolean;
  isActive: boolean;
}

export interface FestivalTemplate {
  _id?: string;
  id?: string;
  festivalId?: string;
  name: string;
  channel: FestivalChannel;
  subject?: string;
  body: string;
  variables?: string[];
  isActive: boolean;
  isDefault: boolean;
}

export interface FestivalCampaign {
  _id?: string;
  id?: string;
  campaignNumber?: string;
  festivalId: Festival | string;
  templateId?: string;
  name: string;
  channel: FestivalChannel;
  status: FestivalStatus;
  audienceSegment: AudienceSegment;
  audienceFilters?: Record<string, unknown>;
  offer: { type: string; title: string; value?: number; couponCode?: string; expiryDate?: string; bookingLink?: string; description?: string };
  scheduledAt?: string;
  recurring: 'none' | 'yearly';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  revenueGenerated: number;
  timeline?: Array<{ action: string; message?: string; createdAt: string }>;
}

export interface FestivalDelivery {
  _id?: string;
  id?: string;
  recipientName: string;
  recipientMasked: string;
  channel: FestivalChannel;
  status: 'pending' | 'queued' | 'sent' | 'delivered' | 'opened' | 'failed' | 'cancelled' | 'skipped';
  messagePreview?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedReason?: string;
  retryCount: number;
  createdAt?: string;
}

export interface FestivalDashboard {
  upcomingCampaigns: number;
  runningCampaigns: number;
  completedCampaigns: number;
  messagesSent: number;
  pendingMessages: number;
  failedMessages: number;
  deliveryRate: number;
  openRate: number;
  bookingConversion: number;
  revenueGenerated: number;
  automationHealth: string;
}

export interface FestivalAnalytics {
  deliverySuccess: number;
  failedMessages: number;
  audienceReach: number;
  campaignPerformance: Array<{ _id: string; reach: number; sent: number; failed: number }>;
  topFestivals: Array<{ _id: string; total: number }>;
  offerPerformance: Array<{ _id: string; campaigns: number; sent: number }>;
  monthlyTrends: Array<{ month: string; count: number }>;
}

export const entityId = (entity: { _id?: string; id?: string }) => entity.id || entity._id || '';

export const getFestivalDashboard = () => apiGet<FestivalDashboard>('/festival-campaigns/dashboard');
export const getFestivalAnalytics = (params?: Record<string, unknown>) => apiGet<FestivalAnalytics>('/festival-campaigns/analytics', params);
export const getFestivalSettings = () => apiGet<FestivalSettings>('/festival-campaigns/settings');
export const updateFestivalSettings = (payload: FestivalSettings) => apiPut<FestivalSettings>('/festival-campaigns/settings', payload);
export const pauseFestivalAutomation = () => apiPost<FestivalSettings>('/festival-campaigns/pause');
export const resumeFestivalAutomation = () => apiPost<FestivalSettings>('/festival-campaigns/resume');
export const retryFailedFestivalMessages = () => apiPost<{ retried: number }>('/festival-campaigns/retry-failed');
export const sendFestivalTest = (payload: Record<string, unknown>) => apiPost('/festival-campaigns/test-campaign', payload);
export const exportFestivals = () => apiGet<{ generatedAt: string; count: number; rows: unknown[] }>('/festival-campaigns/export');

export const getFestivals = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<Festival>>('/festival-campaigns/festivals', params);
export const createFestival = (payload: Partial<Festival>) => apiPost<Festival>('/festival-campaigns/festivals', payload);
export const updateFestival = (id: string, payload: Partial<Festival>) => apiPatch<Festival>(`/festival-campaigns/festivals/${id}`, payload);

export const getFestivalTemplates = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<FestivalTemplate>>('/festival-campaigns/templates', params);
export const createFestivalTemplate = (payload: Partial<FestivalTemplate>) => apiPost<FestivalTemplate>('/festival-campaigns/templates', payload);
export const updateFestivalTemplate = (id: string, payload: Partial<FestivalTemplate>) => apiPatch<FestivalTemplate>(`/festival-campaigns/templates/${id}`, payload);
export const deleteFestivalTemplate = (id: string) => apiDelete<void>(`/festival-campaigns/templates/${id}`);
export const duplicateFestivalTemplate = (id: string, name?: string) => apiPost<FestivalTemplate>(`/festival-campaigns/templates/${id}/duplicate`, { name });
export const previewFestivalTemplate = (id: string) => apiPost<{ subject: string; body: string; variables: string[] }>(`/festival-campaigns/templates/${id}/preview`);

export const getFestivalCampaigns = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<FestivalCampaign>>('/festival-campaigns/campaigns', params);
export const createFestivalCampaign = (payload: Record<string, unknown>) => apiPost<FestivalCampaign>('/festival-campaigns/campaigns', payload);
export const updateFestivalCampaign = (id: string, payload: Record<string, unknown>) => apiPatch<FestivalCampaign>(`/festival-campaigns/campaigns/${id}`, payload);
export const deleteFestivalCampaign = (id: string) => apiDelete<void>(`/festival-campaigns/campaigns/${id}`);
export const duplicateFestivalCampaign = (id: string) => apiPost<FestivalCampaign>(`/festival-campaigns/campaigns/${id}/duplicate`);
export const pauseFestivalCampaign = (id: string) => apiPost<FestivalCampaign>(`/festival-campaigns/campaigns/${id}/pause`);
export const resumeFestivalCampaign = (id: string) => apiPost<FestivalCampaign>(`/festival-campaigns/campaigns/${id}/resume`);
export const archiveFestivalCampaign = (id: string) => apiPost<FestivalCampaign>(`/festival-campaigns/campaigns/${id}/archive`);
export const cancelFestivalCampaign = (id: string) => apiPost<FestivalCampaign>(`/festival-campaigns/campaigns/${id}/cancel`);
export const previewFestivalRecipients = (payload: Record<string, unknown>) => apiPost<{ total: number; sample: Array<{ id: string; name: string; contact: string }> }>('/festival-campaigns/campaigns/preview-recipients', payload);
export const getFestivalHistory = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<FestivalDelivery>>('/festival-campaigns/history', params);
