import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { FollowUp, FollowUpFormData, FollowUpStats, GenericEntity, ListParams, PaginatedResponse } from '@/types';

export const getTasks = (params?: ListParams) => apiGet<PaginatedResponse<FollowUp>>('/tasks', params);
export const getTaskById = (id: string) => apiGet<FollowUp>(`/tasks/${id}`);
export const getTaskStats = () => apiGet<FollowUpStats>('/tasks/stats');
export const createTask = (payload: FollowUpFormData | Record<string, unknown>) => apiPost<FollowUp>('/tasks', payload);
export const updateTask = (id: string, payload: Partial<FollowUpFormData> | Record<string, unknown>) => apiPatch<FollowUp>(`/tasks/${id}`, payload);
export const deleteTask = (id: string) => apiDelete<void>(`/tasks/${id}`);
export const assignTask = (id: string, assignedTo: string, notes?: string) => apiPatch<FollowUp>(`/tasks/${id}/assign`, { assignedTo, notes });
export const updateTaskStatus = (id: string, payload: { status: string; notes?: string; outcome?: string }) => apiPatch<FollowUp>(`/tasks/${id}/status`, payload);
export const rescheduleTask = (id: string, payload: { dueDate: string; reminderAt?: string; notes?: string }) => apiPatch<FollowUp>(`/tasks/${id}/reschedule`, payload);
export const addTaskNote = (id: string, note: string) => apiPatch<FollowUp>(`/tasks/${id}/notes`, { note });
export type TaskEntity = GenericEntity;
