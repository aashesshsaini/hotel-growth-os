import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IReviewTimelineEntry {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface IReviewNote {
  text: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface IReviewDepartmentRatings {
  frontOffice?: number;
  housekeeping?: number;
  restaurant?: number;
  spa?: number;
  maintenance?: number;
}

export interface IReview extends Document {
  hotelId: mongoose.Types.ObjectId;
  reviewNumber?: string;
  bookingId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  status: string;
  source: string;
  requestChannel?: string;
  rating?: number;
  staffRating?: number;
  departmentRatings?: IReviewDepartmentRatings;
  feedback?: string;
  isPositive: boolean;
  sentimentTags: string[];
  googleReviewSent: boolean;
  googleReviewLinkSentAt?: Date;
  managerNotified: boolean;
  managerReply?: string;
  repliedAt?: Date;
  repliedBy?: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  requestSentAt?: Date;
  submittedAt?: Date;
  escalatedAt?: Date;
  resolvedAt?: Date;
  publicToken?: string;
  internalNotes?: string;
  notes: IReviewNote[];
  timeline: IReviewTimelineEntry[];
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    reviewNumber: { type: String, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    status: {
      type: String,
      enum: ['pending_request', 'requested', 'submitted', 'escalated', 'resolved', 'declined'],
      default: 'pending_request',
      index: true,
    },
    source: {
      type: String,
      enum: ['google', 'website', 'ota_booking', 'ota_mmt', 'ota_goibibo', 'ota_agoda', 'ota_expedia', 'internal', 'walk_in', 'other'],
      default: 'internal',
      index: true,
    },
    requestChannel: {
      type: String,
      enum: ['whatsapp', 'sms', 'email', 'in_stay', 'staff', 'website'],
    },
    rating: { type: Number, min: 1, max: 5 },
    staffRating: { type: Number, min: 1, max: 5 },
    departmentRatings: {
      frontOffice: { type: Number, min: 1, max: 5 },
      housekeeping: { type: Number, min: 1, max: 5 },
      restaurant: { type: Number, min: 1, max: 5 },
      spa: { type: Number, min: 1, max: 5 },
      maintenance: { type: Number, min: 1, max: 5 },
    },
    feedback: { type: String },
    isPositive: { type: Boolean, default: true },
    sentimentTags: [{ type: String }],
    googleReviewSent: { type: Boolean, default: false },
    googleReviewLinkSentAt: { type: Date },
    managerNotified: { type: Boolean, default: false },
    managerReply: { type: String },
    repliedAt: { type: Date },
    repliedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    requestSentAt: { type: Date },
    submittedAt: { type: Date },
    escalatedAt: { type: Date },
    resolvedAt: { type: Date },
    publicToken: { type: String, index: true, sparse: true },
    internalNotes: { type: String },
    notes: [
      {
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    timeline: [
      {
        action: { type: String, required: true },
        message: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    ...auditFields,
  },
  { timestamps: true }
);

reviewSchema.index({ hotelId: 1, rating: 1 });
reviewSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ hotelId: 1, source: 1 });
reviewSchema.index({ hotelId: 1, bookingId: 1 }, { unique: true });
reviewSchema.index({ hotelId: 1, guestId: 1, createdAt: -1 });

reviewSchema.pre('save', async function generateReviewNumber(next) {
  if (this.reviewNumber || !this.hotelId) return next();
  const prefix = `RV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const ReviewModel = this.constructor as mongoose.Model<IReview>;
  const count = await ReviewModel.countDocuments({ hotelId: this.hotelId, reviewNumber: { $regex: `^${prefix}` } });
  this.reviewNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  next();
});

reviewSchema.plugin(softDeletePlugin);

export const Review = mongoose.model<IReview>('Review', reviewSchema);
