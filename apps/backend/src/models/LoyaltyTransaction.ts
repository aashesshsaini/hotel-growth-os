import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface ILoyaltyTransaction extends Document {
  hotelId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  referralInviteId?: mongoose.Types.ObjectId;
  type: 'earn' | 'redeem' | 'adjust' | 'expire' | 'reverse' | 'referral_bonus';
  points: number;
  amountValue: number;
  balanceAfter: number;
  status: 'pending' | 'posted' | 'reversed' | 'expired';
  reason: string;
  expiresAt?: Date;
  deduplicationKey: string;
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    referralInviteId: { type: Schema.Types.ObjectId, ref: 'ReferralInvite', index: true },
    type: { type: String, enum: ['earn', 'redeem', 'adjust', 'expire', 'reverse', 'referral_bonus'], required: true, index: true },
    points: { type: Number, required: true },
    amountValue: { type: Number, default: 0 },
    balanceAfter: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'posted', 'reversed', 'expired'], default: 'posted', index: true },
    reason: { type: String, required: true },
    expiresAt: { type: Date, index: true },
    deduplicationKey: { type: String, required: true, unique: true, index: true },
    metadata: { type: Schema.Types.Mixed },
    ...auditFields,
  },
  { timestamps: true }
);

loyaltyTransactionSchema.index({ hotelId: 1, guestId: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ hotelId: 1, type: 1, createdAt: -1 });
loyaltyTransactionSchema.plugin(softDeletePlugin);

export const LoyaltyTransaction = mongoose.model<ILoyaltyTransaction>('LoyaltyTransaction', loyaltyTransactionSchema);
