import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IFestivalSettings extends Document {
  hotelId: mongoose.Types.ObjectId;
  isEnabled: boolean;
  isPaused: boolean;
  defaultChannel: 'whatsapp' | 'email' | 'sms';
  fallbackChannel: 'whatsapp' | 'email' | 'sms' | 'none';
  sendTime: string;
  timezone: string;
  retryEnabled: boolean;
  recurringEnabled: boolean;
  signature?: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const festivalSettingsSchema = new Schema<IFestivalSettings>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, unique: true, index: true },
    isEnabled: { type: Boolean, default: true },
    isPaused: { type: Boolean, default: false, index: true },
    defaultChannel: { type: String, enum: ['whatsapp', 'email', 'sms'], default: 'whatsapp' },
    fallbackChannel: { type: String, enum: ['whatsapp', 'email', 'sms', 'none'], default: 'email' },
    sendTime: { type: String, default: '10:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    retryEnabled: { type: Boolean, default: true },
    recurringEnabled: { type: Boolean, default: true },
    signature: String,
    ...auditFields,
  },
  { timestamps: true }
);

festivalSettingsSchema.plugin(softDeletePlugin);

export const FestivalSettings = mongoose.model<IFestivalSettings>('FestivalSettings', festivalSettingsSchema);
