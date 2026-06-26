import { IReview } from '../../models/Review';

export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface SanitizedReview extends Record<string, unknown> {
  id: string;
  reviewNumber?: string;
  hotelId: string;
  bookingId: unknown;
  guestId: unknown;
  status: string;
  source: string;
  requestChannel?: string;
  rating?: number;
  staffRating?: number;
  departmentRatings?: IReview['departmentRatings'];
  feedback?: string;
  isPositive: boolean;
  sentimentTags: string[];
  googleReviewSent: boolean;
  managerNotified: boolean;
  managerReply?: string;
  repliedAt?: Date;
  requestSentAt?: Date;
  submittedAt?: Date;
  escalatedAt?: Date;
  resolvedAt?: Date;
  internalNotes?: string;
  notes: IReview['notes'];
  timeline: IReview['timeline'];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewStatsResult {
  totalReviews: number;
  submittedReviews: number;
  pendingRequests: number;
  requestedReviews: number;
  negativeReviews: number;
  positiveReviews: number;
  averageRating: number;
  reputationScore: number;
  newReviewsThisMonth: number;
  responseRate: number;
  googleReviewSentCount: number;
  ratingDistribution: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  recentTrend: { month: string; count: number; averageRating: number }[];
}
