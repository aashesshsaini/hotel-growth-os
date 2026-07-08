import mongoose, { Document, Schema } from 'mongoose';
import { REVIEW_PLATFORMS, ReviewPlatform } from '@hotel-growth-os/shared';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IReviewSettings extends Document {
  hotelId: mongoose.Types.ObjectId;
  isEnabled: boolean;
  defaultPlatform: ReviewPlatform;
  googleReviewUrl?: string;
  defaultDelayMinutes: number;
  reminderDelayMinutes: number;
  recoveryDelayMinutes: number;
  requestExpiryDays: number;
  autoSendOnCheckout: boolean;
  autoSendOnBookingCompleted: boolean;
  positiveRatingThreshold: number;
  negativeRatingThreshold: number;
  channels: {
    whatsapp: boolean;
    sms: boolean;
    email: boolean;
  };
  notificationUserIds: mongoose.Types.ObjectId[];
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const googleReviewUrlValidator = (value?: string) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && /(google|g\.page|maps\.app\.goo\.gl|goo\.gl)/i.test(url.hostname + url.pathname);
  } catch {
    return false;
  }
};

const reviewSettingsSchema = new Schema<IReviewSettings>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    isEnabled: { type: Boolean, default: true, index: true },
    defaultPlatform: { type: String, enum: REVIEW_PLATFORMS, default: 'GOOGLE' },
    googleReviewUrl: {
      type: String,
      trim: true,
      validate: { validator: googleReviewUrlValidator, message: 'Invalid Google Review URL' },
    },
    defaultDelayMinutes: { type: Number, default: 120, min: 0, max: 43200 },
    reminderDelayMinutes: { type: Number, default: 1440, min: 0, max: 43200 },
    recoveryDelayMinutes: { type: Number, default: 2880, min: 0, max: 43200 },
    requestExpiryDays: { type: Number, default: 14, min: 1, max: 365 },
    autoSendOnCheckout: { type: Boolean, default: true },
    autoSendOnBookingCompleted: { type: Boolean, default: true },
    positiveRatingThreshold: { type: Number, default: 4, min: 1, max: 5 },
    negativeRatingThreshold: { type: Number, default: 3, min: 1, max: 5 },
    channels: {
      whatsapp: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
    },
    notificationUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    metadata: { type: Schema.Types.Mixed },
    ...auditFields,
  },
  { timestamps: true }
);

reviewSettingsSchema.index({ hotelId: 1 }, { unique: true });
reviewSettingsSchema.index({ hotelId: 1, isEnabled: 1 });
reviewSettingsSchema.plugin(softDeletePlugin);

export const ReviewSettings = mongoose.model<IReviewSettings>('ReviewSettings', reviewSettingsSchema);
