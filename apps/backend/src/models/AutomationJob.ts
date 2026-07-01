import mongoose, { Document, Schema } from 'mongoose';
import { auditFields, softDeletePlugin } from '../utils/schemaHelpers';

export const AUTOMATION_JOB_TYPES = [
  'SEND_MESSAGE',
  'SEND_EMAIL',
  'SEND_REVIEW_REQUEST',
  'SEND_REMINDER',
  'PROCESS_CAMPAIGN',
  'UPDATE_ANALYTICS',
  'SYNC_EXTERNAL_SYSTEM',
] as const;

export const AUTOMATION_JOB_STATUSES = [
  'PENDING',
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'RETRYING',
  'EXPIRED',
] as const;

export type AutomationJobType = (typeof AUTOMATION_JOB_TYPES)[number] | string;
export type AutomationJobStatus = (typeof AUTOMATION_JOB_STATUSES)[number];

export interface IAutomationJob extends Document {
  hotelId?: mongoose.Types.ObjectId;
  jobType: AutomationJobType;
  status: AutomationJobStatus;
  queueName: string;
  bullmqJobId?: string;
  deduplicationKey?: string;
  payload: Record<string, unknown>;
  priority: number;
  scheduledAt?: Date;
  delayMs: number;
  timeoutMs: number;
  maxAttempts: number;
  attemptsMade: number;
  retryDelayMs: number;
  backoffStrategy: 'fixed' | 'exponential';
  failureReason?: string;
  result?: Record<string, unknown>;
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  retryingAt?: Date;
  expiredAt?: Date;
  expiresAt?: Date;
  processingTimeMs?: number;
  lastRunDurationMs?: number;
  lockedAt?: Date;
  lockedBy?: string;
  metadata?: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const automationJobSchema = new Schema<IAutomationJob>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', index: true },
    jobType: { type: String, required: true, index: true },
    status: { type: String, enum: AUTOMATION_JOB_STATUSES, default: 'PENDING', index: true },
    queueName: { type: String, required: true, default: 'automation', index: true },
    bullmqJobId: { type: String, index: true },
    deduplicationKey: { type: String, trim: true, index: true, sparse: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    priority: { type: Number, default: 0, min: 0 },
    scheduledAt: { type: Date, index: true },
    delayMs: { type: Number, default: 0, min: 0 },
    timeoutMs: { type: Number, default: 60000, min: 1000 },
    maxAttempts: { type: Number, default: 3, min: 1, max: 25 },
    attemptsMade: { type: Number, default: 0, min: 0 },
    retryDelayMs: { type: Number, default: 300000, min: 0 },
    backoffStrategy: { type: String, enum: ['fixed', 'exponential'], default: 'exponential' },
    failureReason: String,
    result: { type: Schema.Types.Mixed },
    queuedAt: Date,
    startedAt: Date,
    completedAt: Date,
    failedAt: Date,
    cancelledAt: Date,
    retryingAt: Date,
    expiredAt: Date,
    expiresAt: { type: Date, index: true },
    processingTimeMs: Number,
    lastRunDurationMs: Number,
    lockedAt: Date,
    lockedBy: String,
    metadata: { type: Schema.Types.Mixed },
    ...auditFields,
  },
  { timestamps: true }
);

automationJobSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
automationJobSchema.index({ status: 1, scheduledAt: 1 });
automationJobSchema.index({ jobType: 1, status: 1 });
automationJobSchema.index({ deduplicationKey: 1 }, { unique: true, sparse: true });
automationJobSchema.plugin(softDeletePlugin);

export const AutomationJob = mongoose.model<IAutomationJob>('AutomationJob', automationJobSchema);
