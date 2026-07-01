import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IReferralInvite extends Document {
  hotelId: mongoose.Types.ObjectId;
  referralCodeId: mongoose.Types.ObjectId;
  referrerGuestId: mongoose.Types.ObjectId;
  referredGuestId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  code: string;
  channel: 'whatsapp' | 'email' | 'sms';
  status: 'sent' | 'opened' | 'accepted' | 'booked' | 'rewarded' | 'expired' | 'failed';
  recipientMasked: string;
  failureReason?: string;
  rewardStatus: 'pending' | 'issued' | 'reversed' | 'not_eligible';
  sentAt?: Date;
  acceptedAt?: Date;
  bookedAt?: Date;
  rewardedAt?: Date;
  deduplicationKey: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const referralInviteSchema = new Schema<IReferralInvite>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    referralCodeId: { type: Schema.Types.ObjectId, ref: 'ReferralCode', required: true, index: true },
    referrerGuestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    referredGuestId: { type: Schema.Types.ObjectId, ref: 'Guest', index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    channel: { type: String, enum: ['whatsapp', 'email', 'sms'], default: 'whatsapp' },
    status: { type: String, enum: ['sent', 'opened', 'accepted', 'booked', 'rewarded', 'expired', 'failed'], default: 'sent', index: true },
    recipientMasked: { type: String, required: true },
    failureReason: String,
    rewardStatus: { type: String, enum: ['pending', 'issued', 'reversed', 'not_eligible'], default: 'pending', index: true },
    sentAt: Date,
    acceptedAt: Date,
    bookedAt: Date,
    rewardedAt: Date,
    deduplicationKey: { type: String, required: true, unique: true, index: true },
    ...auditFields,
  },
  { timestamps: true }
);

referralInviteSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
referralInviteSchema.plugin(softDeletePlugin);

export const ReferralInvite = mongoose.model<IReferralInvite>('ReferralInvite', referralInviteSchema);
