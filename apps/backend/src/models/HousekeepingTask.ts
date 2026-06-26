import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export const HOUSEKEEPING_TASK_STATUSES = [
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'inspection_pending',
  'rejected',
  'reclean_required',
] as const;

export const HOUSEKEEPING_TASK_TYPES = [
  'regular_cleaning',
  'deep_cleaning',
  'checkout_cleaning',
  'inspection',
  'maintenance_report',
  'linen_change',
  'bathroom_cleaning',
  'room_setup',
] as const;

export type HousekeepingTaskStatus = (typeof HOUSEKEEPING_TASK_STATUSES)[number];
export type HousekeepingTaskType = (typeof HOUSEKEEPING_TASK_TYPES)[number];

export interface IHousekeepingTaskTimelineItem {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface IHousekeepingTask extends Document {
  hotelId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  taskNumber: string;
  taskType: HousekeepingTaskType;
  status: HousekeepingTaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  inspectedAt?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  title: string;
  description?: string;
  checklist: Array<{ item: string; isDone: boolean; notes?: string }>;
  rejectionReason?: string;
  notes?: string;
  timeline: IHousekeepingTaskTimelineItem[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const housekeepingTaskSchema = new Schema<IHousekeepingTask>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    taskNumber: { type: String, required: true, trim: true, index: true },
    taskType: { type: String, enum: HOUSEKEEPING_TASK_TYPES, required: true, index: true },
    status: { type: String, enum: HOUSEKEEPING_TASK_STATUSES, default: 'pending', index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
    scheduledFor: { type: Date, index: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    inspectedAt: { type: Date },
    estimatedMinutes: { type: Number, min: 0 },
    actualMinutes: { type: Number, min: 0 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, maxlength: 1000 },
    checklist: [
      {
        item: { type: String, required: true },
        isDone: { type: Boolean, default: false },
        notes: { type: String },
      },
    ],
    rejectionReason: { type: String, maxlength: 1000 },
    notes: { type: String, maxlength: 1000 },
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

housekeepingTaskSchema.index({ hotelId: 1, taskNumber: 1 }, { unique: true });
housekeepingTaskSchema.index({ hotelId: 1, status: 1, scheduledFor: 1 });
housekeepingTaskSchema.index({ hotelId: 1, roomId: 1, status: 1 });
housekeepingTaskSchema.index({ hotelId: 1, assignedTo: 1, status: 1 });
housekeepingTaskSchema.index({ hotelId: 1, title: 'text', description: 'text', taskNumber: 'text' });
housekeepingTaskSchema.plugin(softDeletePlugin);

export const HousekeepingTask = mongoose.model<IHousekeepingTask>('HousekeepingTask', housekeepingTaskSchema);
