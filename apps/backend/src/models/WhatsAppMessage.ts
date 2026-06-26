import mongoose, { Document, Schema } from 'mongoose';
import {
  WHATSAPP_DIRECTIONS,
  WHATSAPP_MESSAGE_STATUSES,
  WHATSAPP_MESSAGE_TYPES,
  WhatsAppAutomationTrigger,
  WhatsAppDirection,
  WhatsAppMessageStatus,
  WhatsAppMessageType,
} from '@hotel-growth-os/shared';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IWhatsAppMessage extends Document {
  hotelId: mongoose.Types.ObjectId;
  guestId?: mongoose.Types.ObjectId;
  enquiryId?: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  campaignLogId?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  phone: string;
  direction: WhatsAppDirection;
  messageType: WhatsAppMessageType;
  content: string;
  mediaUrl?: string;
  templateName?: string;
  templateLanguage?: string;
  automationTrigger?: WhatsAppAutomationTrigger;
  whatsappMessageId?: string;
  status: WhatsAppMessageStatus;
  failureReason?: string;
  retryCount: number;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  internalNotes?: string;
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppMessageSchema = new Schema<IWhatsAppMessage>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', index: true },
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry', index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    campaignLogId: { type: Schema.Types.ObjectId, ref: 'CampaignLog', index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    phone: { type: String, required: true, index: true },
    direction: { type: String, enum: WHATSAPP_DIRECTIONS, required: true, index: true },
    messageType: {
      type: String,
      enum: WHATSAPP_MESSAGE_TYPES,
      default: 'text',
      index: true,
    },
    content: { type: String, required: true },
    mediaUrl: { type: String },
    templateName: { type: String },
    templateLanguage: { type: String, default: 'en' },
    automationTrigger: { type: String, index: true },
    whatsappMessageId: { type: String, index: true },
    status: {
      type: String,
      enum: WHATSAPP_MESSAGE_STATUSES,
      default: 'received',
      index: true,
    },
    failureReason: { type: String },
    retryCount: { type: Number, default: 0 },
    scheduledAt: { type: Date, index: true },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    failedAt: { type: Date },
    internalNotes: { type: String },
    metadata: { type: Schema.Types.Mixed },
    ...auditFields,
  },
  { timestamps: true }
);

whatsAppMessageSchema.index({ hotelId: 1, phone: 1, createdAt: -1 });
whatsAppMessageSchema.index({ hotelId: 1, status: 1, direction: 1 });
whatsAppMessageSchema.index({ hotelId: 1, scheduledAt: 1, status: 1 });
whatsAppMessageSchema.plugin(softDeletePlugin);

export const WhatsAppMessage = mongoose.model<IWhatsAppMessage>('WhatsAppMessage', whatsAppMessageSchema);
