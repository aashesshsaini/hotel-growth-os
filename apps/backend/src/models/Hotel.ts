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
    displayName?: string;
    businessType?: string;
    description?: string;
    establishedYear?: number;
    businessRegistrationNumber?: string;
    coverImage?: string;
    branding?: {
      primaryColor?: string;
      secondaryColor?: string;
      tagline?: string;
      description?: string;
      signature?: string;
    };
    contact?: {
      secondaryPhone?: string;
      supportEmail?: string;
      reservationEmail?: string;
      googleMapUrl?: string;
    };
    preferences?: {
      dateFormat?: string;
      timeFormat?: string;
      language?: string;
      weekStartDay?: string;
      businessHours?: {
        openTime?: string;
        closeTime?: string;
        days?: string[];
      };
    };
    review?: {
      automationEnabled?: boolean;
      internalFeedbackEnabled?: boolean;
      reminderEnabled?: boolean;
      maxReminderCount?: number;
      delayMinutes?: number;
      signature?: string;
    };
    communication?: {
      whatsappBusinessNumber?: string;
      senderName?: string;
      businessEmail?: string;
      replyToEmail?: string;
      emailSignature?: string;
      defaultSenderName?: string;
      enabled?: boolean;
    };
    notifications?: {
      bookings?: boolean;
      reviews?: boolean;
      payments?: boolean;
      maintenance?: boolean;
      staff?: boolean;
      marketing?: boolean;
    };
    security?: {
      twoFactorEnabled?: boolean;
      sessionManagementEnabled?: boolean;
    };
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
      displayName: String,
      businessType: { type: String, default: 'hotel' },
      description: String,
      establishedYear: { type: Number, min: 1800 },
      businessRegistrationNumber: String,
      coverImage: String,
      branding: {
        primaryColor: { type: String, default: '#4f46e5' },
        secondaryColor: { type: String, default: '#0f172a' },
        tagline: String,
        description: String,
        signature: String,
      },
      contact: {
        secondaryPhone: String,
        supportEmail: { type: String, lowercase: true, trim: true },
        reservationEmail: { type: String, lowercase: true, trim: true },
        googleMapUrl: String,
      },
      preferences: {
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        timeFormat: { type: String, default: '24h' },
        language: { type: String, default: 'en' },
        weekStartDay: { type: String, default: 'monday' },
        businessHours: {
          openTime: { type: String, default: '09:00' },
          closeTime: { type: String, default: '18:00' },
          days: { type: [String], default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] },
        },
      },
      review: {
        automationEnabled: { type: Boolean, default: true },
        internalFeedbackEnabled: { type: Boolean, default: true },
        reminderEnabled: { type: Boolean, default: true },
        maxReminderCount: { type: Number, default: 2, min: 0, max: 10 },
        delayMinutes: { type: Number, default: 120, min: 0 },
        signature: String,
      },
      communication: {
        whatsappBusinessNumber: String,
        senderName: String,
        businessEmail: { type: String, lowercase: true, trim: true },
        replyToEmail: { type: String, lowercase: true, trim: true },
        emailSignature: String,
        defaultSenderName: String,
        enabled: { type: Boolean, default: true },
      },
      notifications: {
        bookings: { type: Boolean, default: true },
        reviews: { type: Boolean, default: true },
        payments: { type: Boolean, default: true },
        maintenance: { type: Boolean, default: true },
        staff: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
      },
      security: {
        twoFactorEnabled: { type: Boolean, default: false },
        sessionManagementEnabled: { type: Boolean, default: false },
      },
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
