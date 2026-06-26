import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export const MAINTENANCE_ISSUE_STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'on_hold',
  'resolved',
  'closed',
  'reopened',
] as const;

export const MAINTENANCE_ISSUE_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export const MAINTENANCE_ISSUE_TYPES = [
  'ac',
  'plumbing',
  'electrical',
  'furniture',
  'bathroom',
  'cleaning_equipment',
  'wifi',
  'tv',
  'door_lock',
  'safety',
  'other',
] as const;

export type MaintenanceIssueStatus = (typeof MAINTENANCE_ISSUE_STATUSES)[number];
export type MaintenanceIssuePriority = (typeof MAINTENANCE_ISSUE_PRIORITIES)[number];
export type MaintenanceIssueType = (typeof MAINTENANCE_ISSUE_TYPES)[number];

export interface IMaintenanceIssueTimelineItem {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface IMaintenanceIssue extends Document {
  hotelId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  sourceHousekeepingTaskId?: mongoose.Types.ObjectId;
  issueNumber: string;
  title: string;
  description?: string;
  issueType: MaintenanceIssueType;
  status: MaintenanceIssueStatus;
  priority: MaintenanceIssuePriority;
  reportedAt: Date;
  scheduledFor?: Date;
  startedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  estimatedCost?: number;
  actualCost?: number;
  vendorName?: string;
  vendorPhone?: string;
  resolutionNotes?: string;
  holdReason?: string;
  images: Array<{ url: string; publicId?: string; caption?: string; uploadedAt?: Date }>;
  timeline: IMaintenanceIssueTimelineItem[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceIssueSchema = new Schema<IMaintenanceIssue>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sourceHousekeepingTaskId: { type: Schema.Types.ObjectId, ref: 'HousekeepingTask', index: true },
    issueNumber: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, maxlength: 1000 },
    issueType: { type: String, enum: MAINTENANCE_ISSUE_TYPES, required: true, index: true },
    status: { type: String, enum: MAINTENANCE_ISSUE_STATUSES, default: 'open', index: true },
    priority: { type: String, enum: MAINTENANCE_ISSUE_PRIORITIES, default: 'medium', index: true },
    reportedAt: { type: Date, default: Date.now, index: true },
    scheduledFor: { type: Date, index: true },
    startedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    estimatedCost: { type: Number, min: 0 },
    actualCost: { type: Number, min: 0 },
    vendorName: { type: String, trim: true, maxlength: 120 },
    vendorPhone: { type: String, trim: true, maxlength: 30 },
    resolutionNotes: { type: String, maxlength: 2000 },
    holdReason: { type: String, maxlength: 1000 },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        caption: { type: String },
        uploadedAt: { type: Date, default: Date.now },
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
    ...auditFields,
  },
  { timestamps: true }
);

maintenanceIssueSchema.index({ hotelId: 1, issueNumber: 1 }, { unique: true });
maintenanceIssueSchema.index({ hotelId: 1, status: 1, priority: 1 });
maintenanceIssueSchema.index({ hotelId: 1, roomId: 1, status: 1 });
maintenanceIssueSchema.index({ hotelId: 1, assignedTo: 1, status: 1 });
maintenanceIssueSchema.index({ hotelId: 1, title: 'text', description: 'text', issueNumber: 'text' });
maintenanceIssueSchema.plugin(softDeletePlugin);

export const MaintenanceIssue = mongoose.model<IMaintenanceIssue>('MaintenanceIssue', maintenanceIssueSchema);
