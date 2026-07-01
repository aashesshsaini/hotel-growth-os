import mongoose, { Document, Schema } from 'mongoose';
import { REVIEW_PLATFORMS, ReviewPlatform } from '@hotel-growth-os/shared';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';
import { IReviewGrowthTimelineEntry } from './ReviewCampaign';

export interface IGuestReview extends Document {
  hotelId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  reviewRequestId?: mongoose.Types.ObjectId;
  internalReviewId?: mongoose.Types.ObjectId;
  platform: ReviewPlatform;
  externalReviewId?: string;
  rating: number;
  title?: string;
  comment?: string;
  reviewerName?: string;
  reviewUrl?: string;
  reviewedAt: Date;
  respondedAt?: Date;
  responseText?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
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

const guestReviewSchema = new Schema<IGuestReview>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    reviewRequestId: { type: Schema.Types.ObjectId, ref: 'ReviewRequest', index: true },
    internalReviewId: { type: Schema.Types.ObjectId, ref: 'Review' },
    platform: { type: String, enum: REVIEW_PLATFORMS, default: 'GOOGLE', index: true },
    externalReviewId: { type: String, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5, index: true },
    title: { type: String, trim: true },
    comment: String,
    reviewerName: { type: String, trim: true },
    reviewUrl: String,
    reviewedAt: { type: Date, default: Date.now, index: true },
    respondedAt: Date,
    responseText: String,
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'positive', index: true },
    tags: [{ type: String }],
    timeline: { type: [timelineSchema], default: [] },
    ...auditFields,
  },
  { timestamps: true }
);

guestReviewSchema.index({ hotelId: 1, rating: 1, reviewedAt: -1 });
guestReviewSchema.index({ hotelId: 1, platform: 1, reviewedAt: -1 });
guestReviewSchema.index({ hotelId: 1, guestId: 1, reviewedAt: -1 });
guestReviewSchema.index({ hotelId: 1, bookingId: 1 });
guestReviewSchema.index({ hotelId: 1, externalReviewId: 1, platform: 1 }, { sparse: true });
guestReviewSchema.plugin(softDeletePlugin);

guestReviewSchema.pre('validate', function deriveSentiment(next) {
  if (this.rating >= 4) this.sentiment = 'positive';
  else if (this.rating === 3) this.sentiment = 'neutral';
  else this.sentiment = 'negative';
  next();
});

export const GuestReview = mongoose.model<IGuestReview>('GuestReview', guestReviewSchema);
