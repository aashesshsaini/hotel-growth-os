import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IReferralCode extends Document {
  hotelId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  code: string;
  referralLink: string;
  status: 'active' | 'expired' | 'disabled';
  maxUses: number;
  useCount: number;
  expiresAt?: Date;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const referralCodeSchema = new Schema<IReferralCode>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true, index: true },
    referralLink: { type: String, required: true },
    status: { type: String, enum: ['active', 'expired', 'disabled'], default: 'active', index: true },
    maxUses: { type: Number, default: 25, min: 1 },
    useCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, index: true },
    ...auditFields,
  },
  { timestamps: true }
);

referralCodeSchema.index({ hotelId: 1, code: 1 }, { unique: true });
referralCodeSchema.index({ hotelId: 1, guestId: 1, status: 1 });
referralCodeSchema.plugin(softDeletePlugin);

export const ReferralCode = mongoose.model<IReferralCode>('ReferralCode', referralCodeSchema);
