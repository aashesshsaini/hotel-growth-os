import mongoose, { Document, Schema } from 'mongoose';
import { REVIEW_GROWTH_CAMPAIGN_TRIGGERS, ReviewGrowthCampaignTrigger } from '@hotel-growth-os/shared';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IReviewGrowthTimelineEntry {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface IReviewCampaign extends Document {
  hotelId: mongoose.Types.ObjectId;
  campaignNumber: string;
  name: string;
  description?: string;
  trigger: ReviewGrowthCampaignTrigger;
  templateId?: mongoose.Types.ObjectId;
  settingsId?: mongoose.Types.ObjectId;
  isActive: boolean;
  delayMinutes: number;
  audienceFilters?: {
    guestTags?: string[];
    bookingStatuses?: string[];
    minRating?: number;
    maxRating?: number;
  };
  stats: {
    queued: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    reviewed: number;
    failed: number;
  };
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

const reviewCampaignSchema = new Schema<IReviewCampaign>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    campaignNumber: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    trigger: { type: String, enum: REVIEW_GROWTH_CAMPAIGN_TRIGGERS, required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'ReviewTemplate' },
    settingsId: { type: Schema.Types.ObjectId, ref: 'ReviewSettings' },
    isActive: { type: Boolean, default: true, index: true },
    delayMinutes: { type: Number, default: 60, min: 0, max: 43200 },
    audienceFilters: {
      guestTags: [{ type: String }],
      bookingStatuses: [{ type: String }],
      minRating: { type: Number, min: 1, max: 5 },
      maxRating: { type: Number, min: 1, max: 5 },
    },
    stats: {
      queued: { type: Number, default: 0, min: 0 },
      sent: { type: Number, default: 0, min: 0 },
      delivered: { type: Number, default: 0, min: 0 },
      opened: { type: Number, default: 0, min: 0 },
      clicked: { type: Number, default: 0, min: 0 },
      reviewed: { type: Number, default: 0, min: 0 },
      failed: { type: Number, default: 0, min: 0 },
    },
    timeline: { type: [timelineSchema], default: [] },
    ...auditFields,
  },
  { timestamps: true }
);

reviewCampaignSchema.index({ hotelId: 1, campaignNumber: 1 }, { unique: true });
reviewCampaignSchema.index({ hotelId: 1, trigger: 1, isActive: 1 });
reviewCampaignSchema.index({ hotelId: 1, createdAt: -1 });
reviewCampaignSchema.index({ name: 'text', description: 'text' });
reviewCampaignSchema.plugin(softDeletePlugin);

reviewCampaignSchema.pre('validate', async function generateCampaignNumber(next) {
  if (this.campaignNumber) return next();
  const prefix = `RGC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const count = await mongoose.models.ReviewCampaign.countDocuments(
    {
      hotelId: this.hotelId,
      campaignNumber: { $regex: `^${prefix}` },
    },
    { includeDeleted: true }
  );
  this.campaignNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  next();
});

export const ReviewCampaign = mongoose.model<IReviewCampaign>('ReviewCampaign', reviewCampaignSchema);
