import mongoose, { Document, Schema } from 'mongoose';

export type SystemStatus = 'healthy' | 'degraded' | 'outage';
export type ServiceStatus = 'healthy' | 'slow' | 'down';

export interface IApiMetric {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  responseTime: number;
  statusCodes: Record<string, number>;
  errorCount: number;
  lastCheckedAt: Date;
}

export interface IServiceMetric {
  serviceName: 'auth' | 'billing' | 'subscription' | 'hotel' | 'support' | 'analytics';
  status: ServiceStatus;
  latency: number;
  errorRate: number;
  throughput: number;
  lastUpdatedAt: Date;
}

export interface ISystemHealthMetric extends Document {
  systemUptime: number;
  systemStatus: SystemStatus;
  activeUsers: number;
  totalRequests: number;
  requestsPerMinute: number;
  errorRate: number;
  successRate: number;
  avgResponseTime: number;
  apiMetrics: IApiMetric[];
  serviceMetrics: IServiceMetric[];
  responseTimeTrend: Array<{ label: string; value: number }>;
  errorRateTrend: Array<{ label: string; value: number }>;
  requestVolumeTrend: Array<{ label: string; value: number }>;
  statusCodeDistribution: Record<string, number>;
  database: {
    status: ServiceStatus;
    queryLatency: number;
    slowQueries: number;
    connectionPool: string;
  };
  backgroundJobs: {
    status: ServiceStatus;
    queued: number;
    succeeded: number;
    failed: number;
  };
  createdAt: Date;
}

const pointSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: Number, required: true },
  },
  { _id: false }
);

const systemHealthMetricSchema = new Schema<ISystemHealthMetric>(
  {
    systemUptime: { type: Number, required: true },
    systemStatus: { type: String, enum: ['healthy', 'degraded', 'outage'], default: 'healthy', index: true },
    activeUsers: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    requestsPerMinute: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
    successRate: { type: Number, default: 100 },
    avgResponseTime: { type: Number, default: 0 },
    apiMetrics: {
      type: [
        {
          endpoint: { type: String, required: true },
          method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], required: true },
          responseTime: { type: Number, default: 0 },
          statusCodes: { type: Schema.Types.Mixed, default: {} },
          errorCount: { type: Number, default: 0 },
          lastCheckedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    serviceMetrics: {
      type: [
        {
          serviceName: { type: String, enum: ['auth', 'billing', 'subscription', 'hotel', 'support', 'analytics'], required: true },
          status: { type: String, enum: ['healthy', 'slow', 'down'], default: 'healthy' },
          latency: { type: Number, default: 0 },
          errorRate: { type: Number, default: 0 },
          throughput: { type: Number, default: 0 },
          lastUpdatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    responseTimeTrend: { type: [pointSchema], default: [] },
    errorRateTrend: { type: [pointSchema], default: [] },
    requestVolumeTrend: { type: [pointSchema], default: [] },
    statusCodeDistribution: { type: Schema.Types.Mixed, default: {} },
    database: {
      status: { type: String, enum: ['healthy', 'slow', 'down'], default: 'healthy' },
      queryLatency: { type: Number, default: 0 },
      slowQueries: { type: Number, default: 0 },
      connectionPool: { type: String, default: 'design_ready' },
    },
    backgroundJobs: {
      status: { type: String, enum: ['healthy', 'slow', 'down'], default: 'healthy' },
      queued: { type: Number, default: 0 },
      succeeded: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

systemHealthMetricSchema.index({ createdAt: -1 });

export const SystemHealthMetric = mongoose.model<ISystemHealthMetric>('SystemHealthMetric', systemHealthMetricSchema);
