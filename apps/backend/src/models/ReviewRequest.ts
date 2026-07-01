import mongoose, { Document, Schema } from 'mongoose';
import { REVIEW_REQUEST_STATUSES, ReviewPlatform, ReviewRequestStatus, REVIEW_PLATFORMS } from '@hotel-growth-os/shared';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';
import { IReviewGrowthTimelineEntry } from './ReviewCampaign';

export interface IReviewRequest extends Document {
  hotelId: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  reviewId?: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  platform: ReviewPlatform;
  status: ReviewRequestStatus;
  channel: 'whatsapp' | 'sms' | 'email';
  recipientPhone?: string;
  recipientEmail?: string;
  scheduledAt?: Date;
  queuedAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  reviewedAt?: Date;
  failedAt?: Date;
  expiredAt?: Date;
  failureReason?: string;
  publicToken: string;
  reviewUrl?: string;
  metadata?: Record<string, unknown>;
  timeline: IReviewGrowthTimelineEntry[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const timelineSchema = new Schema<IReviewGrowthTimelineEntry>(
  {
    action: { type: String, required: true },
    message: String,
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const phoneValidator = (value?: string) => !value || /^\+?[1-9]\d{7,14}$/.test(value.replace(/\s+/g, ''));
const emailValidator = (value?: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const reviewRequestSchema = new Schema<IReviewRequest>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'ReviewCampaign', index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
    templateId: { type: Schema.Types.ObjectId, ref: 'ReviewTemplate' },
    platform: { type: String, enum: REVIEW_PLATFORMS, default: 'GOOGLE', index: true },
    status: { type: String, enum: REVIEW_REQUEST_STATUSES, default: 'PENDING', index: true },
    channel: { type: String, enum: ['whatsapp', 'sms', 'email'], default: 'whatsapp', index: true },
    recipientPhone: { type: String, trim: true, validate: { validator: phoneValidator, message: 'Invalid phone number' } },
    recipientEmail: { type: String, lowercase: true, trim: true, validate: { validator: emailValidator, message: 'Invalid email address' } },
    scheduledAt: { type: Date, index: true },
    queuedAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,
    reviewedAt: Date,
    failedAt: Date,
    expiredAt: Date,
    failureReason: String,
    publicToken: { type: String, required: true, unique: true, index: true },
    reviewUrl: { type: String },
    metadata: { type: Schema.Types.Mixed },
    timeline: { type: [timelineSchema], default: [] },
    ...auditFields,
  },
  { timestamps: true }
);

reviewRequestSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
reviewRequestSchema.index({ hotelId: 1, bookingId: 1 });
reviewRequestSchema.index({ hotelId: 1, guestId: 1, createdAt: -1 });
reviewRequestSchema.index({ hotelId: 1, campaignId: 1, status: 1 });
reviewRequestSchema.index({ hotelId: 1, platform: 1, status: 1 });
reviewRequestSchema.plugin(softDeletePlugin);

export const ReviewRequest = mongoose.model<IReviewRequest>('ReviewRequest', reviewRequestSchema);
