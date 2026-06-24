import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin } from '../utils/schemaHelpers';

export interface IWhatsAppMessage extends Document {
  hotelId: mongoose.Types.ObjectId;
  enquiryId?: mongoose.Types.ObjectId;
  guestId?: mongoose.Types.ObjectId;
  phone: string;
  direction: 'incoming' | 'outgoing';
  messageType: 'text' | 'image' | 'document' | 'template';
  content: string;
  whatsappMessageId?: string;
  status: 'received' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppMessageSchema = new Schema<IWhatsAppMessage>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry' },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest' },
    phone: { type: String, required: true, index: true },
    direction: { type: String, enum: ['incoming', 'outgoing'], required: true },
    messageType: {
      type: String,
      enum: ['text', 'image', 'document', 'template'],
      default: 'text',
    },
    content: { type: String, required: true },
    whatsappMessageId: { type: String },
    status: {
      type: String,
      enum: ['received', 'sent', 'delivered', 'read', 'failed'],
      default: 'received',
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

whatsAppMessageSchema.index({ hotelId: 1, phone: 1, createdAt: -1 });
whatsAppMessageSchema.plugin(softDeletePlugin);

export const WhatsAppMessage = mongoose.model<IWhatsAppMessage>(
  'WhatsAppMessage',
  whatsAppMessageSchema
);
