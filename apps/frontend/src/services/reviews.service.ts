import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getReviews = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/reviews', params);
export const getReviewsById = (id: string) => apiGet<GenericEntity>(`/reviews/${id}`);
export const createReviews = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/reviews', payload);
export const updateReviews = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/reviews/${id}`, payload);
export const deleteReviews = (id: string) => apiDelete<void>(`/reviews/${id}`);
