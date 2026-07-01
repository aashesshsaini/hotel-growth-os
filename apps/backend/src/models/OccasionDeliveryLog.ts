import mongoose, { Document, Schema } from 'mongoose';
import { OccasionChannel, OccasionType, OCCASION_CHANNELS, OCCASION_TYPES } from './OccasionTemplate';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const OCCASION_DELIVERY_STATUSES = ['pending', 'queued', 'sent', 'delivered', 'opened', 'failed', 'cancelled', 'skipped'] as const;

export interface IOccasionDeliveryLog extends Document {
  hotelId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  automationJobId?: mongoose.Types.ObjectId;
  occasion: OccasionType;
  channel: OccasionChannel;
  status: (typeof OCCASION_DELIVERY_STATUSES)[number];
  occurrenceDate: string;
  recipientName: string;
  recipientMasked: string;
  messagePreview?: string;
  sentAt?: Date;
  openedAt?: Date;
  failedReason?: string;
  retryCount: number;
  deduplicationKey: string;
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const occasionDeliveryLogSchema = new Schema<IOccasionDeliveryLog>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'OccasionCampaign', index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'OccasionTemplate' },
    automationJobId: { type: Schema.Types.ObjectId, ref: 'AutomationJob', index: true },
    occasion: { type: String, enum: OCCASION_TYPES, required: true, index: true },
    channel: { type: String, enum: OCCASION_CHANNELS, required: true, index: true },
    status: { type: String, enum: OCCASION_DELIVERY_STATUSES, default: 'pending', index: true },
    occurrenceDate: { type: String, required: true, index: true },
    recipientName: { type: String, required: true },
    recipientMasked: { type: String, required: true },
    messagePreview: String,
    sentAt: Date,
    openedAt: Date,
    failedReason: String,
    retryCount: { type: Number, default: 0, min: 0 },
    deduplicationKey: { type: String, required: true, unique: true, index: true },
    metadata: { type: Schema.Types.Mixed },
    ...auditFields,
  },
  { timestamps: true }
);

occasionDeliveryLogSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
occasionDeliveryLogSchema.index({ hotelId: 1, occasion: 1, occurrenceDate: 1 });
occasionDeliveryLogSchema.plugin(softDeletePlugin);

export const OccasionDeliveryLog = mongoose.model<IOccasionDeliveryLog>('OccasionDeliveryLog', occasionDeliveryLogSchema);
