import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  ListParams,
  MaintenanceIssue,
  MaintenanceIssueFormData,
  MaintenanceStats,
  PaginatedResponse,
} from '@/types';

export const getMaintenanceIssues = async (params?: ListParams): Promise<PaginatedResponse<MaintenanceIssue>> => {
  return apiGet<PaginatedResponse<MaintenanceIssue>>('/maintenance', params);
};

export const getMaintenanceStats = async (): Promise<MaintenanceStats> => {
  return apiGet<MaintenanceStats>('/maintenance/stats');
};

export const getRoomMaintenanceHistory = async (roomId: string): Promise<MaintenanceIssue[]> => {
  return apiGet<MaintenanceIssue[]>('/maintenance/room-history', { roomId });
};

export const getMaintenanceIssueById = async (id: string): Promise<MaintenanceIssue> => {
  return apiGet<MaintenanceIssue>(`/maintenance/${id}`);
};

export const createMaintenanceIssue = async (payload: MaintenanceIssueFormData): Promise<MaintenanceIssue> => {
  return apiPost<MaintenanceIssue>('/maintenance', payload);
};

export const updateMaintenanceIssue = async (
  id: string,
  payload: Partial<MaintenanceIssueFormData>
): Promise<MaintenanceIssue> => {
  return apiPatch<MaintenanceIssue>(`/maintenance/${id}`, payload);
};

export const assignMaintenanceIssue = async (
  id: string,
  assignedTo: string,
  notes?: string
): Promise<MaintenanceIssue> => {
  return apiPatch<MaintenanceIssue>(`/maintenance/${id}/assign`, { assignedTo, notes });
};

export const updateMaintenanceIssueStatus = async (
  id: string,
  payload: { status: string; notes?: string; resolutionNotes?: string; holdReason?: string; actualCost?: number }
): Promise<MaintenanceIssue> => {
  return apiPatch<MaintenanceIssue>(`/maintenance/${id}/status`, payload);
};

export const deleteMaintenanceIssue = async (id: string): Promise<void> => {
  return apiDelete<void>(`/maintenance/${id}`);
};
