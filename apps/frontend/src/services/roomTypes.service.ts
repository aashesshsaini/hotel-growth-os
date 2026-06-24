import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  ListParams,
  PaginatedResponse,
  RoomType,
  RoomTypeFormData,
  RoomTypeImage,
  RoomTypeStats,
} from '@/types';

export const getRoomTypes = async (params?: ListParams): Promise<PaginatedResponse<RoomType>> => {
  return apiGet<PaginatedResponse<RoomType>>('/room-types', params);
};

export const getRoomTypeStats = async (): Promise<RoomTypeStats> => {
  return apiGet<RoomTypeStats>('/room-types/stats');
};

export const getRoomTypeById = async (id: string): Promise<RoomType> => {
  return apiGet<RoomType>(`/room-types/${id}`);
};

export const createRoomType = async (payload: RoomTypeFormData): Promise<RoomType> => {
  return apiPost<RoomType>('/room-types', payload);
};

export const updateRoomType = async (id: string, payload: Partial<RoomTypeFormData>): Promise<RoomType> => {
  return apiPatch<RoomType>(`/room-types/${id}`, payload);
};

export const updateRoomTypeStatus = async (
  id: string,
  status: string,
  reason?: string
): Promise<RoomType> => {
  return apiPatch<RoomType>(`/room-types/${id}/status`, { status, reason });
};

export const updateRoomTypePricing = async (
  id: string,
  payload: Partial<RoomTypeFormData>
): Promise<RoomType> => {
  return apiPatch<RoomType>(`/room-types/${id}/pricing`, payload);
};

export const updateRoomTypeAmenities = async (
  id: string,
  payload: { amenities?: string[]; facilities?: string[] }
): Promise<RoomType> => {
  return apiPatch<RoomType>(`/room-types/${id}/amenities`, payload);
};

export const uploadRoomTypeImages = async (
  id: string,
  images: Array<{ url: string; altText?: string; sortOrder?: number }>,
  setCoverImageUrl?: string
): Promise<RoomType> => {
  return apiPost<RoomType>(`/room-types/${id}/images`, { images, setCoverImageUrl });
};

export const removeRoomTypeImage = async (id: string, imageId: string): Promise<RoomType> => {
  return apiDelete<RoomType>(`/room-types/${id}/images/${imageId}`);
};

export const deleteRoomType = async (id: string): Promise<void> => {
  return apiDelete<void>(`/room-types/${id}`);
};

export const getPublicRoomTypes = async (hotelSlug: string): Promise<RoomType[]> => {
  return apiGet<RoomType[]>(`/room-types/public/${hotelSlug}`);
};

export type { RoomTypeImage };
