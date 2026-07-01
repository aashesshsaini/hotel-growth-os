import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IRewardRedemption extends Document {
  hotelId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  transactionId?: mongoose.Types.ObjectId;
  rewardType: 'points' | 'coupon' | 'flat' | 'upgrade' | 'breakfast';
  pointsRedeemed: number;
  amountValue: number;
  couponCode?: string;
  status: 'requested' | 'approved' | 'redeemed' | 'cancelled' | 'expired';
  expiresAt?: Date;
  redeemedAt?: Date;
  notes?: string;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const rewardRedemptionSchema = new Schema<IRewardRedemption>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    transactionId: { type: Schema.Types.ObjectId, ref: 'LoyaltyTransaction' },
    rewardType: { type: String, enum: ['points', 'coupon', 'flat', 'upgrade', 'breakfast'], required: true },
    pointsRedeemed: { type: Number, default: 0, min: 0 },
    amountValue: { type: Number, default: 0, min: 0 },
    couponCode: String,
    status: { type: String, enum: ['requested', 'approved', 'redeemed', 'cancelled', 'expired'], default: 'approved', index: true },
    expiresAt: Date,
    redeemedAt: Date,
    notes: String,
    ...auditFields,
  },
  { timestamps: true }
);

rewardRedemptionSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
rewardRedemptionSchema.plugin(softDeletePlugin);

export const RewardRedemption = mongoose.model<IRewardRedemption>('RewardRedemption', rewardRedemptionSchema);
