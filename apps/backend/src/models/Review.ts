import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IReview extends Document {
  hotelId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  rating: number;
  feedback?: string;
  isPositive: boolean;
  googleReviewSent: boolean;
  managerNotified: boolean;
  requestSentAt?: Date;
  submittedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    guestId: { type: Schema.Types.ObjectId, ref: 'Guest', required: true },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    isPositive: { type: Boolean, default: true },
    googleReviewSent: { type: Boolean, default: false },
    managerNotified: { type: Boolean, default: false },
    requestSentAt: { type: Date },
    submittedAt: { type: Date },
    ...auditFields,
  },
  { timestamps: true }
);

reviewSchema.index({ hotelId: 1, rating: 1 });
reviewSchema.index({ hotelId: 1, bookingId: 1 }, { unique: true });
reviewSchema.plugin(softDeletePlugin);

export const Review = mongoose.model<IReview>('Review', reviewSchema);
