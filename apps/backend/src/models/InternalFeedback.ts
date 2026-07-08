import mongoose, { Document, Schema } from "mongoose";
import {
  INTERNAL_FEEDBACK_STATUSES,
  InternalFeedbackStatus,
} from "@hotel-growth-os/shared";
import { auditFields, softDeletePlugin } from "../utils/schemaHelpers";
import { IReviewGrowthTimelineEntry } from "./ReviewCampaign";

export interface IInternalFeedback extends Document {
  hotelId: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  reviewRequestId?: mongoose.Types.ObjectId;
  guestReviewId?: mongoose.Types.ObjectId;
  rating?: number;
  category: string; // flexible, owner-editable categories
  feedback: string;
  submitterName?: string;
  submitterPhone?: string;
  status: InternalFeedbackStatus;
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  closedAt?: Date;
  resolutionNotes?: string;
  tags: string[];
  timeline: IReviewGrowthTimelineEntry[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const timelineSchema = new Schema<IReviewGrowthTimelineEntry>(
  {
    action: { type: String, required: true },
    message: String,
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const internalFeedbackSchema = new Schema<IInternalFeedback>(
  {
    hotelId: {
      type: Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
      index: true,
    },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    reviewRequestId: { type: Schema.Types.ObjectId, ref: "ReviewRequest" },
    guestReviewId: { type: Schema.Types.ObjectId, ref: "GuestReview" },
    rating: { type: Number, min: 1, max: 5, index: true },
    category: { type: String, default: "service", index: true },
    feedback: { type: String, required: true },
    submitterName: { type: String, trim: true },
    submitterPhone: { type: String, trim: true },
    status: {
      type: String,
      enum: INTERNAL_FEEDBACK_STATUSES,
      default: "OPEN",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    resolvedAt: Date,
    closedAt: Date,
    resolutionNotes: String,
    tags: [{ type: String }],
    timeline: { type: [timelineSchema], default: [] },
    ...auditFields,
  },
  { timestamps: true },
);

internalFeedbackSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
internalFeedbackSchema.index({ hotelId: 1, category: 1, createdAt: -1 });
internalFeedbackSchema.index({ hotelId: 1, rating: 1, createdAt: -1 });
internalFeedbackSchema.index({ hotelId: 1, guestId: 1, createdAt: -1 });
internalFeedbackSchema.index({ hotelId: 1, bookingId: 1 });
internalFeedbackSchema.index({ feedback: "text", resolutionNotes: "text" });
internalFeedbackSchema.plugin(softDeletePlugin);

export const InternalFeedback = mongoose.model<IInternalFeedback>(
  "InternalFeedback",
  internalFeedbackSchema,
);
