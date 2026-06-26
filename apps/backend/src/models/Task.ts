import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, auditFields } from '../utils/schemaHelpers';

export const TASK_STATUSES = [
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'missed',
  'overdue',
  'rescheduled',
  'cancelled',
] as const;

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export const FOLLOW_UP_TYPES = [
  'call',
  'whatsapp',
  'sms',
  'email',
  'meeting',
  'payment_reminder',
  'booking_confirmation',
  'review_request',
  'general',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export interface ITaskTimelineItem {
  action: string;
  message?: string;
  createdAt: Date;
  createdBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface ITask extends Document {
  hotelId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assignedTo?: mongoose.Types.ObjectId;
  dueDate?: Date;
  reminderAt?: Date;
  followUpType: FollowUpType;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  outcome?: string;
  completedAt?: Date;
  rescheduledFrom?: Date;
  relatedTo?: {
    type: string;
    id: mongoose.Types.ObjectId;
    label?: string;
  };
  timeline: ITaskTimelineItem[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    dueDate: { type: Date, index: true },
    reminderAt: { type: Date, index: true },
    followUpType: { type: String, enum: FOLLOW_UP_TYPES, default: 'general', index: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium', index: true },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'pending',
      index: true,
    },
    notes: { type: String, maxlength: 3000 },
    outcome: { type: String, maxlength: 1000 },
    completedAt: { type: Date },
    rescheduledFrom: { type: Date },
    relatedTo: { type: { type: String }, id: Schema.Types.ObjectId, label: String },
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

taskSchema.index({ hotelId: 1, status: 1 });
taskSchema.index({ hotelId: 1, assignedTo: 1 });
taskSchema.index({ hotelId: 1, dueDate: 1, status: 1 });
taskSchema.index({ hotelId: 1, reminderAt: 1 });
taskSchema.index({ hotelId: 1, followUpType: 1 });
taskSchema.index({ hotelId: 1, 'relatedTo.type': 1, 'relatedTo.id': 1 });
taskSchema.plugin(softDeletePlugin);

export const Task = mongoose.model<ITask>('Task', taskSchema);
