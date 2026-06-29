import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export interface IPlanFeatures {
  crmAccess: boolean;
  analyticsAccess: boolean;
  apiAccess: boolean;
  multiBranchSupport: boolean;
  prioritySupport: boolean;
}

export interface IPlan extends Document {
  name: 'Starter' | 'Pro' | 'Enterprise' | 'Custom';
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  trialDays: number;
  maxHotelsAllowed: number;
  maxStaffAllowed: number;
  maxRoomsAllowed: number;
  features: IPlanFeatures;
  isActive: boolean;
  isDefault: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const planFeaturesSchema = new Schema<IPlanFeatures>(
  {
    crmAccess: { type: Boolean, default: false },
    analyticsAccess: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    multiBranchSupport: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
  },
  { _id: false }
);

const planSchema = new Schema<IPlan>(
  {
    name: { type: String, enum: ['Starter', 'Pro', 'Enterprise', 'Custom'], required: true, index: true },
    description: { type: String, maxlength: 1000 },
    priceMonthly: { type: Number, min: 0, default: 0 },
    priceYearly: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    trialDays: { type: Number, min: 0, default: 14 },
    maxHotelsAllowed: { type: Number, min: 1, default: 1 },
    maxStaffAllowed: { type: Number, min: 1, default: 10 },
    maxRoomsAllowed: { type: Number, min: 1, default: 50 },
    features: { type: planFeaturesSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },
    ...auditFields,
  },
  { timestamps: true }
);

planSchema.index({ name: 1, isDeleted: 1 });
planSchema.plugin(softDeletePlugin);

export const Plan = mongoose.model<IPlan>('Plan', planSchema);
