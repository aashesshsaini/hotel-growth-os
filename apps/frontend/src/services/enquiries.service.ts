import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getEnquiries = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/enquiries', params);
export const getEnquiriesById = (id: string) => apiGet<GenericEntity>(`/enquiries/${id}`);
export const createEnquiries = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/enquiries', payload);
export const updateEnquiries = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/enquiries/${id}`, payload);
export const deleteEnquiries = (id: string) => apiDelete<void>(`/enquiries/${id}`);
