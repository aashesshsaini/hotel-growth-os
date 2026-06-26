import mongoose, { Document, Schema } from 'mongoose';
import { BookingStatus, PaymentStatus } from '@hotel-growth-os/shared';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export const BOOKING_STATUSES = [
  'inquiry',
  'reserved',
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'completed',
  'cancelled',
  'no_show',
] as const;

export const BOOKING_TYPES = [
  'individual',
  'corporate',
  'wedding',
  'group',
  'walk_in',
  'online',
  'ota',
  'direct',
] as const;

export type EnhancedBookingStatus = (typeof BOOKING_STATUSES)[number];
export type BookingType = (typeof BOOKING_TYPES)[number];

export interface IBookingTimelineItem {
  action: string;
  message?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IBookingExtraService {
  name: string;
  amount: number;
  quantity: number;
}

export interface IBookingDocument {
  url: string;
  publicId?: string;
  documentType?: string;
  uploadedAt?: Date;
}

export interface IBooking extends Document {
  hotelId: mongoose.Types.ObjectId;
  bookingNumber: string;
  guestId: mongoose.Types.ObjectId;
  enquiryId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  corporateLeadId?: mongoose.Types.ObjectId;
  eventLeadId?: mongoose.Types.ObjectId;
  roomId?: mongoose.Types.ObjectId;
  roomTypeId?: mongoose.Types.ObjectId;
  bookingType: BookingType;
  source: string;
  checkInDate: Date;
  checkOutDate: Date;
  nights: number;
  roomCount: number;
  adults: number;
  children: number;
  status: BookingStatus | EnhancedBookingStatus;
  paymentStatus: PaymentStatus;
  roomRate?: number;
  totalAmount: number;
  paidAmount: number;
  discount: number;
  taxAmount: number;
  extraCharges: number;
  couponCode?: string;
  specialRequests?: string;
  guestPreferences?: string;
  internalNotes?: string;
  notes?: string;
  extraServices: IBookingExtraService[];
  documents: IBookingDocument[];
  timeline: IBookingTimelineItem[];
  assignedTo?: mongoose.Types.ObjectId;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  expectedArrivalTime?: string;
  expectedDepartureTime?: string;
  isLateCheckIn: boolean;
  isLateCheckOut: boolean;
  cancelledAt?: Date;
  cancellationReason?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    bookingNumber: { type: String, required: true, unique: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry' },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    corporateLeadId: { type: Schema.Types.ObjectId, ref: 'CorporateLead' },
    eventLeadId: { type: Schema.Types.ObjectId, ref: 'EventLead' },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', index: true },
    bookingType: {
      type: String,
      enum: BOOKING_TYPES,
      default: 'individual',
      index: true,
    },
    source: { type: String, default: 'direct', trim: true, index: true },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    nights: { type: Number, default: 1, min: 1 },
    roomCount: { type: Number, default: 1, min: 1 },
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, default: 0 },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'reserved',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    roomRate: { type: Number, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    extraCharges: { type: Number, default: 0 },
    couponCode: { type: String, trim: true, uppercase: true },
    specialRequests: { type: String },
    guestPreferences: { type: String },
    internalNotes: { type: String },
    notes: { type: String },
    extraServices: [
      {
        name: { type: String, required: true, trim: true },
        amount: { type: Number, default: 0, min: 0 },
        quantity: { type: Number, default: 1, min: 1 },
      },
    ],
    documents: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        documentType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    timeline: [
      {
        action: { type: String, required: true },
        message: { type: String },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedInAt: { type: Date },
    checkedOutAt: { type: Date },
    expectedArrivalTime: { type: String },
    expectedDepartureTime: { type: String },
    isLateCheckIn: { type: Boolean, default: false },
    isLateCheckOut: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    ...auditFields,
  },
  { timestamps: true }
);

bookingSchema.index({ hotelId: 1, status: 1 });
bookingSchema.index({ hotelId: 1, checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ hotelId: 1, guestId: 1, createdAt: -1 });
bookingSchema.index({ hotelId: 1, paymentStatus: 1 });

bookingSchema.pre('save', function syncBookingDerivedFields(next) {
  const checkIn = this.checkInDate ? new Date(this.checkInDate).getTime() : 0;
  const checkOut = this.checkOutDate ? new Date(this.checkOutDate).getTime() : 0;
  if (checkIn && checkOut && checkOut > checkIn) {
    this.nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
  }
  if (this.totalAmount <= 0 && this.roomRate) {
    this.totalAmount =
      this.roomRate * (this.nights || 1) * (this.roomCount || 1) +
      (this.taxAmount || 0) +
      (this.extraCharges || 0) -
      (this.discount || 0);
  }
  const pending = Math.max((this.totalAmount || 0) - (this.paidAmount || 0), 0);
  if ((this.paidAmount || 0) <= 0) this.paymentStatus = 'unpaid';
  else if (pending > 0) this.paymentStatus = 'partially_paid';
  else this.paymentStatus = 'paid';
  next();
});
bookingSchema.plugin(softDeletePlugin);

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
