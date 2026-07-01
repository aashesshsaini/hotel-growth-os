import mongoose, { Document, Schema } from 'mongoose';
import { FestivalChannel, FESTIVAL_CHANNELS } from './FestivalTemplate';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const FESTIVAL_CAMPAIGN_STATUSES = ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'archived', 'failed'] as const;
export const FESTIVAL_AUDIENCE_SEGMENTS = ['all_guests', 'repeat_guests', 'vip_guests', 'inactive_guests', 'recent_guests', 'birthday_guests', 'anniversary_guests', 'referral_guests', 'custom'] as const;
export const FESTIVAL_OFFER_TYPES = ['percentage_discount', 'flat_discount', 'free_breakfast', 'free_upgrade', 'free_dinner', 'late_checkout', 'welcome_drink', 'coupon_code', 'package_offer', 'custom_offer'] as const;

export interface IFestivalTimelineItem {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface IFestivalCampaign extends Document {
  hotelId: mongoose.Types.ObjectId;
  campaignNumber: string;
  festivalId: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  name: string;
  channel: FestivalChannel;
  status: (typeof FESTIVAL_CAMPAIGN_STATUSES)[number];
  audienceSegment: (typeof FESTIVAL_AUDIENCE_SEGMENTS)[number];
  audienceFilters: Record<string, unknown>;
  offer: {
    type: (typeof FESTIVAL_OFFER_TYPES)[number];
    title: string;
    value?: number;
    couponCode?: string;
    expiryDate?: Date;
    bookingLink?: string;
    description?: string;
  };
  scheduledAt?: Date;
  recurring: 'none' | 'yearly';
  timezone: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  revenueGenerated: number;
  timeline: IFestivalTimelineItem[];
  launchedAt?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  archivedAt?: Date;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const festivalCampaignSchema = new Schema<IFestivalCampaign>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    campaignNumber: { type: String, required: true, trim: true, index: true },
    festivalId: { type: Schema.Types.ObjectId, ref: 'Festival', required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'FestivalTemplate' },
    name: { type: String, required: true, trim: true },
    channel: { type: String, enum: FESTIVAL_CHANNELS, default: 'whatsapp', index: true },
    status: { type: String, enum: FESTIVAL_CAMPAIGN_STATUSES, default: 'draft', index: true },
    audienceSegment: { type: String, enum: FESTIVAL_AUDIENCE_SEGMENTS, default: 'all_guests', index: true },
    audienceFilters: { type: Schema.Types.Mixed, default: {} },
    offer: {
      type: { type: String, enum: FESTIVAL_OFFER_TYPES, default: 'percentage_discount' },
      title: { type: String, required: true },
      value: Number,
      couponCode: String,
      expiryDate: Date,
      bookingLink: String,
      description: String,
    },
    scheduledAt: { type: Date, index: true },
    recurring: { type: String, enum: ['none', 'yearly'], default: 'none' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    recipientCount: { type: Number, default: 0, min: 0 },
    sentCount: { type: Number, default: 0, min: 0 },
    failedCount: { type: Number, default: 0, min: 0 },
    revenueGenerated: { type: Number, default: 0, min: 0 },
    timeline: [{
      action: { type: String, required: true },
      message: String,
      createdAt: { type: Date, default: Date.now },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      metadata: { type: Schema.Types.Mixed },
    }],
    launchedAt: Date,
    pausedAt: Date,
    resumedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    archivedAt: Date,
    ...auditFields,
  },
  { timestamps: true }
);

festivalCampaignSchema.index({ hotelId: 1, status: 1, scheduledAt: 1 });
festivalCampaignSchema.index({ hotelId: 1, campaignNumber: 1 }, { unique: true });
festivalCampaignSchema.index({ name: 'text' });
festivalCampaignSchema.plugin(softDeletePlugin);

festivalCampaignSchema.pre('save', async function generateCampaignNumber(next) {
  if (this.campaignNumber) return next();
  const prefix = `FST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const count = await mongoose.models.FestivalCampaign.countDocuments(
    { hotelId: this.hotelId, campaignNumber: { $regex: `^${prefix}` } },
    { includeDeleted: true }
  );
  this.campaignNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  next();
});

export const FestivalCampaign = mongoose.model<IFestivalCampaign>('FestivalCampaign', festivalCampaignSchema);
