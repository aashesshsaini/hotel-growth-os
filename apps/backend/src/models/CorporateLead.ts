import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface ICorporateLead extends Document {
  hotelId: mongoose.Types.ObjectId;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  requirements?: string;
  estimatedRooms?: number;
  estimatedGuests?: number;
  eventDates?: { from?: Date; to?: Date };
  status: 'new' | 'contacted' | 'negotiating' | 'confirmed' | 'lost';
  followUpDate?: Date;
  notes?: string;
  totalValue?: number;
  paidAmount?: number;
  assignedTo?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const corporateLeadSchema = new Schema<ICorporateLead>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true },
    requirements: { type: String },
    estimatedRooms: { type: Number, min: 0 },
    estimatedGuests: { type: Number, min: 0 },
    eventDates: { from: Date, to: Date },
    status: {
      type: String,
      enum: ['new', 'contacted', 'negotiating', 'confirmed', 'lost'],
      default: 'new',
    },
    followUpDate: { type: Date },
    notes: { type: String },
    totalValue: { type: Number, min: 0 },
    paidAmount: { type: Number, default: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    ...auditFields,
  },
  { timestamps: true }
);

corporateLeadSchema.index({ hotelId: 1, status: 1 });
corporateLeadSchema.plugin(softDeletePlugin);

export const CorporateLead = mongoose.model<ICorporateLead>('CorporateLead', corporateLeadSchema);
