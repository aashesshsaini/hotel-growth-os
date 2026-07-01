import mongoose, { Document, Schema } from 'mongoose';
import { ComebackChannel, COMEBACK_CHANNELS } from './ComebackTemplate';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const COMEBACK_CAMPAIGN_STATUSES = ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'archived', 'failed'] as const;
export const COMEBACK_OFFER_TYPES = ['flat_discount', 'percentage_discount', 'free_breakfast', 'free_upgrade', 'late_checkout', 'welcome_drink', 'package_deal', 'coupon_code', 'custom_offer'] as const;

export interface IComebackCampaign extends Document {
  hotelId: mongoose.Types.ObjectId;
  campaignNumber: string;
  templateId?: mongoose.Types.ObjectId;
  name: string;
  channel: ComebackChannel;
  status: (typeof COMEBACK_CAMPAIGN_STATUSES)[number];
  inactiveAfterDays: number;
  audienceFilters: Record<string, unknown>;
  offer: {
    type: (typeof COMEBACK_OFFER_TYPES)[number];
    title: string;
    value?: number;
    couponCode?: string;
    expiryDate?: Date;
    bookingLink?: string;
    description?: string;
  };
  scheduledAt?: Date;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  bookingsGenerated: number;
  revenueGenerated: number;
  timeline: Array<{ action: string; message?: string; createdAt: Date; createdBy?: mongoose.Types.ObjectId; metadata?: Record<string, unknown> }>;
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

const comebackCampaignSchema = new Schema<IComebackCampaign>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    campaignNumber: { type: String, required: true, trim: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'ComebackTemplate' },
    name: { type: String, required: true, trim: true },
    channel: { type: String, enum: COMEBACK_CHANNELS, default: 'whatsapp', index: true },
    status: { type: String, enum: COMEBACK_CAMPAIGN_STATUSES, default: 'draft', index: true },
    inactiveAfterDays: { type: Number, enum: [30, 60, 90, 180, 365], default: 90, index: true },
    audienceFilters: { type: Schema.Types.Mixed, default: {} },
    offer: {
      type: { type: String, enum: COMEBACK_OFFER_TYPES, default: 'percentage_discount' },
      title: { type: String, required: true },
      value: Number,
      couponCode: String,
      expiryDate: Date,
      bookingLink: String,
      description: String,
    },
    scheduledAt: { type: Date, index: true },
    recipientCount: { type: Number, default: 0, min: 0 },
    sentCount: { type: Number, default: 0, min: 0 },
    failedCount: { type: Number, default: 0, min: 0 },
    bookingsGenerated: { type: Number, default: 0, min: 0 },
    revenueGenerated: { type: Number, default: 0, min: 0 },
    timeline: [{ action: String, message: String, createdAt: { type: Date, default: Date.now }, createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, metadata: { type: Schema.Types.Mixed } }],
    pausedAt: Date,
    resumedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    archivedAt: Date,
    ...auditFields,
  },
  { timestamps: true }
);

comebackCampaignSchema.index({ hotelId: 1, status: 1, scheduledAt: 1 });
comebackCampaignSchema.index({ hotelId: 1, campaignNumber: 1 }, { unique: true });
comebackCampaignSchema.plugin(softDeletePlugin);

comebackCampaignSchema.pre('save', async function generateCampaignNumber(next) {
  if (this.campaignNumber) return next();
  const prefix = `WB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const count = await mongoose.models.ComebackCampaign.countDocuments(
    { hotelId: this.hotelId, campaignNumber: { $regex: `^${prefix}` } },
    { includeDeleted: true }
  );
  this.campaignNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  next();
});

export const ComebackCampaign = mongoose.model<IComebackCampaign>('ComebackCampaign', comebackCampaignSchema);
