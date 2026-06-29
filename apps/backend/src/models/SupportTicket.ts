import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export type SupportTicketCategory = 'billing' | 'technical' | 'account' | 'subscription' | 'bug' | 'feature_request' | 'other';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportTicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'reopened';

export interface ISupportTicketAttachment {
  name: string;
  url?: string;
  contentType?: string;
  size?: number;
  uploadedAt: Date;
}

export interface ISupportTicketMessage {
  type: 'public_reply' | 'internal_note' | 'system';
  message: string;
  authorId?: mongoose.Types.ObjectId;
  authorName?: string;
  createdAt: Date;
  attachments: ISupportTicketAttachment[];
}

export interface ISupportTicketActivity {
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  actorId?: mongoose.Types.ObjectId;
  actorName?: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  ticketId: string;
  ticketNumber: string;
  hotelId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdByRole: 'hotel_owner' | 'staff' | 'admin' | 'super_admin';
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedTo?: mongoose.Types.ObjectId;
  tags: string[];
  attachments: ISupportTicketAttachment[];
  thread: ISupportTicketMessage[];
  resolutionNotes?: string;
  internalNotes: ISupportTicketMessage[];
  sla: {
    startedAt?: Date;
    firstResponseDueAt?: Date;
    resolutionDueAt?: Date;
    firstRespondedAt?: Date;
    breached: boolean;
  };
  escalation: {
    isEscalated: boolean;
    escalatedAt?: Date;
    escalatedBy?: mongoose.Types.ObjectId;
    reason?: string;
  };
  activity: ISupportTicketActivity[];
  resolvedAt?: Date;
  closedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<ISupportTicketAttachment>(
  {
    name: { type: String, required: true },
    url: String,
    contentType: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new Schema<ISupportTicketMessage>(
  {
    type: { type: String, enum: ['public_reply', 'internal_note', 'system'], required: true },
    message: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User' },
    authorName: String,
    createdAt: { type: Date, default: Date.now },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { _id: false }
);

const activitySchema = new Schema<ISupportTicketActivity>(
  {
    action: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    actorName: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    ticketNumber: { type: String, required: true, unique: true, index: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    createdByRole: { type: String, enum: ['hotel_owner', 'staff', 'admin', 'super_admin'], default: 'super_admin' },
    subject: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['billing', 'technical', 'account', 'subscription', 'bug', 'feature_request', 'other'], default: 'other', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
    status: { type: String, enum: ['open', 'in_progress', 'pending', 'resolved', 'closed', 'reopened'], default: 'open', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    tags: { type: [String], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    thread: { type: [messageSchema], default: [] },
    resolutionNotes: String,
    internalNotes: { type: [messageSchema], default: [] },
    sla: {
      startedAt: Date,
      firstResponseDueAt: Date,
      resolutionDueAt: Date,
      firstRespondedAt: Date,
      breached: { type: Boolean, default: false, index: true },
    },
    escalation: {
      isEscalated: { type: Boolean, default: false, index: true },
      escalatedAt: Date,
      escalatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String,
    },
    activity: { type: [activitySchema], default: [] },
    resolvedAt: Date,
    closedAt: Date,
    ...auditFields,
  },
  { timestamps: true }
);

supportTicketSchema.index({ status: 1, priority: 1, updatedAt: -1 });
supportTicketSchema.index({ hotelId: 1, status: 1 });
supportTicketSchema.index({ subject: 'text', description: 'text', ticketNumber: 'text' });
supportTicketSchema.plugin(softDeletePlugin);

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);
