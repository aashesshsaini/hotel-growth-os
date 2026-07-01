import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const OCCASION_TYPES = ['birthday', 'anniversary'] as const;
export const OCCASION_CHANNELS = ['whatsapp', 'email', 'sms'] as const;

export type OccasionType = (typeof OCCASION_TYPES)[number];
export type OccasionChannel = (typeof OCCASION_CHANNELS)[number];

export interface IOccasionTemplate extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  occasion: OccasionType;
  channel: OccasionChannel;
  subject?: string;
  body: string;
  isActive: boolean;
  variables: string[];
  previewData?: Record<string, string>;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const occasionTemplateSchema = new Schema<IOccasionTemplate>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: true, trim: true },
    occasion: { type: String, enum: OCCASION_TYPES, required: true, index: true },
    channel: { type: String, enum: OCCASION_CHANNELS, required: true, index: true },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
    isActive: { type: Boolean, default: false, index: true },
    variables: [{ type: String }],
    previewData: { type: Schema.Types.Mixed },
    ...auditFields,
  },
  { timestamps: true }
);

occasionTemplateSchema.index({ hotelId: 1, occasion: 1, channel: 1, isActive: 1 });
occasionTemplateSchema.index({ hotelId: 1, name: 1 });
occasionTemplateSchema.plugin(softDeletePlugin);

export const OccasionTemplate = mongoose.model<IOccasionTemplate>('OccasionTemplate', occasionTemplateSchema);
