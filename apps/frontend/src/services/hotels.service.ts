import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getHotels = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/hotels', params);
export const getHotelsById = (id: string) => apiGet<GenericEntity>(`/hotels/${id}`);
export const createHotels = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/hotels', payload);
export const updateHotels = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/hotels/${id}`, payload);
export const deleteHotels = (id: string) => apiDelete<void>(`/hotels/${id}`);
