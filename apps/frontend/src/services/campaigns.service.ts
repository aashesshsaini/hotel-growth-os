import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { Campaign, CampaignAudiencePreview, CampaignFormData, CampaignLog, CampaignStats, ListParams, PaginatedResponse } from '@/types';

export const getCampaigns = (params?: ListParams) =>
  apiGet<PaginatedResponse<Campaign>>('/campaigns', params);

export const getCampaignById = (id: string) => apiGet<Campaign>(`/campaigns/${id}`);

export const getCampaignStats = () => apiGet<CampaignStats>('/campaigns/stats');

export const createCampaign = (payload: CampaignFormData) => apiPost<Campaign>('/campaigns', payload);

export const updateCampaign = (id: string, payload: Partial<CampaignFormData>) =>
  apiPatch<Campaign>(`/campaigns/${id}`, payload);

export const deleteCampaign = (id: string) => apiDelete<void>(`/campaigns/${id}`);

export const updateCampaignStatus = (id: string, payload: { status: string; notes?: string }) =>
  apiPatch<Campaign>(`/campaigns/${id}/status`, payload);

export const addCampaignNote = (id: string, payload: { text: string }) =>
  apiPatch<Campaign>(`/campaigns/${id}/notes`, payload);

export const previewCampaignAudience = (id: string) =>
  apiGet<CampaignAudiencePreview>(`/campaigns/${id}/audience-preview`);

export const getCampaignLogs = (id: string, params?: ListParams) =>
  apiGet<PaginatedResponse<CampaignLog>>(`/campaigns/${id}/logs`, params);

export const launchCampaign = (id: string, payload?: { dryRun?: boolean }) =>
  apiPost<Campaign>(`/campaigns/${id}/launch`, payload ?? {});

export const pauseCampaign = (id: string) => apiPost<Campaign>(`/campaigns/${id}/pause`, {});

export const cancelCampaign = (id: string) => apiPost<Campaign>(`/campaigns/${id}/cancel`, {});

export const completeCampaign = (id: string) => apiPost<Campaign>(`/campaigns/${id}/complete`, {});

// Backward-compatible aliases
export const getCampaignsById = getCampaignById;
export const createCampaigns = createCampaign;
export const updateCampaigns = updateCampaign;
export const deleteCampaigns = deleteCampaign;
