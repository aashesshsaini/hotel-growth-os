import mongoose, { Document, Schema } from 'mongoose';
import { BookingStatus, PaymentStatus } from '@hotel-growth-os/shared';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IBooking extends Document {
  hotelId: mongoose.Types.ObjectId;
  bookingNumber: string;
  guestId: mongoose.Types.ObjectId;
  enquiryId?: mongoose.Types.ObjectId;
  checkInDate: Date;
  checkOutDate: Date;
  adults: number;
  children: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  paidAmount: number;
  discount: number;
  specialRequests?: string;
  assignedTo?: mongoose.Types.ObjectId;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    bookingNumber: { type: String, required: true, unique: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry' },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    adults: { type: Number, required: true, min: 1 },
    children: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    specialRequests: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedInAt: { type: Date },
    checkedOutAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    ...auditFields,
  },
  { timestamps: true }
);

bookingSchema.index({ hotelId: 1, status: 1 });
bookingSchema.index({ hotelId: 1, checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.plugin(softDeletePlugin);

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
