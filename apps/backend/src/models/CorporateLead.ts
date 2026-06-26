import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export const CORPORATE_LEAD_STATUSES = [
  'new',
  'contacted',
  'meeting_scheduled',
  'proposal_sent',
  'negotiation',
  'contract_review',
  'approved',
  'active_client',
  'inactive',
  'lost',
  'negotiating',
  'confirmed',
] as const;

export const CORPORATE_COMPANY_TYPES = [
  'corporate',
  'hotel_chain',
  'travel_agency',
  'mice',
  'government',
  'airline',
  'other',
] as const;

export const CORPORATE_PAYMENT_TERMS = [
  'prepaid',
  'net_7',
  'net_15',
  'net_30',
  'net_45',
  'net_60',
  'credit_account',
] as const;

export const CORPORATE_PRIORITIES = ['low', 'medium', 'high', 'strategic'] as const;

export type CorporateLeadStatus = (typeof CORPORATE_LEAD_STATUSES)[number];
export type CorporateCompanyType = (typeof CORPORATE_COMPANY_TYPES)[number];
export type CorporatePaymentTerms = (typeof CORPORATE_PAYMENT_TERMS)[number];
export type CorporatePriority = (typeof CORPORATE_PRIORITIES)[number];

export interface ICorporateContact {
  _id?: mongoose.Types.ObjectId;
  name: string;
  designation?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface ICorporateNote {
  _id?: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface ICorporateTimelineItem {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface ICorporateMeeting {
  _id?: mongoose.Types.ObjectId;
  title: string;
  scheduledAt: Date;
  location?: string;
  attendees?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

export interface ICorporateProposal {
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

export interface ICorporateDocument {
  _id?: mongoose.Types.ObjectId;
  name: string;
  url: string;
  documentType?: string;
  uploadedAt: Date;
  uploadedBy?: mongoose.Types.ObjectId;
}

export interface ICorporateLead extends Document {
  hotelId: mongoose.Types.ObjectId;
  companyNumber: string;
  companyName: string;
  companyType: CorporateCompanyType;
  industry?: string;
  website?: string;
  contactPerson: string;
  phone: string;
  email?: string;
  contacts: ICorporateContact[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  gstNumber?: string;
  panNumber?: string;
  requirements?: string;
  estimatedRooms?: number;
  estimatedGuests?: number;
  eventDates?: { from?: Date; to?: Date };
  status: CorporateLeadStatus;
  priority: CorporatePriority;
  source?: string;
  tags: string[];
  followUpDate?: Date;
  renewalReminderDate?: Date;
  notes?: string;
  structuredNotes: ICorporateNote[];
  totalValue?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  creditLimit?: number;
  paymentTerms?: CorporatePaymentTerms;
  corporateRate?: number;
  specialPricing?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  roomAllocation?: number;
  assignedTo?: mongoose.Types.ObjectId;
  convertedGuestId?: mongoose.Types.ObjectId;
  timeline: ICorporateTimelineItem[];
  meetings: ICorporateMeeting[];
  proposals: ICorporateProposal[];
  documents: ICorporateDocument[];
  lostReason?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const corporateLeadSchema = new Schema<ICorporateLead>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    companyNumber: { type: String, trim: true, index: true },
    companyName: { type: String, required: true, trim: true, maxlength: 160 },
    companyType: { type: String, enum: CORPORATE_COMPANY_TYPES, default: 'corporate', index: true },
    industry: { type: String, trim: true, maxlength: 120 },
    website: { type: String, trim: true, maxlength: 200 },
    contactPerson: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    contacts: [
      {
        name: { type: String, required: true, trim: true },
        designation: { type: String, trim: true },
        phone: { type: String, trim: true },
        email: { type: String, lowercase: true, trim: true },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    gstNumber: { type: String, trim: true, uppercase: true },
    panNumber: { type: String, trim: true, uppercase: true },
    requirements: { type: String, maxlength: 2000 },
    estimatedRooms: { type: Number, min: 0 },
    estimatedGuests: { type: Number, min: 0 },
    eventDates: { from: Date, to: Date },
    status: {
      type: String,
      enum: CORPORATE_LEAD_STATUSES,
      default: 'new',
      index: true,
    },
    priority: { type: String, enum: CORPORATE_PRIORITIES, default: 'medium', index: true },
    source: { type: String, trim: true, maxlength: 80 },
    tags: [{ type: String, trim: true }],
    followUpDate: { type: Date, index: true },
    renewalReminderDate: { type: Date, index: true },
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
    outstandingAmount: { type: Number, min: 0, default: 0 },
    creditLimit: { type: Number, min: 0 },
    paymentTerms: { type: String, enum: CORPORATE_PAYMENT_TERMS, default: 'net_30' },
    corporateRate: { type: Number, min: 0 },
    specialPricing: { type: String, maxlength: 1000 },
    contractStartDate: { type: Date },
    contractEndDate: { type: Date },
    roomAllocation: { type: Number, min: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    convertedGuestId: { type: Schema.Types.ObjectId, ref: 'Guest' },
    timeline: [
      {
        action: { type: String, required: true },
        message: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    meetings: [
      {
        title: { type: String, required: true, trim: true },
        scheduledAt: { type: Date, required: true },
        location: { type: String, trim: true },
        attendees: { type: String, trim: true },
        status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'], default: 'scheduled' },
        notes: { type: String, maxlength: 2000 },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
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
    documents: [
      {
        name: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        documentType: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    lostReason: { type: String, maxlength: 1000 },
    ...auditFields,
  },
  { timestamps: true }
);

corporateLeadSchema.index({ hotelId: 1, status: 1 });
corporateLeadSchema.index({ hotelId: 1, companyType: 1 });
corporateLeadSchema.index({ hotelId: 1, assignedTo: 1, followUpDate: 1 });
corporateLeadSchema.index({ hotelId: 1, companyName: 'text', contactPerson: 'text', phone: 'text', email: 'text', companyNumber: 'text' });

corporateLeadSchema.pre('save', async function generateCompanyNumber(next) {
  if (this.companyNumber || !this.hotelId) return next();
  const prefix = `CORP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const CorporateLeadModel = mongoose.model<ICorporateLead>('CorporateLead');
  const count = await CorporateLeadModel.countDocuments({ hotelId: this.hotelId, companyNumber: { $regex: `^${prefix}` } });
  this.companyNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  next();
});

corporateLeadSchema.plugin(softDeletePlugin);

export const CorporateLead = mongoose.model<ICorporateLead>('CorporateLead', corporateLeadSchema);
