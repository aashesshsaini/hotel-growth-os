import mongoose, { Document, Schema } from 'mongoose';
import { auditFields } from '../utils/schemaHelpers';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';

export interface ISystemIncident extends Document {
  incidentNumber: string;
  severity: IncidentSeverity;
  message: string;
  affectedService: string;
  status: IncidentStatus;
  assignedEngineer?: mongoose.Types.ObjectId;
  timeline: Array<{
    event: string;
    description?: string;
    timestamp: Date;
  }>;
  errorLogsPreview: Array<{
    timestamp: Date;
    level: string;
    message: string;
  }>;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const systemIncidentSchema = new Schema<ISystemIncident>(
  {
    incidentNumber: { type: String, required: true, unique: true, index: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
    message: { type: String, required: true },
    affectedService: { type: String, required: true, index: true },
    status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open', index: true },
    assignedEngineer: { type: Schema.Types.ObjectId, ref: 'User' },
    timeline: {
      type: [
        {
          event: { type: String, required: true },
          description: String,
          timestamp: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    errorLogsPreview: {
      type: [
        {
          timestamp: { type: Date, default: Date.now },
          level: { type: String, default: 'error' },
          message: { type: String, required: true },
        },
      ],
      default: [],
    },
    resolvedAt: Date,
    ...auditFields,
  },
  { timestamps: true }
);

systemIncidentSchema.index({ status: 1, severity: 1, createdAt: -1 });

export const SystemIncident = mongoose.model<ISystemIncident>('SystemIncident', systemIncidentSchema);
