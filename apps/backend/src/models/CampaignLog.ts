import mongoose, { Document, Schema } from 'mongoose';
import { CAMPAIGN_CHANNELS, CAMPAIGN_LOG_STATUSES, CampaignChannel, CampaignLogStatus } from '@hotel-growth-os/shared';

export interface ICampaignLog extends Document {
  campaignId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  guestId?: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  enquiryId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  recipientName?: string;
  recipientEmail?: string;
  phone: string;
  channel: CampaignChannel;
  status: CampaignLogStatus;
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
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry', index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    recipientName: { type: String },
    recipientEmail: { type: String },
    phone: { type: String, required: true },
    channel: { type: String, enum: CAMPAIGN_CHANNELS, default: 'whatsapp' },
    status: {
      type: String,
      enum: CAMPAIGN_LOG_STATUSES,
      default: 'pending',
      index: true,
    },
    errorMessage: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

campaignLogSchema.index({ campaignId: 1, status: 1 });
campaignLogSchema.index({ hotelId: 1, guestId: 1, createdAt: -1 });

export const CampaignLog = mongoose.model<ICampaignLog>('CampaignLog', campaignLogSchema);
