import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethod } from '@hotel-growth-os/shared';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IPayment extends Document {
  hotelId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  upiReference?: string;
  notes?: string;
  paidAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['cash', 'upi', 'razorpay', 'card', 'bank_transfer'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    transactionId: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    upiReference: { type: String },
    notes: { type: String },
    paidAt: { type: Date },
    ...auditFields,
  },
  { timestamps: true }
);

paymentSchema.index({ hotelId: 1, bookingId: 1 });
paymentSchema.index({ hotelId: 1, status: 1 });
paymentSchema.index({ hotelId: 1, createdAt: -1 });
paymentSchema.plugin(softDeletePlugin);

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
