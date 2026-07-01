import mongoose, { Document, Schema } from 'mongoose';
import { ComebackChannel, COMEBACK_CHANNELS } from './ComebackTemplate';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const COMEBACK_DELIVERY_STATUSES = ['pending', 'queued', 'sent', 'delivered', 'opened', 'failed', 'cancelled', 'skipped'] as const;

export interface IComebackDeliveryLog extends Document {
  hotelId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  automationJobId?: mongoose.Types.ObjectId;
  channel: ComebackChannel;
  status: (typeof COMEBACK_DELIVERY_STATUSES)[number];
  inactiveSince?: Date;
  lastStayDate?: Date;
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

const comebackDeliveryLogSchema = new Schema<IComebackDeliveryLog>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'ComebackCampaign', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'ComebackTemplate' },
    automationJobId: { type: Schema.Types.ObjectId, ref: 'AutomationJob', index: true },
    channel: { type: String, enum: COMEBACK_CHANNELS, required: true, index: true },
    status: { type: String, enum: COMEBACK_DELIVERY_STATUSES, default: 'pending', index: true },
    inactiveSince: Date,
    lastStayDate: Date,
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

comebackDeliveryLogSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
comebackDeliveryLogSchema.index({ hotelId: 1, campaignId: 1, status: 1 });
comebackDeliveryLogSchema.plugin(softDeletePlugin);

export const ComebackDeliveryLog = mongoose.model<IComebackDeliveryLog>('ComebackDeliveryLog', comebackDeliveryLogSchema);
