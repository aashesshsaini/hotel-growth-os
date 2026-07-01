import mongoose, { Document, Schema } from 'mongoose';
import { OccasionChannel, OccasionType, OCCASION_CHANNELS, OCCASION_TYPES } from './OccasionTemplate';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const OCCASION_CAMPAIGN_STATUSES = ['draft', 'scheduled', 'running', 'completed', 'cancelled', 'failed'] as const;

export interface IOccasionCampaign extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  occasion: OccasionType;
  channel: OccasionChannel;
  templateId?: mongoose.Types.ObjectId;
  status: (typeof OCCASION_CAMPAIGN_STATUSES)[number];
  scheduledAt?: Date;
  filters: Record<string, unknown>;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  lastRunAt?: Date;
  cancelledAt?: Date;
  failureReason?: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const occasionCampaignSchema = new Schema<IOccasionCampaign>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: true, trim: true },
    occasion: { type: String, enum: OCCASION_TYPES, required: true, index: true },
    channel: { type: String, enum: OCCASION_CHANNELS, required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'OccasionTemplate' },
    status: { type: String, enum: OCCASION_CAMPAIGN_STATUSES, default: 'draft', index: true },
    scheduledAt: { type: Date, index: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    recipientCount: { type: Number, default: 0, min: 0 },
    sentCount: { type: Number, default: 0, min: 0 },
    failedCount: { type: Number, default: 0, min: 0 },
    lastRunAt: Date,
    cancelledAt: Date,
    failureReason: String,
    ...auditFields,
  },
  { timestamps: true }
);

occasionCampaignSchema.index({ hotelId: 1, status: 1, scheduledAt: 1 });
occasionCampaignSchema.plugin(softDeletePlugin);

export const OccasionCampaign = mongoose.model<IOccasionCampaign>('OccasionCampaign', occasionCampaignSchema);
