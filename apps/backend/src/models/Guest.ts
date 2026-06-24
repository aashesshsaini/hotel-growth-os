import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export const GUEST_TYPES = [
  'individual',
  'family',
  'corporate',
  'event_guest',
  'walk_in',
  'ota_guest',
  'vip',
] as const;

export const GUEST_SOURCES = [
  'manual',
  'whatsapp',
  'website',
  'phone',
  'walk_in',
  'instagram',
  'facebook',
  'google_business',
  'ota',
  'referral',
  'corporate',
  'event',
  'other',
] as const;

export const FOOD_PREFERENCES = ['veg', 'non_veg', 'vegan', 'jain', 'no_preference'] as const;

export const ID_PROOF_TYPES = [
  'aadhaar',
  'pan',
  'passport',
  'driving_license',
  'voter_id',
  'other',
] as const;

export type GuestType = (typeof GUEST_TYPES)[number];
export type GuestSource = (typeof GUEST_SOURCES)[number];
export type FoodPreference = (typeof FOOD_PREFERENCES)[number];
export type IdProofType = (typeof ID_PROOF_TYPES)[number];

export interface IGuestDocument {
  _id?: mongoose.Types.ObjectId;
  url: string;
  publicId?: string;
  documentType?: string;
  uploadedAt?: Date;
}

export interface IGuest extends Document {
  hotelId: mongoose.Types.ObjectId;
  fullName: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  gender?: string;
  dateOfBirth?: Date;
  anniversaryDate?: Date;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  idProofType?: IdProofType;
  idProofNumber?: string;
  idProofImages: IGuestDocument[];
  profileImage?: string;
  guestType: GuestType;
  source: GuestSource;
  preferences: string[];
  foodPreference?: FoodPreference;
  roomPreference?: string;
  specialRequests?: string;
  tags: string[];
  notes?: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowCount: number;
  totalSpend: number;
  averageSpend: number;
  lastBookingDate?: Date;
  lastStayDate?: Date;
  lastEnquiryDate?: Date;
  lastReviewRating?: number;
  visitCount: number;
  lastVisitAt?: Date;
  isRepeatGuest: boolean;
  isVip: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string;
  loyaltyPoints: number;
  marketingConsent: boolean;
  whatsappConsent: boolean;
  emailConsent: boolean;
  metadata?: Record<string, unknown>;
  idProof?: { type?: string; number?: string };
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const guestDocumentSchema = new Schema<IGuestDocument>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    documentType: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const guestSchema = new Schema<IGuest>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    alternatePhone: { type: String, trim: true },
    gender: { type: String },
    dateOfBirth: { type: Date, index: true },
    anniversaryDate: { type: Date, index: true },
    city: { type: String, trim: true, index: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    address: { type: String },
    idProofType: { type: String, enum: ID_PROOF_TYPES },
    idProofNumber: { type: String, trim: true },
    idProofImages: [guestDocumentSchema],
    profileImage: { type: String },
    guestType: { type: String, enum: GUEST_TYPES, default: 'individual', index: true },
    source: { type: String, enum: GUEST_SOURCES, default: 'manual', index: true },
    preferences: [{ type: String }],
    foodPreference: { type: String, enum: FOOD_PREFERENCES, default: 'no_preference' },
    roomPreference: { type: String },
    specialRequests: { type: String },
    tags: [{ type: String }],
    notes: { type: String },
    totalBookings: { type: Number, default: 0, min: 0 },
    completedBookings: { type: Number, default: 0, min: 0 },
    cancelledBookings: { type: Number, default: 0, min: 0 },
    noShowCount: { type: Number, default: 0, min: 0 },
    totalSpend: { type: Number, default: 0, min: 0, index: true },
    averageSpend: { type: Number, default: 0, min: 0 },
    lastBookingDate: { type: Date, index: true },
    lastStayDate: { type: Date },
    lastEnquiryDate: { type: Date },
    lastReviewRating: { type: Number, min: 0, max: 5 },
    visitCount: { type: Number, default: 0 },
    lastVisitAt: { type: Date },
    isRepeatGuest: { type: Boolean, default: false, index: true },
    isVip: { type: Boolean, default: false, index: true },
    isBlacklisted: { type: Boolean, default: false, index: true },
    blacklistReason: { type: String },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    marketingConsent: { type: Boolean, default: false },
    whatsappConsent: { type: Boolean, default: false },
    emailConsent: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
    idProof: { type: { type: String }, number: String },
    ...auditFields,
  },
  { timestamps: true }
);

guestSchema.index({ hotelId: 1, phone: 1 }, { unique: true });
guestSchema.index({ hotelId: 1, email: 1 }, { unique: true, sparse: true });
guestSchema.index({ hotelId: 1, guestType: 1 });
guestSchema.index({ hotelId: 1, isRepeatGuest: 1 });
guestSchema.index({ hotelId: 1, totalSpend: -1 });
guestSchema.index({ hotelId: 1, createdAt: -1 });
guestSchema.index({ hotelId: 1, fullName: 'text', phone: 'text', email: 'text', city: 'text' });

guestSchema.pre('save', function syncName(next) {
  if (this.fullName) {
    this.name = this.fullName;
    if (!this.firstName) {
      const parts = this.fullName.trim().split(/\s+/);
      this.firstName = parts[0];
      this.lastName = parts.slice(1).join(' ');
    }
  } else if (this.name && !this.fullName) {
    this.fullName = this.name;
  }
  if (this.isVip) this.guestType = 'vip';
  if (this.visitCount >= 2 || this.totalBookings >= 2) this.isRepeatGuest = true;
  next();
});

guestSchema.plugin(softDeletePlugin);

export const Guest = mongoose.model<IGuest>('Guest', guestSchema);
