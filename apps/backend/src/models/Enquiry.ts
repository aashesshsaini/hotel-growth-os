import mongoose, { Document, Schema } from 'mongoose';
import { EnquirySource, EnquiryStatus } from '@hotel-growth-os/shared';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IEnquiry extends Document {
  hotelId: mongoose.Types.ObjectId;
  guestName: string;
  phone: string;
  email?: string;
  source: EnquirySource;
  status: EnquiryStatus;
  checkInDate?: Date;
  checkOutDate?: Date;
  guestsCount?: number;
  roomTypePreference?: string;
  budget?: number;
  assignedTo?: mongoose.Types.ObjectId;
  followUpDate?: Date;
  notes?: string;
  lostReason?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const enquirySchema = new Schema<IEnquiry>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    guestName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true },
    source: {
      type: String,
      enum: ['whatsapp', 'phone', 'website', 'walk_in', 'instagram', 'facebook'],
      required: true,
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'interested', 'booked', 'lost'],
      default: 'new',
    },
    checkInDate: { type: Date },
    checkOutDate: { type: Date },
    guestsCount: { type: Number, min: 1 },
    roomTypePreference: { type: String },
    budget: { type: Number, min: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    followUpDate: { type: Date },
    notes: { type: String },
    lostReason: { type: String },
    ...auditFields,
  },
  { timestamps: true }
);

enquirySchema.index({ hotelId: 1, status: 1 });
enquirySchema.index({ hotelId: 1, source: 1 });
enquirySchema.index({ hotelId: 1, followUpDate: 1 });
enquirySchema.index({ hotelId: 1, createdAt: -1 });
enquirySchema.plugin(softDeletePlugin);

export const Enquiry = mongoose.model<IEnquiry>('Enquiry', enquirySchema);
