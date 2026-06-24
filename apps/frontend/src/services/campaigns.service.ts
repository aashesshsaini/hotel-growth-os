import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getCampaigns = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/campaigns', params);
export const getCampaignsById = (id: string) => apiGet<GenericEntity>(`/campaigns/${id}`);
export const createCampaigns = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/campaigns', payload);
export const updateCampaigns = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/campaigns/${id}`, payload);
export const deleteCampaigns = (id: string) => apiDelete<void>(`/campaigns/${id}`);
