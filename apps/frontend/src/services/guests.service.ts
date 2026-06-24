import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  Guest,
  GuestFormData,
  GuestHistory,
  GuestStats,
  ListParams,
  PaginatedResponse,
} from '@/types';

export const getGuests = async (params?: ListParams): Promise<PaginatedResponse<Guest>> => {
  return apiGet<PaginatedResponse<Guest>>('/guests', params);
};

export const getGuestById = async (id: string, includeAudit = false): Promise<Guest> => {
  return apiGet<Guest>(`/guests/${id}`, includeAudit ? { includeAudit: 'true' } : undefined);
};

export const getGuestHistory = async (id: string): Promise<GuestHistory> => {
  return apiGet<GuestHistory>(`/guests/${id}/history`);
};

export const getGuestStats = async (): Promise<GuestStats> => {
  return apiGet<GuestStats>('/guests/stats');
};

export const createGuest = async (payload: GuestFormData): Promise<Guest> => {
  return apiPost<Guest>('/guests', payload);
};

export const updateGuest = async (id: string, payload: Partial<GuestFormData>): Promise<Guest> => {
  return apiPatch<Guest>(`/guests/${id}`, payload);
};

export const deleteGuest = async (id: string): Promise<void> => {
  return apiDelete<void>(`/guests/${id}`);
};

export const mergeGuests = async (primaryGuestId: string, duplicateGuestId: string) => {
  return apiPost<{ primaryGuest: Guest; mergedGuestId: string }>('/guests/merge', {
    primaryGuestId,
    duplicateGuestId,
  });
};

export const updateGuestPreferences = async (
  id: string,
  payload: {
    preferences?: string[];
    foodPreference?: string;
    roomPreference?: string;
    specialRequests?: string;
  }
): Promise<Guest> => {
  return apiPatch<Guest>(`/guests/${id}/preferences`, payload);
};

export const updateGuestTags = async (
  id: string,
  tags: string[],
  mode: 'replace' | 'add' | 'remove' = 'replace'
): Promise<Guest> => {
  return apiPatch<Guest>(`/guests/${id}/tags`, { tags, mode });
};

export const uploadGuestDocument = async (
  id: string,
  payload: { url: string; publicId?: string; documentType?: string }
): Promise<Guest> => {
  return apiPost<Guest>(`/guests/${id}/documents`, payload);
};

export const removeGuestDocument = async (id: string, documentId: string): Promise<Guest> => {
  return apiDelete<Guest>(`/guests/${id}/documents/${documentId}`);
};

export const blacklistGuest = async (id: string, reason: string): Promise<Guest> => {
  return apiPatch<Guest>(`/guests/${id}/blacklist`, { reason });
};

export const unblockGuest = async (id: string): Promise<Guest> => {
  return apiPatch<Guest>(`/guests/${id}/unblock`, {});
};
