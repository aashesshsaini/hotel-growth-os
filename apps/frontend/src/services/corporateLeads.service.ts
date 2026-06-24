import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getCorporateLeads = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/corporate-leads', params);
export const getCorporateLeadsById = (id: string) => apiGet<GenericEntity>(`/corporate-leads/${id}`);
export const createCorporateLeads = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/corporate-leads', payload);
export const updateCorporateLeads = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/corporate-leads/${id}`, payload);
export const deleteCorporateLeads = (id: string) => apiDelete<void>(`/corporate-leads/${id}`);
