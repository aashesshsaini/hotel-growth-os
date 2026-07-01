import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const FESTIVAL_CHANNELS = ['whatsapp', 'email', 'sms'] as const;
export type FestivalChannel = (typeof FESTIVAL_CHANNELS)[number];

export interface IFestivalTemplate extends Document {
  hotelId: mongoose.Types.ObjectId;
  festivalId?: mongoose.Types.ObjectId;
  name: string;
  channel: FestivalChannel;
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const festivalTemplateSchema = new Schema<IFestivalTemplate>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    festivalId: { type: Schema.Types.ObjectId, ref: 'Festival', index: true },
    name: { type: String, required: true, trim: true },
    channel: { type: String, enum: FESTIVAL_CHANNELS, default: 'whatsapp', index: true },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
    variables: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false },
    ...auditFields,
  },
  { timestamps: true }
);

festivalTemplateSchema.index({ hotelId: 1, festivalId: 1, channel: 1, isActive: 1 });
festivalTemplateSchema.plugin(softDeletePlugin);

export const FestivalTemplate = mongoose.model<IFestivalTemplate>('FestivalTemplate', festivalTemplateSchema);
