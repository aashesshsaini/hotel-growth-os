import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import type { ListParams, PaginatedResponse } from '@/types';

export type ReviewRequestStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'RATED' | 'NEEDS_RECOVERY' | 'GOOGLE_REDIRECTED' | 'REVIEWED' | 'FAILED' | 'EXPIRED';
export type ReviewRecoveryStatus = 'NEEDS_RECOVERY' | 'ASSIGNED' | 'CONTACTED' | 'RESOLVED' | 'ELIGIBLE_FOR_REVIEW' | 'RECOVERED';
export type FeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type ReviewPlatform = 'GOOGLE' | 'TRIPADVISOR' | 'BOOKING_COM' | 'FACEBOOK';

export interface ReviewGrowthDashboard {
  averageRating: number;
  totalReviews: number;
  reviewsThisMonth: number;
  reviewRequestsSent: number;
  pendingRequests: number;
  todaysRequests?: number;
  privateRatingsReceived?: number;
  positiveGuests?: number;
  negativeGuests?: number;
  googleRedirected?: number;
  reviewsCompleted?: number;
  needsRecovery?: number;
  averagePrivateRating?: number;
  reviewConversion: number;
  negativeFeedbackCount: number;
  estimatedReviewGrowth: number;
  monthlyTrend: Array<{ month: string; count: number; averageRating: number }>;
  ratingDistribution: Record<string, number>;
  recentReviews: GuestReview[];
}

export interface ReviewCampaign {
  _id?: string;
  id?: string;
  campaignNumber?: string;
  name: string;
  description?: string;
  trigger: 'BOOKING_COMPLETED' | 'CHECKOUT' | 'MANUAL';
  isActive: boolean;
  delayMinutes: number;
  stats?: Record<string, number>;
  timeline?: TimelineItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewRequest {
  _id?: string;
  id?: string;
  guestId?: unknown;
  bookingId?: unknown;
  campaignId?: unknown;
  status: ReviewRequestStatus;
  channel: 'whatsapp' | 'sms' | 'email';
  privateRating?: number;
  privateRatingSubmittedAt?: string;
  satisfactionOutcome?: 'positive' | 'negative';
  recoveryStatus?: ReviewRecoveryStatus;
  googleRedirectedAt?: string;
  googleReviewSubmittedAt?: string;
  internalFeedbackId?: unknown;
  recipientPhone?: string;
  recipientEmail?: string;
  sentAt?: string;
  deliveredAt?: string;
  reviewedAt?: string;
  failedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  timeline?: TimelineItem[];
}

export interface GuestReview {
  _id?: string;
  id?: string;
  guestId?: unknown;
  bookingId?: unknown;
  platform: ReviewPlatform;
  rating: number;
  comment?: string;
  reviewerName?: string;
  sentiment?: string;
  reviewedAt?: string;
  createdAt?: string;
}

export interface InternalFeedback {
  _id?: string;
  id?: string;
  guestId?: unknown;
  bookingId?: unknown;
  rating?: number;
  category?: string;
  feedback: string;
  status: FeedbackStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: unknown;
  resolutionNotes?: string;
  timeline?: TimelineItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewTemplate {
  _id?: string;
  id?: string;
  name: string;
  platform: ReviewPlatform;
  channel: 'whatsapp' | 'sms' | 'email';
  subject?: string;
  body: string;
  variables?: string[];
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewSettings {
  _id?: string;
  id?: string;
  isEnabled?: boolean;
  defaultPlatform?: ReviewPlatform;
  googleReviewUrl?: string;
  defaultDelayMinutes?: number;
  reminderDelayMinutes?: number;
  recoveryDelayMinutes?: number;
  requestExpiryDays?: number;
  autoSendOnCheckout?: boolean;
  autoSendOnBookingCompleted?: boolean;
  positiveRatingThreshold?: number;
  negativeRatingThreshold?: number;
  channels?: { whatsapp?: boolean; sms?: boolean; email?: boolean };
  notificationUserIds?: string[];
}

export interface TimelineItem {
  action: string;
  message?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ReviewAnalytics {
  monthlyReviews: Array<{ _id: string; count: number }>;
  ratingTrend: Array<{ _id: string; averageRating: number }>;
  conversion: Array<{ _id: string; count: number }>;
  topGuests: Array<{ guestId: string; guestName: string; averageRating: number; totalReviews: number }>;
  lowRating: Array<{ _id: number; count: number; tags?: string[][] }>;
  campaignPerformance: Array<{ campaignId?: string; campaignName?: string; requests: number; reviewed: number; failed: number }>;
  sourceDistribution: Array<{ _id: string; count: number }>;
  requestPerformance: Array<{ _id: string; count: number }>;
  satisfactionMetrics?: {
    positivePercent: number;
    negativePercent: number;
    averagePrivateRating: number;
    googleRedirectRate: number;
    internalFeedbackRate: number;
    reviewCompletionRate: number;
  };
}

export const entityId = (entity: { _id?: string; id?: string }) => entity.id || entity._id || '';

export const getReviewGrowthDashboard = (params?: Record<string, unknown>) => apiGet<ReviewGrowthDashboard>('/review-growth/dashboard', params);
export const getReviewGrowthAnalytics = (params?: Record<string, unknown>) => apiGet<ReviewAnalytics>('/review-growth/analytics', params);

export const getReviewCampaigns = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<ReviewCampaign>>('/review-growth/campaigns', params);
export const getReviewCampaign = (id: string) => apiGet<ReviewCampaign>(`/review-growth/campaigns/${id}`);
export const createReviewCampaign = (payload: Partial<ReviewCampaign>) => apiPost<ReviewCampaign>('/review-growth/campaigns', payload);
export const updateReviewCampaign = (id: string, payload: Partial<ReviewCampaign>) => apiPatch<ReviewCampaign>(`/review-growth/campaigns/${id}`, payload);
export const deleteReviewCampaign = (id: string) => apiDelete<void>(`/review-growth/campaigns/${id}`);
export const enableReviewCampaign = (id: string) => apiPost<ReviewCampaign>(`/review-growth/campaigns/${id}/enable`);
export const disableReviewCampaign = (id: string) => apiPost<ReviewCampaign>(`/review-growth/campaigns/${id}/disable`);

export const getReviewRequest = (id: string) => apiGet<ReviewRequest>(`/review-growth/requests/${id}`);
export const getReviewRequestHistory = (id: string) => apiGet<{ timeline?: TimelineItem[] }>(`/review-growth/requests/${id}/history`);
export const getReviewRequests = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<ReviewRequest>>('/review-growth/requests', params);
export const createReviewRequest = (payload: Record<string, unknown>) => apiPost<ReviewRequest>('/review-growth/requests', payload);
export const sendReviewRequest = (id: string) => apiPost<ReviewRequest>(`/review-growth/requests/${id}/send`, {});
export const resendReviewRequest = (id: string) => apiPost<ReviewRequest>(`/review-growth/requests/${id}/resend`, {});
export const cancelReviewRequest = (id: string, reason?: string) => apiPost<ReviewRequest>(`/review-growth/requests/${id}/cancel`, { reason });

export const getInternalFeedback = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<InternalFeedback>>('/review-growth/feedback', params);
export const assignFeedback = (id: string, assignedTo: string) => apiPost<InternalFeedback>(`/review-growth/feedback/${id}/assign`, { assignedTo });
export const updateFeedbackStatus = (id: string, status: FeedbackStatus, resolutionNotes?: string) => apiPatch<InternalFeedback>(`/review-growth/feedback/${id}/status`, { status, resolutionNotes });
export const resolveFeedback = (id: string, resolutionNotes?: string) => apiPost<InternalFeedback>(`/review-growth/feedback/${id}/resolve`, { status: 'RESOLVED', resolutionNotes });

export const getReviewTemplates = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<ReviewTemplate>>('/review-growth/templates', params);
export const createReviewTemplate = (payload: Partial<ReviewTemplate>) => apiPost<ReviewTemplate>('/review-growth/templates', payload);
export const updateReviewTemplate = (id: string, payload: Partial<ReviewTemplate>) => apiPatch<ReviewTemplate>(`/review-growth/templates/${id}`, payload);
export const deleteReviewTemplate = (id: string) => apiDelete<void>(`/review-growth/templates/${id}`);
export const duplicateReviewTemplate = (id: string, name?: string) => apiPost<ReviewTemplate>(`/review-growth/templates/${id}/duplicate`, { name });
export const setDefaultReviewTemplate = (id: string) => apiPost<ReviewTemplate>(`/review-growth/templates/${id}/set-default`);

export const getReviewSettings = () => apiGet<ReviewSettings>('/review-growth/settings');
export const updateReviewSettings = (payload: ReviewSettings) => apiPut<ReviewSettings>('/review-growth/settings', payload);
