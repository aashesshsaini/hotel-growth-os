import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IComebackSettings extends Document {
  hotelId: mongoose.Types.ObjectId;
  isEnabled: boolean;
  isPaused: boolean;
  inactiveAfterDays: number[];
  cooldownDays: number;
  defaultChannel: 'whatsapp' | 'email' | 'sms';
  fallbackChannel: 'whatsapp' | 'email' | 'sms' | 'none';
  sendTime: string;
  timezone: string;
  retryEnabled: boolean;
  signature?: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const comebackSettingsSchema = new Schema<IComebackSettings>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, unique: true, index: true },
    isEnabled: { type: Boolean, default: true },
    isPaused: { type: Boolean, default: false, index: true },
    inactiveAfterDays: [{ type: Number, enum: [30, 60, 90, 180, 365], default: 90 }],
    cooldownDays: { type: Number, default: 60, min: 1, max: 365 },
    defaultChannel: { type: String, enum: ['whatsapp', 'email', 'sms'], default: 'whatsapp' },
    fallbackChannel: { type: String, enum: ['whatsapp', 'email', 'sms', 'none'], default: 'email' },
    sendTime: { type: String, default: '10:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    retryEnabled: { type: Boolean, default: true },
    signature: String,
    ...auditFields,
  },
  { timestamps: true }
);

comebackSettingsSchema.plugin(softDeletePlugin);

export const ComebackSettings = mongoose.model<IComebackSettings>('ComebackSettings', comebackSettingsSchema);
