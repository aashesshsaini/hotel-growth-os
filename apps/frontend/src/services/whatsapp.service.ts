import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getWhatsapp = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/whatsapp', params);
export const getWhatsappById = (id: string) => apiGet<GenericEntity>(`/whatsapp/${id}`);
export const createWhatsapp = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/whatsapp', payload);
export const updateWhatsapp = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/whatsapp/${id}`, payload);
export const deleteWhatsapp = (id: string) => apiDelete<void>(`/whatsapp/${id}`);
