import mongoose, { Document, Schema } from 'mongoose';
import { WHATSAPP_TEMPLATE_STATUSES, WhatsAppTemplateStatus } from '@hotel-growth-os/shared';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IWhatsAppTemplate extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  language: string;
  status: WhatsAppTemplateStatus;
  header?: string;
  body: string;
  footer?: string;
  buttons: Array<{ type: string; text: string; url?: string; phone?: string }>;
  whatsappTemplateId?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppTemplateSchema = new Schema<IWhatsAppTemplate>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, default: 'MARKETING', trim: true },
    language: { type: String, default: 'en', trim: true },
    status: { type: String, enum: WHATSAPP_TEMPLATE_STATUSES, default: 'draft', index: true },
    header: { type: String, trim: true },
    body: { type: String, required: true },
    footer: { type: String, trim: true },
    buttons: [
      {
        type: { type: String, required: true },
        text: { type: String, required: true },
        url: { type: String },
        phone: { type: String },
      },
    ],
    whatsappTemplateId: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    ...auditFields,
  },
  { timestamps: true }
);

whatsAppTemplateSchema.index({ hotelId: 1, name: 1, language: 1 }, { unique: true });
whatsAppTemplateSchema.plugin(softDeletePlugin);

export const WhatsAppTemplate = mongoose.model<IWhatsAppTemplate>('WhatsAppTemplate', whatsAppTemplateSchema);
