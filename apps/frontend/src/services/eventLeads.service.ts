import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getEventLeads = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/event-leads', params);
export const getEventLeadsById = (id: string) => apiGet<GenericEntity>(`/event-leads/${id}`);
export const createEventLeads = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/event-leads', payload);
export const updateEventLeads = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/event-leads/${id}`, payload);
export const deleteEventLeads = (id: string) => apiDelete<void>(`/event-leads/${id}`);
