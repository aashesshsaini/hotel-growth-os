import mongoose, { Document, Schema } from 'mongoose';
import { FestivalChannel, FESTIVAL_CHANNELS } from './FestivalTemplate';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const FESTIVAL_DELIVERY_STATUSES = ['pending', 'queued', 'sent', 'delivered', 'opened', 'failed', 'cancelled', 'skipped'] as const;

export interface IFestivalDeliveryLog extends Document {
  hotelId: mongoose.Types.ObjectId;
  festivalId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  automationJobId?: mongoose.Types.ObjectId;
  channel: FestivalChannel;
  status: (typeof FESTIVAL_DELIVERY_STATUSES)[number];
  scheduledFor?: Date;
  recipientName: string;
  recipientMasked: string;
  messagePreview?: string;
  sentAt?: Date;
  deliveredAt?: Date;
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

const festivalDeliveryLogSchema = new Schema<IFestivalDeliveryLog>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    festivalId: { type: Schema.Types.ObjectId, ref: 'Festival', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'FestivalCampaign', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'FestivalTemplate' },
    automationJobId: { type: Schema.Types.ObjectId, ref: 'AutomationJob', index: true },
    channel: { type: String, enum: FESTIVAL_CHANNELS, required: true, index: true },
    status: { type: String, enum: FESTIVAL_DELIVERY_STATUSES, default: 'pending', index: true },
    scheduledFor: { type: Date, index: true },
    recipientName: { type: String, required: true },
    recipientMasked: { type: String, required: true },
    messagePreview: String,
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    failedReason: String,
    retryCount: { type: Number, default: 0, min: 0 },
    deduplicationKey: { type: String, required: true, unique: true, index: true },
    metadata: { type: Schema.Types.Mixed },
    ...auditFields,
  },
  { timestamps: true }
);

festivalDeliveryLogSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
festivalDeliveryLogSchema.index({ hotelId: 1, campaignId: 1, status: 1 });
festivalDeliveryLogSchema.plugin(softDeletePlugin);

export const FestivalDeliveryLog = mongoose.model<IFestivalDeliveryLog>('FestivalDeliveryLog', festivalDeliveryLogSchema);
