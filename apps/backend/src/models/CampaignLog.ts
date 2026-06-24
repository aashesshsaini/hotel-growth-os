import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaignLog extends Document {
  campaignId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  guestId?: mongoose.Types.ObjectId;
  phone: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'responded';
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const campaignLogSchema = new Schema<ICampaignLog>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest' },
    phone: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'responded'],
      default: 'pending',
    },
    errorMessage: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

campaignLogSchema.index({ campaignId: 1, status: 1 });

export const CampaignLog = mongoose.model<ICampaignLog>('CampaignLog', campaignLogSchema);
