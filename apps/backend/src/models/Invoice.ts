import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'failed' | 'cancelled';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IInvoiceRefund {
  refundId: string;
  amount: number;
  reason?: string;
  status: 'requested' | 'processed' | 'rejected';
  processedAt?: Date;
}

export interface IInvoiceHistoryItem {
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  actorId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IInvoice extends Document {
  invoiceId: string;
  invoiceNumber: string;
  hotelId: mongoose.Types.ObjectId;
  subscriptionId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  billingCycle: 'monthly' | 'yearly';
  status: InvoiceStatus;
  amountSubtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  issuedDate: Date;
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  transactionId?: string;
  gateway?: 'stripe' | 'razorpay' | 'manual' | 'none';
  paymentDate?: Date;
  failureReason?: string;
  retryAttempts: number;
  items: IInvoiceItem[];
  refunds: IInvoiceRefund[];
  history: IInvoiceHistoryItem[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, min: 1, default: 1 },
    unitPrice: { type: Number, min: 0, default: 0 },
    totalPrice: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const invoiceRefundSchema = new Schema<IInvoiceRefund>(
  {
    refundId: { type: String, required: true },
    amount: { type: Number, min: 0, required: true },
    reason: String,
    status: { type: String, enum: ['requested', 'processed', 'rejected'], default: 'requested' },
    processedAt: Date,
  },
  { _id: false }
);

const invoiceHistorySchema = new Schema<IInvoiceHistoryItem>(
  {
    action: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceId: { type: String, required: true, unique: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true, index: true },
    status: { type: String, enum: ['draft', 'issued', 'paid', 'overdue', 'failed', 'cancelled'], default: 'draft', index: true },
    amountSubtotal: { type: Number, min: 0, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'INR', uppercase: true },
    issuedDate: { type: Date, default: Date.now, index: true },
    dueDate: { type: Date, required: true, index: true },
    paidDate: Date,
    paymentMethod: String,
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'], default: 'pending', index: true },
    transactionId: String,
    gateway: { type: String, enum: ['stripe', 'razorpay', 'manual', 'none'], default: 'none' },
    paymentDate: Date,
    failureReason: String,
    retryAttempts: { type: Number, min: 0, default: 0 },
    items: [invoiceItemSchema],
    refunds: [invoiceRefundSchema],
    history: [invoiceHistorySchema],
    ...auditFields,
  },
  { timestamps: true }
);

invoiceSchema.index({ status: 1, issuedDate: -1 });
invoiceSchema.index({ planId: 1, status: 1 });
invoiceSchema.index({ hotelId: 1, issuedDate: -1 });
invoiceSchema.plugin(softDeletePlugin);

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
