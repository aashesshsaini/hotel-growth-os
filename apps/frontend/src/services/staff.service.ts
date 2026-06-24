import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { ListParams, PaginatedResponse, Staff, StaffFormData, StaffStats } from '@/types';

export const listStaff = async (params?: ListParams): Promise<PaginatedResponse<Staff>> => {
  return apiGet<PaginatedResponse<Staff>>('/staff', params);
};

export const getStaffStats = async (): Promise<StaffStats> => {
  return apiGet<StaffStats>('/staff/stats');
};

export const getStaffById = async (id: string): Promise<Staff> => {
  return apiGet<Staff>(`/staff/${id}`);
};

export const createStaff = async (payload: StaffFormData): Promise<Staff> => {
  return apiPost<Staff>('/staff', payload);
};

export const updateStaff = async (id: string, payload: Partial<StaffFormData>): Promise<Staff> => {
  return apiPatch<Staff>(`/staff/${id}`, payload);
};

export const updateStaffStatus = async (
  id: string,
  status: string,
  reason?: string
): Promise<Staff> => {
  return apiPatch<Staff>(`/staff/${id}/status`, { status, reason });
};

export const updateStaffPermissions = async (
  id: string,
  permissions: string[]
): Promise<Staff> => {
  return apiPatch<Staff>(`/staff/${id}/permissions`, { permissions });
};

export const deleteStaff = async (id: string): Promise<void> => {
  return apiDelete<void>(`/staff/${id}`);
};

export const reassignStaff = async (id: string, payload: Record<string, unknown>): Promise<Staff> => {
  return apiPatch<Staff>(`/staff/${id}/reassign`, payload);
};

export const staffService = {
  list: listStaff,
  getById: getStaffById,
  create: createStaff,
  update: updateStaff,
  remove: deleteStaff,
  getStats: getStaffStats,
  updateStatus: updateStaffStatus,
  updatePermissions: updateStaffPermissions,
  reassign: reassignStaff,
};
