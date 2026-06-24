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
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    ...auditFields,
  },
  { timestamps: true }
);

hotelSchema.index({ slug: 1 });
hotelSchema.index({ ownerId: 1 });
hotelSchema.index({ 'address.city': 1 });
hotelSchema.plugin(softDeletePlugin);

export const Hotel = mongoose.model<IHotel>('Hotel', hotelSchema);
