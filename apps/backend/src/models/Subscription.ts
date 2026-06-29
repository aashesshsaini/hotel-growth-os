import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled';
export type BillingCycle = 'monthly' | 'yearly';

export interface ISubscriptionHistoryItem {
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  actorId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface ISubscription extends Document {
  hotelId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  autoRenew: boolean;
  billingCycle: BillingCycle;
  usageStats: Record<string, unknown>;
  history: ISubscriptionHistoryItem[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionHistorySchema = new Schema<ISubscriptionHistoryItem>(
  {
    action: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const subscriptionSchema = new Schema<ISubscription>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    status: { type: String, enum: ['trial', 'active', 'expired', 'suspended', 'cancelled'], default: 'trial', index: true },
    startDate: { type: Date, default: Date.now, index: true },
    endDate: { type: Date },
    renewalDate: { type: Date, index: true },
    autoRenew: { type: Boolean, default: true, index: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly', index: true },
    usageStats: { type: Schema.Types.Mixed, default: {} },
    history: [subscriptionHistorySchema],
    ...auditFields,
  },
  { timestamps: true }
);

subscriptionSchema.index({ hotelId: 1, isDeleted: 1 });
subscriptionSchema.index({ status: 1, billingCycle: 1, renewalDate: 1 });
subscriptionSchema.plugin(softDeletePlugin);

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
