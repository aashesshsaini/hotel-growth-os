import mongoose, { Document, Schema } from 'mongoose';

export interface IAutomationJobLog extends Document {
  automationJobId: mongoose.Types.ObjectId;
  bullmqJobId?: string;
  hotelId?: mongoose.Types.ObjectId;
  jobType: string;
  status: string;
  executionTime?: Date;
  retryCount: number;
  failureReason?: string;
  processingTimeMs?: number;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const automationJobLogSchema = new Schema<IAutomationJobLog>(
  {
    automationJobId: { type: Schema.Types.ObjectId, ref: 'AutomationJob', required: true, index: true },
    bullmqJobId: { type: String, index: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', index: true },
    jobType: { type: String, required: true, index: true },
    status: { type: String, required: true, index: true },
    executionTime: Date,
    retryCount: { type: Number, default: 0 },
    failureReason: String,
    processingTimeMs: Number,
    message: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

automationJobLogSchema.index({ hotelId: 1, createdAt: -1 });
automationJobLogSchema.index({ automationJobId: 1, createdAt: -1 });

export const AutomationJobLog = mongoose.model<IAutomationJobLog>('AutomationJobLog', automationJobLogSchema);
