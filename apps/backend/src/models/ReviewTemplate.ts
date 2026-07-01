import mongoose, { Document, Schema } from 'mongoose';
import { REVIEW_PLATFORMS, ReviewPlatform } from '@hotel-growth-os/shared';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IReviewTemplate extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  platform: ReviewPlatform;
  channel: 'whatsapp' | 'sms' | 'email';
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reviewTemplateSchema = new Schema<IReviewTemplate>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    platform: { type: String, enum: REVIEW_PLATFORMS, default: 'GOOGLE', index: true },
    channel: { type: String, enum: ['whatsapp', 'sms', 'email'], default: 'whatsapp', index: true },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
    variables: { type: [String], default: ['guest_name', 'hotel_name', 'review_link'] },
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
    ...auditFields,
  },
  { timestamps: true }
);

reviewTemplateSchema.index({ hotelId: 1, name: 1, channel: 1 }, { unique: true });
reviewTemplateSchema.index({ hotelId: 1, platform: 1, isActive: 1 });
reviewTemplateSchema.index({ name: 'text', subject: 'text', body: 'text' });
reviewTemplateSchema.plugin(softDeletePlugin);

export const ReviewTemplate = mongoose.model<IReviewTemplate>('ReviewTemplate', reviewTemplateSchema);
