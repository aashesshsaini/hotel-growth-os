import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export const EVENT_LEAD_STATUSES = [
  'new',
  'contacted',
  'requirement_collected',
  'proposal_sent',
  'site_visit_scheduled',
  'negotiation',
  'advance_pending',
  'confirmed',
  'converted',
  'lost',
  'quoted',
  'completed',
] as const;

export const EVENT_TYPES = [
  'wedding',
  'engagement',
  'birthday',
  'corporate_event',
  'conference',
  'seminar',
  'training',
  'anniversary',
  'party',
  'group_stay',
  'other',
] as const;

export const EVENT_LEAD_SOURCES = [
  'website',
  'phone_call',
  'walk_in',
  'referral',
  'social_media',
  'event_planner',
  'corporate',
  'ota',
  'email',
  'whatsapp',
  'direct',
  'other',
] as const;

export const EVENT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export type EventLeadStatus = (typeof EVENT_LEAD_STATUSES)[number];
export type EventType = (typeof EVENT_TYPES)[number];
export type EventLeadSource = (typeof EVENT_LEAD_SOURCES)[number];
export type EventPriority = (typeof EVENT_PRIORITIES)[number];

export interface IEventNote {
  _id?: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface IEventTimelineItem {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface IEventProposal {
  _id?: mongoose.Types.ObjectId;
  title: string;
  amount: number;
  sentAt?: Date;
  validUntil?: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface IEventPackage {
  _id?: mongoose.Types.ObjectId;
  name: string;
  price: number;
  description?: string;
  inclusions?: string;
  status: 'draft' | 'offered' | 'selected' | 'rejected';
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface IEventSiteVisit {
  _id?: mongoose.Types.ObjectId;
  title: string;
  scheduledAt: Date;
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface IEventDocument {
  _id?: mongoose.Types.ObjectId;
  name: string;
  url: string;
  documentType?: string;
  uploadedAt: Date;
  uploadedBy?: mongoose.Types.ObjectId;
}

export interface IEventPayment {
  _id?: mongoose.Types.ObjectId;
  amount: number;
  paymentType: 'advance' | 'partial' | 'final' | 'refund';
  paidAt: Date;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
}

export interface IEventRequirements {
  venue?: string;
  roomBlock?: string;
  catering?: string;
  decoration?: string;
  avSetup?: string;
  specialRequests?: string;
}

export interface IEventLead extends Document {
  hotelId: mongoose.Types.ObjectId;
  eventNumber: string;
  eventName: string;
  eventType: EventType | string;
  contactPerson: string;
  phone: string;
  email?: string;
  eventDate: Date;
  eventEndDate?: Date;
  eventStartTime?: string;
  eventEndTime?: string;
  guestCount: number;
  budgetMin?: number;
  budgetMax?: number;
  estimatedValue?: number;
  packageName?: string;
  packagePrice?: number;
  packages: IEventPackage[];
  requirements: IEventRequirements;
  status: EventLeadStatus;
  priority: EventPriority;
  source?: EventLeadSource | string;
  tags: string[];
  followUpDate?: Date;
  followUpReminder?: Date;
  notes?: string;
  structuredNotes: IEventNote[];
  totalValue?: number;
  paidAmount?: number;
  advanceAmount?: number;
  outstandingAmount?: number;
  assignedTo?: mongoose.Types.ObjectId;
  convertedGuestId?: mongoose.Types.ObjectId;
  convertedBookingId?: mongoose.Types.ObjectId;
  convertedAt?: Date;
  timeline: IEventTimelineItem[];
  proposals: IEventProposal[];
  siteVisits: IEventSiteVisit[];
  documents: IEventDocument[];
  payments: IEventPayment[];
  lostReason?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventLeadSchema = new Schema<IEventLead>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    eventNumber: { type: String, trim: true, index: true },
    eventName: { type: String, required: true, trim: true, maxlength: 160 },
    eventType: { type: String, required: true, index: true },
    contactPerson: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    eventDate: { type: Date, required: true, index: true },
    eventEndDate: { type: Date },
    eventStartTime: { type: String, trim: true },
    eventEndTime: { type: String, trim: true },
    guestCount: { type: Number, required: true, min: 1 },
    budgetMin: { type: Number, min: 0 },
    budgetMax: { type: Number, min: 0 },
    estimatedValue: { type: Number, min: 0, default: 0 },
    packageName: { type: String, trim: true },
    packagePrice: { type: Number, min: 0 },
    packages: [
      {
        name: { type: String, required: true, trim: true },
        price: { type: Number, min: 0, default: 0 },
        description: { type: String, maxlength: 2000 },
        inclusions: { type: String, maxlength: 2000 },
        status: { type: String, enum: ['draft', 'offered', 'selected', 'rejected'], default: 'draft' },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    requirements: {
      venue: { type: String, maxlength: 1000 },
      roomBlock: { type: String, maxlength: 1000 },
      catering: { type: String, maxlength: 1000 },
      decoration: { type: String, maxlength: 1000 },
      avSetup: { type: String, maxlength: 1000 },
      specialRequests: { type: String, maxlength: 2000 },
    },
    status: {
      type: String,
      enum: EVENT_LEAD_STATUSES,
      default: 'new',
      index: true,
    },
    priority: { type: String, enum: EVENT_PRIORITIES, default: 'medium', index: true },
    source: { type: String, trim: true, maxlength: 80, index: true },
    tags: [{ type: String, trim: true }],
    followUpDate: { type: Date, index: true },
    followUpReminder: { type: Date },
    notes: { type: String, maxlength: 4000 },
    structuredNotes: [
      {
        text: { type: String, required: true, maxlength: 2000 },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    totalValue: { type: Number, min: 0, default: 0 },
    paidAmount: { type: Number, min: 0, default: 0 },
    advanceAmount: { type: Number, min: 0, default: 0 },
    outstandingAmount: { type: Number, min: 0, default: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    convertedGuestId: { type: Schema.Types.ObjectId, ref: 'Guest' },
    convertedBookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    convertedAt: { type: Date },
    timeline: [
      {
        action: { type: String, required: true },
        message: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    proposals: [
      {
        title: { type: String, required: true, trim: true },
        amount: { type: Number, min: 0, default: 0 },
        sentAt: { type: Date },
        validUntil: { type: Date },
        status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], default: 'draft' },
        notes: { type: String, maxlength: 2000 },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    siteVisits: [
      {
        title: { type: String, required: true, trim: true },
        scheduledAt: { type: Date, required: true },
        location: { type: String, trim: true },
        status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'], default: 'scheduled' },
        notes: { type: String, maxlength: 2000 },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    documents: [
      {
        name: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        documentType: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    payments: [
      {
        amount: { type: Number, min: 0, required: true },
        paymentType: { type: String, enum: ['advance', 'partial', 'final', 'refund'], default: 'advance' },
        paidAt: { type: Date, default: Date.now },
        notes: { type: String, maxlength: 1000 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    lostReason: { type: String, maxlength: 1000 },
    ...auditFields,
  },
  { timestamps: true }
);

eventLeadSchema.index({ hotelId: 1, status: 1 });
eventLeadSchema.index({ hotelId: 1, eventType: 1 });
eventLeadSchema.index({ hotelId: 1, assignedTo: 1, followUpDate: 1 });
eventLeadSchema.index({ hotelId: 1, eventDate: 1 });

eventLeadSchema.pre('save', async function generateEventNumber(next) {
  if (this.eventNumber || !this.hotelId) return next();
  const prefix = `EVT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const EventLeadModel = mongoose.model<IEventLead>('EventLead');
  const count = await EventLeadModel.countDocuments({ hotelId: this.hotelId, eventNumber: { $regex: `^${prefix}` } });
  this.eventNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  next();
});

eventLeadSchema.plugin(softDeletePlugin);

export const EventLead = mongoose.model<IEventLead>('EventLead', eventLeadSchema);
