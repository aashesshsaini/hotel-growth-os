import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const FESTIVAL_CATEGORIES = ['festival', 'national_holiday', 'global_holiday', 'seasonal_offer', 'weekend_offer', 'custom'] as const;

export interface IFestival extends Document {
  hotelId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  date: Date;
  category: (typeof FESTIVAL_CATEGORIES)[number];
  defaultBanner?: string;
  defaultMessage: string;
  defaultOffer: string;
  isBuiltIn: boolean;
  isRecurring: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const festivalSchema = new Schema<IFestival>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    date: { type: Date, required: true, index: true },
    category: { type: String, enum: FESTIVAL_CATEGORIES, default: 'festival', index: true },
    defaultBanner: String,
    defaultMessage: { type: String, required: true },
    defaultOffer: { type: String, required: true },
    isBuiltIn: { type: Boolean, default: false },
    isRecurring: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
    ...auditFields,
  },
  { timestamps: true }
);

festivalSchema.index({ hotelId: 1, slug: 1 }, { unique: true });
festivalSchema.index({ hotelId: 1, category: 1, isActive: 1 });
festivalSchema.plugin(softDeletePlugin);

export const Festival = mongoose.model<IFestival>('Festival', festivalSchema);
