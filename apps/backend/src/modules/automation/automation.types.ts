import { AutomationJobType } from '../../models/AutomationJob';

export interface AutomationJobOptions {
  hotelId?: string;
  createdBy?: string;
  deduplicationKey?: string;
  priority?: number;
  delayMs?: number;
  scheduledAt?: Date;
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  backoffStrategy?: 'fixed' | 'exponential';
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface AutomationJobPayload {
  jobType: AutomationJobType;
  payload?: Record<string, unknown>;
  options?: AutomationJobOptions;
}

export interface AutomationEventPayload {
  eventName: string;
  hotelId?: string;
  entityId?: string;
  entityType?: string;
  payload?: Record<string, unknown>;
  createdBy?: string;
}

export type AutomationJobHandler = (context: {
  automationJobId: string;
  jobType: string;
  hotelId?: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) => Promise<Record<string, unknown> | void>;
