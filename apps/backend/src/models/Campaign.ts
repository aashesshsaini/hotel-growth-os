import mongoose, { Document, Schema } from 'mongoose';
import { CampaignType } from '@hotel-growth-os/shared';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface ICampaign extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  type: CampaignType;
  message: string;
  targetAudience?: string;
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  stats: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    responded: number;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['old_guests', 'festival_offer', 'weekend_offer', 'birthday_offer'],
      required: true,
    },
    message: { type: String, required: true },
    targetAudience: { type: String },
    scheduledAt: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'completed', 'cancelled'],
      default: 'draft',
    },
    stats: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      responded: { type: Number, default: 0 },
    },
    ...auditFields,
  },
  { timestamps: true }
);

campaignSchema.index({ hotelId: 1, status: 1 });
campaignSchema.plugin(softDeletePlugin);

export const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema);
