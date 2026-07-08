import mongoose, { Document, Schema } from "mongoose";
import { auditFields, softDeletePlugin } from "../utils/schemaHelpers";

export interface IFeedbackCategory extends Document {
  hotelId?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackCategorySchema = new Schema<IFeedbackCategory>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: "Hotel", index: true },
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, index: true },
    description: { type: String },
    ...auditFields,
  },
  { timestamps: true },
);

feedbackCategorySchema.index(
  { hotelId: 1, slug: 1 },
  { unique: true, sparse: true },
);
feedbackCategorySchema.plugin(softDeletePlugin);

export const FeedbackCategory = mongoose.model<IFeedbackCategory>(
  "FeedbackCategory",
  feedbackCategorySchema,
);
