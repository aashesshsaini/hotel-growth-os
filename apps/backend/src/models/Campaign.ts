import mongoose, { Document, Schema } from 'mongoose';
import {
  CAMPAIGN_AUDIENCE_SEGMENTS,
  CAMPAIGN_CHANNELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  CampaignAudienceSegment,
  CampaignChannel,
  CampaignStatus,
  CampaignType,
} from '@hotel-growth-os/shared';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface ICampaignTimelineItem {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface ICampaignNote {
  text: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface ICampaignAudienceFilters {
  city?: string;
  tags?: string[];
  lastBookingDays?: number;
  inactiveDays?: number;
  customGuestIds?: mongoose.Types.ObjectId[];
  customLeadIds?: mongoose.Types.ObjectId[];
  customEnquiryIds?: mongoose.Types.ObjectId[];
}

export interface ICampaign extends Document {
  hotelId: mongoose.Types.ObjectId;
  campaignNumber: string;
  name: string;
  type: CampaignType;
  channel: CampaignChannel;
  message: string;
  subject?: string;
  description?: string;
  targetAudience?: string;
  audienceSegment: CampaignAudienceSegment;
  audienceFilters?: ICampaignAudienceFilters;
  scheduledAt?: Date;
  launchedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
  status: CampaignStatus;
  assignedTo?: mongoose.Types.ObjectId;
  internalNotes?: string;
  notes: ICampaignNote[];
  timeline: ICampaignTimelineItem[];
  stats: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    responded: number;
    leadsGenerated: number;
    bookingsGenerated: number;
    revenueGenerated: number;
  };
  tags: string[];
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    campaignNumber: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: CAMPAIGN_TYPES, required: true, index: true },
    channel: { type: String, enum: CAMPAIGN_CHANNELS, default: 'whatsapp', index: true },
    message: { type: String, required: true },
    subject: { type: String, trim: true },
    description: { type: String, trim: true },
    targetAudience: { type: String },
    audienceSegment: {
      type: String,
      enum: CAMPAIGN_AUDIENCE_SEGMENTS,
      default: 'all_guests',
      index: true,
    },
    audienceFilters: {
      city: { type: String },
      tags: [{ type: String }],
      lastBookingDays: { type: Number },
      inactiveDays: { type: Number },
      customGuestIds: [{ type: Schema.Types.ObjectId, ref: 'Guest' }],
      customLeadIds: [{ type: Schema.Types.ObjectId, ref: 'Lead' }],
      customEnquiryIds: [{ type: Schema.Types.ObjectId, ref: 'Enquiry' }],
    },
    scheduledAt: { type: Date, index: true },
    launchedAt: { type: Date },
    completedAt: { type: Date },
    pausedAt: { type: Date },
    cancelledAt: { type: Date },
    status: {
      type: String,
      enum: CAMPAIGN_STATUSES,
      default: 'draft',
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    internalNotes: { type: String },
    notes: [
      {
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    timeline: [
      {
        action: { type: String, required: true },
        message: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      responded: { type: Number, default: 0 },
      leadsGenerated: { type: Number, default: 0 },
      bookingsGenerated: { type: Number, default: 0 },
      revenueGenerated: { type: Number, default: 0 },
    },
    tags: [{ type: String }],
    ...auditFields,
  },
  { timestamps: true }
);

campaignSchema.index({ hotelId: 1, status: 1 });
campaignSchema.index({ hotelId: 1, type: 1 });
campaignSchema.index({ hotelId: 1, audienceSegment: 1 });
campaignSchema.index({ hotelId: 1, campaignNumber: 1 }, { unique: true });
campaignSchema.index({ name: 'text', message: 'text', description: 'text' });
campaignSchema.plugin(softDeletePlugin);

campaignSchema.pre('save', async function generateCampaignNumber(next) {
  if (this.campaignNumber) {
    next();
    return;
  }
  const prefix = `CMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const count = await mongoose.models.Campaign.countDocuments(
    {
      hotelId: this.hotelId,
      campaignNumber: { $regex: `^${prefix}` },
    },
    { includeDeleted: true }
  );
  this.campaignNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  next();
});

export const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema);
