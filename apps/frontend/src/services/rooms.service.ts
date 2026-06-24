import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  AvailableRoom,
  BulkRoomFormData,
  ListParams,
  PaginatedResponse,
  Room,
  RoomFormData,
  RoomStats,
} from '@/types';

export const getRooms = async (params?: ListParams): Promise<PaginatedResponse<Room>> => {
  return apiGet<PaginatedResponse<Room>>('/rooms', params);
};

export const getRoomStats = async (): Promise<RoomStats> => {
  return apiGet<RoomStats>('/rooms/stats');
};

export const getRoomById = async (id: string): Promise<Room> => {
  return apiGet<Room>(`/rooms/${id}`);
};

export const createRoom = async (payload: RoomFormData): Promise<Room> => {
  return apiPost<Room>('/rooms', payload);
};

export const bulkCreateRooms = async (payload: BulkRoomFormData) => {
  return apiPost<{ created: number; skipped: number; rooms: Room[] }>('/rooms/bulk', payload);
};

export const updateRoom = async (id: string, payload: Partial<RoomFormData>): Promise<Room> => {
  return apiPatch<Room>(`/rooms/${id}`, payload);
};

export const updateRoomStatus = async (
  id: string,
  status: string,
  notes?: string,
  allowManualOccupied?: boolean
): Promise<Room> => {
  return apiPatch<Room>(`/rooms/${id}/status`, { status, notes, allowManualOccupied });
};

export const bulkUpdateRoomStatus = async (roomIds: string[], status: string, notes?: string) => {
  return apiPatch<{ updated: number }>('/rooms/bulk/status', { roomIds, status, notes });
};

export const deleteRoom = async (id: string): Promise<void> => {
  return apiDelete<void>(`/rooms/${id}`);
};

export const getAvailableRooms = async (params: {
  checkInDate: string;
  checkOutDate: string;
  roomTypeId?: string;
  numberOfGuests?: number;
  numberOfRooms?: number;
}): Promise<AvailableRoom[]> => {
  return apiGet<AvailableRoom[]>('/rooms/available', params);
};

export const blockRoom = async (
  id: string,
  payload: { blockedReason: string; blockedFrom?: string; blockedTo?: string }
): Promise<Room> => {
  return apiPatch<Room>(`/rooms/${id}/block`, payload);
};

export const unblockRoom = async (id: string): Promise<Room> => {
  return apiPatch<Room>(`/rooms/${id}/unblock`, {});
};

export const markRoomMaintenance = async (
  id: string,
  maintenanceStatus: string,
  notes?: string
): Promise<Room> => {
  return apiPatch<Room>(`/rooms/${id}/maintenance`, { maintenanceStatus, notes });
};

export const updateHousekeepingStatus = async (
  id: string,
  housekeepingStatus: string,
  notes?: string
): Promise<Room> => {
  return apiPatch<Room>(`/rooms/${id}/housekeeping`, { housekeepingStatus, notes });
};
