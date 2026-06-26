import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'interested',
  'follow_up_required',
  'proposal_sent',
  'negotiation',
  'converted',
  'lost',
  'not_interested',
] as const;

export const LEAD_SOURCES = [
  'website',
  'whatsapp',
  'phone_call',
  'walk_in',
  'google_business',
  'facebook',
  'instagram',
  'ota',
  'referral',
  'corporate',
  'wedding',
  'event',
  'campaign',
  'other',
] as const;

export const LEAD_TYPES = [
  'room_booking',
  'corporate_booking',
  'wedding_booking',
  'event_booking',
  'group_booking',
  'restaurant_enquiry',
  'general_enquiry',
] as const;

export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'hot'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LeadType = (typeof LEAD_TYPES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export interface ILeadTimelineItem {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface ILead extends Document {
  hotelId: mongoose.Types.ObjectId;
  leadNumber: string;
  fullName: string;
  phone: string;
  email?: string;
  companyName?: string;
  city?: string;
  source: LeadSource;
  leadType: LeadType;
  status: LeadStatus;
  priority: LeadPriority;
  estimatedValue?: number;
  expectedRooms?: number;
  expectedGuests?: number;
  checkInDate?: Date;
  checkOutDate?: Date;
  eventDate?: Date;
  assignedTo?: mongoose.Types.ObjectId;
  followUpDate?: Date;
  notes?: string;
  lostReason?: string;
  sourceHistory: Array<{ source: LeadSource; capturedAt: Date; notes?: string }>;
  timeline: ILeadTimelineItem[];
  enquiryId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  corporateLeadId?: mongoose.Types.ObjectId;
  eventLeadId?: mongoose.Types.ObjectId;
  convertedGuestId?: mongoose.Types.ObjectId;
  convertedBookingId?: mongoose.Types.ObjectId;
  convertedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    leadNumber: { type: String, required: true, trim: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    companyName: { type: String, trim: true, maxlength: 160 },
    city: { type: String, trim: true, maxlength: 100 },
    source: { type: String, enum: LEAD_SOURCES, required: true, index: true },
    leadType: { type: String, enum: LEAD_TYPES, required: true, index: true },
    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    priority: { type: String, enum: LEAD_PRIORITIES, default: 'medium', index: true },
    estimatedValue: { type: Number, min: 0 },
    expectedRooms: { type: Number, min: 0 },
    expectedGuests: { type: Number, min: 0 },
    checkInDate: { type: Date },
    checkOutDate: { type: Date },
    eventDate: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    followUpDate: { type: Date, index: true },
    notes: { type: String, maxlength: 3000 },
    lostReason: { type: String, maxlength: 1000 },
    sourceHistory: [
      {
        source: { type: String, enum: LEAD_SOURCES, required: true },
        capturedAt: { type: Date, default: Date.now },
        notes: { type: String },
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
    enquiryId: { type: Schema.Types.ObjectId, ref: 'Enquiry', index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    corporateLeadId: { type: Schema.Types.ObjectId, ref: 'CorporateLead', index: true },
    eventLeadId: { type: Schema.Types.ObjectId, ref: 'EventLead', index: true },
    convertedGuestId: { type: Schema.Types.ObjectId, ref: 'Guest' },
    convertedBookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    convertedAt: { type: Date },
    ...auditFields,
  },
  { timestamps: true }
);

leadSchema.index({ hotelId: 1, leadNumber: 1 }, { unique: true });
leadSchema.index({ hotelId: 1, status: 1, priority: 1 });
leadSchema.index({ hotelId: 1, assignedTo: 1, followUpDate: 1 });
leadSchema.index({ hotelId: 1, source: 1, leadType: 1 });
leadSchema.index({ hotelId: 1, fullName: 'text', phone: 'text', email: 'text', companyName: 'text', leadNumber: 'text' });
leadSchema.plugin(softDeletePlugin);

export const Lead = mongoose.model<ILead>('Lead', leadSchema);
