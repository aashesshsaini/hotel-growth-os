import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { ListParams, PaginatedResponse, Review, ReviewStats } from '@/types';

export const getReviewStats = () => apiGet<ReviewStats>('/reviews/stats');
export const getReviews = (params?: ListParams) => apiGet<PaginatedResponse<Review>>('/reviews', params);
export const getReviewById = (id: string) => apiGet<Review>(`/reviews/${id}`);
export const createReview = (payload: Record<string, unknown>) => apiPost<Review>('/reviews', payload);
export const updateReview = (id: string, payload: Record<string, unknown>) => apiPatch<Review>(`/reviews/${id}`, payload);
export const deleteReview = (id: string) => apiDelete<void>(`/reviews/${id}`);
export const requestReview = (payload: { bookingId: string; guestId?: string; requestChannel?: string; sendNow?: boolean }) =>
  apiPost<Review>('/reviews/request', payload);
export const sendReviewRequest = (id: string) => apiPost<Review>(`/reviews/${id}/send-request`);
export const replyToReview = (id: string, payload: { managerReply: string }) => apiPost<Review>(`/reviews/${id}/reply`, payload);
export const escalateReview = (id: string, payload?: { assignedTo?: string; note?: string }) => apiPost<Review>(`/reviews/${id}/escalate`, payload ?? {});
export const resolveReview = (id: string, payload?: { note?: string }) => apiPost<Review>(`/reviews/${id}/resolve`, payload ?? {});
export const notifyManagerReview = (id: string) => apiPost<Review>(`/reviews/${id}/notify-manager`);
export const sendGoogleReviewLink = (id: string) => apiPost<Review>(`/reviews/${id}/send-google-link`);
export const addReviewNote = (id: string, payload: { text: string }) => apiPatch<Review>(`/reviews/${id}/notes`, payload);

// Backward-compatible aliases
export const getReviewsById = getReviewById;
export const createReviews = createReview;
export const updateReviews = updateReview;
export const deleteReviews = deleteReview;
