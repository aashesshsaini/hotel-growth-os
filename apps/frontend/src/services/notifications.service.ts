import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';

export const getNotifications = (params?: ListParams) =>
  apiGet<PaginatedResponse<GenericEntity>>('/notifications', params);
export const getNotificationById = (id: string) => apiGet<GenericEntity>(`/notifications/${id}`);
export const createNotification = (payload: Record<string, unknown>) =>
  apiPost<GenericEntity>('/notifications', payload);
export const updateNotification = (id: string, payload: Record<string, unknown>) =>
  apiPatch<GenericEntity>(`/notifications/${id}`, payload);
export const deleteNotification = (id: string) => apiDelete<void>(`/notifications/${id}`);
