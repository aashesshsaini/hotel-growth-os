import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';

export const getTasks = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/tasks', params);
export const getTaskById = (id: string) => apiGet<GenericEntity>(`/tasks/${id}`);
export const createTask = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/tasks', payload);
export const updateTask = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/tasks/${id}`, payload);
export const deleteTask = (id: string) => apiDelete<void>(`/tasks/${id}`);
