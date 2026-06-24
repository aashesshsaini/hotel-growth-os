import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export interface IEventLead extends Document {
  hotelId: mongoose.Types.ObjectId;
  eventName: string;
  eventType: string;
  contactPerson: string;
  phone: string;
  email?: string;
  eventDate: Date;
  guestCount: number;
  packageName?: string;
  packagePrice?: number;
  status: 'new' | 'contacted' | 'quoted' | 'confirmed' | 'completed' | 'lost';
  followUpDate?: Date;
  followUpReminder?: Date;
  notes?: string;
  assignedTo?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const eventLeadSchema = new Schema<IEventLead>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    eventName: { type: String, required: true, trim: true },
    eventType: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true },
    eventDate: { type: Date, required: true },
    guestCount: { type: Number, required: true, min: 1 },
    packageName: { type: String },
    packagePrice: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['new', 'contacted', 'quoted', 'confirmed', 'completed', 'lost'],
      default: 'new',
    },
    followUpDate: { type: Date },
    followUpReminder: { type: Date },
    notes: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    ...auditFields,
  },
  { timestamps: true }
);

eventLeadSchema.index({ hotelId: 1, eventDate: 1 });
eventLeadSchema.index({ hotelId: 1, status: 1 });
eventLeadSchema.plugin(softDeletePlugin);

export const EventLead = mongoose.model<IEventLead>('EventLead', eventLeadSchema);
