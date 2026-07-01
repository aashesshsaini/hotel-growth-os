import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IGuestWallet extends Document {
  hotelId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  pointsBalance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  rewardBalance: number;
  tier: 'standard' | 'silver' | 'gold' | 'platinum';
  lastActivityAt?: Date;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const guestWalletSchema = new Schema<IGuestWallet>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    pointsBalance: { type: Number, default: 0, min: 0 },
    lifetimeEarned: { type: Number, default: 0, min: 0 },
    lifetimeRedeemed: { type: Number, default: 0, min: 0 },
    rewardBalance: { type: Number, default: 0, min: 0 },
    tier: { type: String, enum: ['standard', 'silver', 'gold', 'platinum'], default: 'standard', index: true },
    lastActivityAt: Date,
    ...auditFields,
  },
  { timestamps: true }
);

guestWalletSchema.index({ hotelId: 1, guestId: 1 }, { unique: true });
guestWalletSchema.plugin(softDeletePlugin);

export const GuestWallet = mongoose.model<IGuestWallet>('GuestWallet', guestWalletSchema);
