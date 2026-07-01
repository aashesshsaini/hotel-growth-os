import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IOccasionAutomationSettings extends Document {
  hotelId: mongoose.Types.ObjectId;
  birthdayEnabled: boolean;
  anniversaryEnabled: boolean;
  daysBeforeBirthday: number;
  daysBeforeAnniversary: number;
  sendTime: string;
  timezone: string;
  preferredChannel: 'whatsapp' | 'email' | 'sms';
  fallbackChannel: 'whatsapp' | 'email' | 'sms' | 'none';
  signature?: string;
  reminderEnabled: boolean;
  retryEnabled: boolean;
  isPaused: boolean;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const occasionAutomationSettingsSchema = new Schema<IOccasionAutomationSettings>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, unique: true, index: true },
    birthdayEnabled: { type: Boolean, default: true },
    anniversaryEnabled: { type: Boolean, default: true },
    daysBeforeBirthday: { type: Number, default: 0, min: 0, max: 30 },
    daysBeforeAnniversary: { type: Number, default: 0, min: 0, max: 30 },
    sendTime: { type: String, default: '10:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    preferredChannel: { type: String, enum: ['whatsapp', 'email', 'sms'], default: 'whatsapp' },
    fallbackChannel: { type: String, enum: ['whatsapp', 'email', 'sms', 'none'], default: 'email' },
    signature: String,
    reminderEnabled: { type: Boolean, default: true },
    retryEnabled: { type: Boolean, default: true },
    isPaused: { type: Boolean, default: false, index: true },
    ...auditFields,
  },
  { timestamps: true }
);

occasionAutomationSettingsSchema.index({ hotelId: 1, isPaused: 1 });
occasionAutomationSettingsSchema.plugin(softDeletePlugin);

export const OccasionAutomationSettings = mongoose.model<IOccasionAutomationSettings>('OccasionAutomationSettings', occasionAutomationSettingsSchema);
