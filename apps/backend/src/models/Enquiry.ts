import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export const ENQUIRY_STATUSES = [
  'new',
  'assigned',
  'contacted',
  'waiting_for_response',
  'follow_up_required',
  'converted_to_lead',
  'converted_to_booking',
  'closed',
  'lost',
  'spam',
  'interested',
  'booked',
] as const;

export const ENQUIRY_SOURCES = [
  'website_form',
  'website',
  'whatsapp',
  'phone_call',
  'phone',
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

export const ENQUIRY_TYPES = [
  'room_booking',
  'corporate_booking',
  'wedding_booking',
  'event_booking',
  'group_booking',
  'restaurant_enquiry',
  'general_enquiry',
] as const;

export const ENQUIRY_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];
export type EnquiryPriority = (typeof ENQUIRY_PRIORITIES)[number];

export interface IEnquiryTimelineItem {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface IEnquiry extends Document {
  hotelId: mongoose.Types.ObjectId;
  guestName: string;
  phone: string;
  email?: string;
  source: EnquirySource;
  status: EnquiryStatus;
  enquiryType: EnquiryType;
  priority: EnquiryPriority;
  checkInDate?: Date;
  checkOutDate?: Date;
  guestsCount?: number;
  roomTypePreference?: string;
  budget?: number;
  assignedTo?: mongoose.Types.ObjectId;
  followUpDate?: Date;
  notes?: string;
  internalNotes?: string;
  lostReason?: string;
  sourceHistory: Array<{ source: EnquirySource; capturedAt: Date; notes?: string }>;
  timeline: IEnquiryTimelineItem[];
  convertedLeadId?: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  convertedGuestId?: mongoose.Types.ObjectId;
  convertedBookingId?: mongoose.Types.ObjectId;
  convertedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
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
      enum: ENQUIRY_SOURCES,
      required: true,
    },
    status: {
      type: String,
      enum: ENQUIRY_STATUSES,
      default: 'new',
    },
    enquiryType: {
      type: String,
      enum: ENQUIRY_TYPES,
      default: 'room_booking',
      index: true,
    },
    priority: {
      type: String,
      enum: ENQUIRY_PRIORITIES,
      default: 'medium',
      index: true,
    },
    checkInDate: { type: Date },
    checkOutDate: { type: Date },
    guestsCount: { type: Number, min: 1 },
    roomTypePreference: { type: String },
    budget: { type: Number, min: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    followUpDate: { type: Date },
    notes: { type: String },
    internalNotes: { type: String, maxlength: 3000 },
    lostReason: { type: String },
    sourceHistory: [
      {
        source: { type: String, enum: ENQUIRY_SOURCES, required: true },
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
    convertedLeadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    convertedGuestId: { type: Schema.Types.ObjectId, ref: 'Guest' },
    convertedBookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    convertedAt: { type: Date },
    ...auditFields,
  },
  { timestamps: true }
);

enquirySchema.index({ hotelId: 1, status: 1 });
enquirySchema.index({ hotelId: 1, source: 1 });
enquirySchema.index({ hotelId: 1, enquiryType: 1 });
enquirySchema.index({ hotelId: 1, priority: 1 });
enquirySchema.index({ hotelId: 1, assignedTo: 1, followUpDate: 1 });
enquirySchema.index({ hotelId: 1, followUpDate: 1 });
enquirySchema.index({ hotelId: 1, createdAt: -1 });
enquirySchema.index({ hotelId: 1, guestName: 'text', phone: 'text', email: 'text' });
enquirySchema.plugin(softDeletePlugin);

export const Enquiry = mongoose.model<IEnquiry>('Enquiry', enquirySchema);
