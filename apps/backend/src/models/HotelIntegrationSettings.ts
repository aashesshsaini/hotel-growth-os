import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export type IntegrationConnectionStatus = 'connected' | 'disconnected' | 'connection_failed' | 'token_expired' | 'invalid_credentials';

export interface IntegrationHealth {
  status: IntegrationConnectionStatus;
  lastTestedAt?: Date;
  lastSuccessfulConnectionAt?: Date;
  lastFailedAttemptAt?: Date;
  lastError?: string;
  lastUpdatedAt?: Date;
}

export interface IHotelIntegrationSettings extends Document {
  hotelId: mongoose.Types.ObjectId;
  whatsapp: {
    businessName?: string;
    phoneNumber?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    permanentAccessTokenEncrypted?: string;
    webhookVerifyTokenEncrypted?: string;
    webhookSecretEncrypted?: string;
    health: IntegrationHealth;
  };
  email: {
    smtpHost?: string;
    smtpPort?: number;
    username?: string;
    passwordEncrypted?: string;
    encryption?: 'none' | 'ssl' | 'tls' | 'starttls';
    senderName?: string;
    senderEmail?: string;
    replyToEmail?: string;
    health: IntegrationHealth;
  };
  googleReview: {
    googleReviewUrl?: string;
    googleBusinessName?: string;
    googlePlaceId?: string;
    reviewButtonLabel?: string;
    automationEnabled: boolean;
    health: IntegrationHealth;
  };
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const healthSchema = new Schema<IntegrationHealth>(
  {
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'connection_failed', 'token_expired', 'invalid_credentials'],
      default: 'disconnected',
      index: true,
    },
    lastTestedAt: Date,
    lastSuccessfulConnectionAt: Date,
    lastFailedAttemptAt: Date,
    lastError: String,
    lastUpdatedAt: Date,
  },
  { _id: false }
);

const hotelIntegrationSettingsSchema = new Schema<IHotelIntegrationSettings>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, unique: true, index: true },
    whatsapp: {
      businessName: String,
      phoneNumber: String,
      phoneNumberId: String,
      businessAccountId: String,
      permanentAccessTokenEncrypted: String,
      webhookVerifyTokenEncrypted: String,
      webhookSecretEncrypted: String,
      health: { type: healthSchema, default: () => ({ status: 'disconnected' }) },
    },
    email: {
      smtpHost: String,
      smtpPort: Number,
      username: String,
      passwordEncrypted: String,
      encryption: { type: String, enum: ['none', 'ssl', 'tls', 'starttls'], default: 'tls' },
      senderName: String,
      senderEmail: { type: String, lowercase: true, trim: true },
      replyToEmail: { type: String, lowercase: true, trim: true },
      health: { type: healthSchema, default: () => ({ status: 'disconnected' }) },
    },
    googleReview: {
      googleReviewUrl: String,
      googleBusinessName: String,
      googlePlaceId: String,
      reviewButtonLabel: { type: String, default: 'Review us on Google' },
      automationEnabled: { type: Boolean, default: true },
      health: { type: healthSchema, default: () => ({ status: 'disconnected' }) },
    },
    ...auditFields,
  },
  { timestamps: true }
);

hotelIntegrationSettingsSchema.index({ hotelId: 1, 'whatsapp.health.status': 1 });
hotelIntegrationSettingsSchema.index({ hotelId: 1, 'email.health.status': 1 });
hotelIntegrationSettingsSchema.index({ hotelId: 1, 'googleReview.health.status': 1 });
hotelIntegrationSettingsSchema.plugin(softDeletePlugin);

export const HotelIntegrationSettings = mongoose.model<IHotelIntegrationSettings>('HotelIntegrationSettings', hotelIntegrationSettingsSchema);
