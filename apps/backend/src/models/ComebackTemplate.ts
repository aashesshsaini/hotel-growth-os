import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const COMEBACK_CHANNELS = ['whatsapp', 'email', 'sms'] as const;
export type ComebackChannel = (typeof COMEBACK_CHANNELS)[number];

export interface IComebackTemplate extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  channel: ComebackChannel;
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
  archivedAt?: Date;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const comebackTemplateSchema = new Schema<IComebackTemplate>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: true, trim: true },
    channel: { type: String, enum: COMEBACK_CHANNELS, default: 'whatsapp', index: true },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
    variables: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false },
    archivedAt: Date,
    ...auditFields,
  },
  { timestamps: true }
);

comebackTemplateSchema.index({ hotelId: 1, channel: 1, isActive: 1 });
comebackTemplateSchema.plugin(softDeletePlugin);

export const ComebackTemplate = mongoose.model<IComebackTemplate>('ComebackTemplate', comebackTemplateSchema);
