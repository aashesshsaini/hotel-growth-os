import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethod } from '@hotel-growth-os/shared';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IPaymentTimelineEntry {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface IPaymentNote {
  text: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface IPayment extends Document {
  hotelId: mongoose.Types.ObjectId;
  paymentNumber?: string;
  invoiceNumber?: string;
  bookingId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  amount: number;
  method: PaymentMethod;
  paymentType: string;
  status: string;
  invoiceStatus: string;
  transactionId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  upiReference?: string;
  bankReference?: string;
  cardLast4?: string;
  gatewayProvider?: string;
  refundedAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  receivedBy?: mongoose.Types.ObjectId;
  dueAmountSnapshot?: number;
  notes?: string;
  internalNotes?: string;
  timeline: IPaymentTimelineEntry[];
  paymentNotes: IPaymentNote[];
  paidAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    paymentNumber: { type: String, index: true },
    invoiceNumber: { type: String, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'net_banking', 'wallet', 'razorpay', 'bank_transfer', 'other'],
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['advance', 'partial', 'full', 'refund', 'adjustment'],
      default: 'partial',
    },
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    invoiceStatus: {
      type: String,
      enum: ['draft', 'issued', 'sent', 'paid', 'void'],
      default: 'draft',
    },
    transactionId: { type: String },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    upiReference: { type: String },
    bankReference: { type: String },
    cardLast4: { type: String },
    gatewayProvider: { type: String },
    refundedAmount: { type: Number, min: 0 },
    refundReason: { type: String },
    refundedAt: { type: Date },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    dueAmountSnapshot: { type: Number, min: 0 },
    notes: { type: String },
    internalNotes: { type: String },
    timeline: [
      {
        action: { type: String, required: true },
        message: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    paymentNotes: [
      {
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    paidAt: { type: Date },
    ...auditFields,
  },
  { timestamps: true }
);

paymentSchema.index({ hotelId: 1, bookingId: 1 });
paymentSchema.index({ hotelId: 1, guestId: 1, createdAt: -1 });
paymentSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ hotelId: 1, method: 1 });
paymentSchema.index({ hotelId: 1, paidAt: -1 });

paymentSchema.pre('save', async function generatePaymentNumber(next) {
  if (this.paymentNumber || !this.hotelId) return next();
  const prefix = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const PaymentModel = this.constructor as mongoose.Model<IPayment>;
  const count = await PaymentModel.countDocuments({ hotelId: this.hotelId, paymentNumber: { $regex: `^${prefix}` } });
  this.paymentNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  next();
});

paymentSchema.plugin(softDeletePlugin);

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
