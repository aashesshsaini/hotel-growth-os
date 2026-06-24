import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getBookings = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/bookings', params);
export const getBookingsById = (id: string) => apiGet<GenericEntity>(`/bookings/${id}`);
export const createBookings = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/bookings', payload);
export const updateBookings = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/bookings/${id}`, payload);
export const deleteBookings = (id: string) => apiDelete<void>(`/bookings/${id}`);
