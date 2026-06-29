import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IHotel extends Document {
  name: string;
  slug: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  address: {
    street?: string;
    city: string;
    state: string;
    pincode?: string;
    country: string;
  };
  location?: {
    lat?: number;
    lng?: number;
  };
  amenities: string[];
  policies: {
    checkInTime?: string;
    checkOutTime?: string;
    cancellationPolicy?: string;
    childPolicy?: string;
    petPolicy?: string;
  };
  settings: {
    currency: string;
    timezone: string;
    googleReviewLink?: string;
    logo?: string;
    website?: string;
  };
  subscription?: {
    plan: 'starter' | 'professional' | 'enterprise' | 'standard' | 'growth';
    status: 'trial' | 'active' | 'expired' | 'inactive' | 'suspended';
    billingType: 'trial' | 'paid';
    trialEndsAt?: Date;
    renewalDate?: Date;
  };
  platformMetadata?: {
    healthScore?: number;
    brandName?: string;
    chainId?: mongoose.Types.ObjectId;
    groupId?: mongoose.Types.ObjectId;
    franchiseId?: mongoose.Types.ObjectId;
    whiteLabelDomain?: string;
    marketplaceEnabled?: boolean;
  };
  ownerId: mongoose.Types.ObjectId;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hotelSchema = new Schema<IHotel>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    whatsappNumber: { type: String },
    address: {
      street: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: String,
      country: { type: String, default: 'India' },
    },
    location: { lat: Number, lng: Number },
    amenities: [{ type: String }],
    policies: {
      checkInTime: { type: String, default: '14:00' },
      checkOutTime: { type: String, default: '11:00' },
      cancellationPolicy: String,
      childPolicy: String,
      petPolicy: String,
    },
    settings: {
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      googleReviewLink: String,
      logo: String,
      website: String,
    },
    subscription: {
      plan: { type: String, enum: ['starter', 'professional', 'enterprise', 'standard', 'growth'], default: 'starter', index: true },
      status: { type: String, enum: ['trial', 'active', 'expired', 'inactive', 'suspended'], default: 'trial', index: true },
      billingType: { type: String, enum: ['trial', 'paid'], default: 'trial', index: true },
      trialEndsAt: Date,
      renewalDate: { type: Date, index: true },
    },
    platformMetadata: {
      healthScore: { type: Number, min: 0, max: 100, default: 82 },
      brandName: String,
      chainId: { type: Schema.Types.ObjectId, index: true },
      groupId: { type: Schema.Types.ObjectId, index: true },
      franchiseId: { type: Schema.Types.ObjectId, index: true },
      whiteLabelDomain: String,
      marketplaceEnabled: { type: Boolean, default: false },
    },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    ...auditFields,
  },
  { timestamps: true }
);

hotelSchema.index({ slug: 1 });
hotelSchema.index({ ownerId: 1 });
hotelSchema.index({ 'address.city': 1 });
hotelSchema.index({ 'address.country': 1, 'subscription.status': 1 });
hotelSchema.index({ 'subscription.plan': 1, 'subscription.renewalDate': 1 });
hotelSchema.plugin(softDeletePlugin);

export const Hotel = mongoose.model<IHotel>('Hotel', hotelSchema);
