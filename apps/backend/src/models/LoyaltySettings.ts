import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface ILoyaltySettings extends Document {
  hotelId: mongoose.Types.ObjectId;
  referralEnabled: boolean;
  referralRewardType: 'flat' | 'percentage' | 'coupon' | 'free_upgrade' | 'free_breakfast';
  flatReward: number;
  percentageReward: number;
  couponReward?: string;
  rewardExpiryDays: number;
  referralTerms?: string;
  maximumReferrals: number;
  minimumBookingAmount: number;
  referralValidityDays: number;
  loyaltyEnabled: boolean;
  pointsPerBooking: number;
  bonusPoints: number;
  birthdayBonus: number;
  festivalBonus: number;
  vipMultiplier: number;
  redemptionMinimumPoints: number;
  redemptionValuePerPoint: number;
  pointExpiryDays: number;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltySettingsSchema = new Schema<ILoyaltySettings>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, unique: true, index: true },
    referralEnabled: { type: Boolean, default: true },
    referralRewardType: { type: String, enum: ['flat', 'percentage', 'coupon', 'free_upgrade', 'free_breakfast'], default: 'coupon' },
    flatReward: { type: Number, default: 500, min: 0 },
    percentageReward: { type: Number, default: 10, min: 0, max: 100 },
    couponReward: { type: String, default: 'REFER10' },
    rewardExpiryDays: { type: Number, default: 90, min: 1 },
    referralTerms: String,
    maximumReferrals: { type: Number, default: 25, min: 1 },
    minimumBookingAmount: { type: Number, default: 1000, min: 0 },
    referralValidityDays: { type: Number, default: 60, min: 1 },
    loyaltyEnabled: { type: Boolean, default: true },
    pointsPerBooking: { type: Number, default: 100, min: 0 },
    bonusPoints: { type: Number, default: 0, min: 0 },
    birthdayBonus: { type: Number, default: 250, min: 0 },
    festivalBonus: { type: Number, default: 150, min: 0 },
    vipMultiplier: { type: Number, default: 1.5, min: 1 },
    redemptionMinimumPoints: { type: Number, default: 500, min: 0 },
    redemptionValuePerPoint: { type: Number, default: 1, min: 0 },
    pointExpiryDays: { type: Number, default: 365, min: 1 },
    ...auditFields,
  },
  { timestamps: true }
);

loyaltySettingsSchema.plugin(softDeletePlugin);

export const LoyaltySettings = mongoose.model<ILoyaltySettings>('LoyaltySettings', loyaltySettingsSchema);
