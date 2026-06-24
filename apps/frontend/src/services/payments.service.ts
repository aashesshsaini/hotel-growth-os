import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getPayments = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/payments', params);
export const getPaymentsById = (id: string) => apiGet<GenericEntity>(`/payments/${id}`);
export const createPayments = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/payments', payload);
export const updatePayments = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/payments/${id}`, payload);
export const deletePayments = (id: string) => apiDelete<void>(`/payments/${id}`);
