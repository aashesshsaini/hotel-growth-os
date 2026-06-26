import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  HousekeepingStats,
  HousekeepingTask,
  HousekeepingTaskFormData,
  ListParams,
  PaginatedResponse,
} from '@/types';

export const getHousekeepingTasks = async (params?: ListParams): Promise<PaginatedResponse<HousekeepingTask>> => {
  return apiGet<PaginatedResponse<HousekeepingTask>>('/housekeeping', params);
};

export const getHousekeepingStats = async (): Promise<HousekeepingStats> => {
  return apiGet<HousekeepingStats>('/housekeeping/stats');
};

export const getDailyHousekeepingSchedule = async (params?: { date?: string }): Promise<HousekeepingTask[]> => {
  return apiGet<HousekeepingTask[]>('/housekeeping/schedule', params);
};

export const getHousekeepingTaskById = async (id: string): Promise<HousekeepingTask> => {
  return apiGet<HousekeepingTask>(`/housekeeping/${id}`);
};

export const createHousekeepingTask = async (payload: HousekeepingTaskFormData): Promise<HousekeepingTask> => {
  return apiPost<HousekeepingTask>('/housekeeping', payload);
};

export const updateHousekeepingTask = async (
  id: string,
  payload: Partial<HousekeepingTaskFormData>
): Promise<HousekeepingTask> => {
  return apiPatch<HousekeepingTask>(`/housekeeping/${id}`, payload);
};

export const assignHousekeepingTask = async (
  id: string,
  assignedTo: string,
  notes?: string
): Promise<HousekeepingTask> => {
  return apiPatch<HousekeepingTask>(`/housekeeping/${id}/assign`, { assignedTo, notes });
};

export const updateHousekeepingTaskStatus = async (
  id: string,
  payload: { status: string; notes?: string; rejectionReason?: string; actualMinutes?: number }
): Promise<HousekeepingTask> => {
  return apiPatch<HousekeepingTask>(`/housekeeping/${id}/status`, payload);
};

export const deleteHousekeepingTask = async (id: string): Promise<void> => {
  return apiDelete<void>(`/housekeeping/${id}`);
};
