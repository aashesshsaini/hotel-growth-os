import { JobsOptions } from 'bullmq';
import { Types } from 'mongoose';
import { automationQueue } from '../../queues';
import { config } from '../../config';
import { AuditLog, AutomationJob, AutomationJobLog } from '../../models';
import { IAutomationJob } from '../../models/AutomationJob';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { emitAutomationEvent, getAutomationJobHandler } from './automation.registry';
import { AutomationEventPayload, AutomationJobPayload } from './automation.types';

const lifecycleAudit = async (job: IAutomationJob, action: string, changes?: Record<string, unknown>) => {
  await AuditLog.create({
    hotelId: job.hotelId,
    userId: job.createdBy,
    action,
    entity: 'AutomationJob',
    entityId: job._id,
    changes,
  });
};

const writeLog = async (
  job: IAutomationJob,
  status: string,
  message?: string,
  metadata?: Record<string, unknown>
) => AutomationJobLog.create({
  automationJobId: job._id,
  bullmqJobId: job.bullmqJobId,
  hotelId: job.hotelId,
  jobType: job.jobType,
  status,
  executionTime: new Date(),
  retryCount: job.attemptsMade,
  failureReason: job.failureReason,
  processingTimeMs: job.processingTimeMs,
  message,
  metadata,
});

const validatePayload = (input: AutomationJobPayload) => {
  if (!input.jobType || typeof input.jobType !== 'string') throw new ValidationError('Job type is required');
  if (input.payload && (Array.isArray(input.payload) || typeof input.payload !== 'object')) {
    throw new ValidationError('Job payload must be an object');
  }
};

const bullOptions = (job: IAutomationJob): JobsOptions => ({
  jobId: job.deduplicationKey || String(job._id),
  delay: job.delayMs,
  attempts: job.maxAttempts,
  priority: job.priority || undefined,
  backoff: job.backoffStrategy === 'exponential'
    ? { type: 'exponential', delay: job.retryDelayMs }
    : { type: 'fixed', delay: job.retryDelayMs },
  removeOnComplete: config.automation.removeOnComplete,
  removeOnFail: config.automation.removeOnFail,
});

export const createAutomationJob = async (input: AutomationJobPayload): Promise<IAutomationJob> => {
  validatePayload(input);
  if (input.options?.deduplicationKey) {
    const existing = await AutomationJob.findOne({ deduplicationKey: input.options.deduplicationKey, isDeleted: { $ne: true } });
    if (existing && !['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(existing.status)) {
      throw new ConflictError('Automation job already exists');
    }
  }
  const now = new Date();
  const delayMs = input.options?.delayMs ?? (input.options?.scheduledAt ? Math.max(0, input.options.scheduledAt.getTime() - now.getTime()) : 0);
  const job = await AutomationJob.create({
    hotelId: input.options?.hotelId ? new Types.ObjectId(input.options.hotelId) : undefined,
    jobType: input.jobType,
    status: delayMs > 0 || input.options?.scheduledAt ? 'PENDING' : 'PENDING',
    queueName: config.automation.queueName,
    deduplicationKey: input.options?.deduplicationKey,
    payload: input.payload ?? {},
    priority: input.options?.priority ?? 0,
    scheduledAt: input.options?.scheduledAt,
    delayMs,
    timeoutMs: input.options?.timeoutMs ?? config.automation.defaultTimeoutMs,
    maxAttempts: input.options?.maxAttempts ?? config.automation.defaultRetryCount,
    retryDelayMs: input.options?.retryDelayMs ?? config.automation.defaultRetryDelayMs,
    backoffStrategy: input.options?.backoffStrategy ?? 'exponential',
    expiresAt: input.options?.expiresAt ?? new Date(now.getTime() + config.automation.defaultJobExpiryMs),
    metadata: input.options?.metadata,
    createdBy: input.options?.createdBy,
    updatedBy: input.options?.createdBy,
  });
  await lifecycleAudit(job, 'automation.job_created', { jobType: job.jobType });
  await writeLog(job, 'PENDING', 'Automation job created');
  if (!job.scheduledAt || job.scheduledAt.getTime() <= Date.now()) {
    await enqueueAutomationJob(job);
  }
  return job;
};

export const enqueueAutomationJob = async (job: IAutomationJob): Promise<IAutomationJob> => {
  if (['CANCELLED', 'COMPLETED', 'EXPIRED'].includes(job.status)) return job;
  if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
    job.status = 'EXPIRED';
    job.expiredAt = new Date();
    await job.save();
    await lifecycleAudit(job, 'automation.job_expired');
    await writeLog(job, 'EXPIRED', 'Automation job expired before enqueue');
    return job;
  }
  const bullJob = await automationQueue.add(String(job.jobType), { automationJobId: String(job._id) }, bullOptions(job));
  job.bullmqJobId = String(bullJob.id);
  job.status = 'QUEUED';
  job.queuedAt = new Date();
  await job.save();
  await lifecycleAudit(job, 'automation.job_queued', { bullmqJobId: job.bullmqJobId });
  await writeLog(job, 'QUEUED', 'Automation job queued');
  return job;
};

export const enqueueDueAutomationJobs = async (limit = 100): Promise<number> => {
  const dueJobs = await AutomationJob.find({
    status: 'PENDING',
    isDeleted: { $ne: true },
    $or: [{ scheduledAt: { $exists: false } }, { scheduledAt: { $lte: new Date() } }],
  }).sort({ scheduledAt: 1, createdAt: 1 }).limit(limit);
  await Promise.all(dueJobs.map((job) => enqueueAutomationJob(job)));
  return dueJobs.length;
};

export const cancelAutomationJob = async (id: string, reason?: string): Promise<IAutomationJob> => {
  const job = await AutomationJob.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!job) throw new NotFoundError('Automation job not found');
  if (job.bullmqJobId) {
    const bullJob = await automationQueue.getJob(job.bullmqJobId);
    if (bullJob) await bullJob.remove();
  }
  job.status = 'CANCELLED';
  job.cancelledAt = new Date();
  job.failureReason = reason;
  await job.save();
  await lifecycleAudit(job, 'automation.job_cancelled', { reason });
  await writeLog(job, 'CANCELLED', 'Automation job cancelled', { reason });
  return job;
};

export const processAutomationJob = async (automationJobId: string): Promise<Record<string, unknown>> => {
  const job = await AutomationJob.findOne({ _id: automationJobId, isDeleted: { $ne: true } });
  if (!job) throw new NotFoundError('Automation job not found');
  if (job.status === 'CANCELLED') return { skipped: true, reason: 'cancelled' };
  if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
    job.status = 'EXPIRED';
    job.expiredAt = new Date();
    await job.save();
    await lifecycleAudit(job, 'automation.job_expired');
    await writeLog(job, 'EXPIRED', 'Automation job expired');
    return { skipped: true, reason: 'expired' };
  }

  const startedAt = Date.now();
  job.status = 'RUNNING';
  job.startedAt = new Date();
  job.attemptsMade = (job.attemptsMade ?? 0) + 1;
  job.lockedAt = new Date();
  job.lockedBy = process.pid.toString();
  await job.save();
  await lifecycleAudit(job, 'automation.job_started');
  await writeLog(job, 'RUNNING', 'Automation job started');

  try {
    const handler = getAutomationJobHandler(String(job.jobType));
    const result = handler
      ? await handler({
        automationJobId: String(job._id),
        jobType: String(job.jobType),
        hotelId: job.hotelId ? String(job.hotelId) : undefined,
        payload: job.payload,
        metadata: job.metadata,
      })
      : { handled: false, reason: 'No handler registered' };
    const processingTimeMs = Date.now() - startedAt;
    job.status = 'COMPLETED';
    job.completedAt = new Date();
    job.processingTimeMs = processingTimeMs;
    job.lastRunDurationMs = processingTimeMs;
    job.result = (result ?? { handled: true }) as Record<string, unknown>;
    job.lockedAt = undefined;
    job.lockedBy = undefined;
    await job.save();
    await lifecycleAudit(job, 'automation.job_completed', { processingTimeMs });
    await writeLog(job, 'COMPLETED', 'Automation job completed', { result: job.result });
    return job.result ?? {};
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : 'Automation job failed';
    const processingTimeMs = Date.now() - startedAt;
    const canRetry = job.attemptsMade < job.maxAttempts;
    job.status = canRetry ? 'RETRYING' : 'FAILED';
    job.retryingAt = canRetry ? new Date() : job.retryingAt;
    job.failedAt = canRetry ? job.failedAt : new Date();
    job.failureReason = failureReason;
    job.processingTimeMs = processingTimeMs;
    job.lastRunDurationMs = processingTimeMs;
    job.lockedAt = undefined;
    job.lockedBy = undefined;
    await job.save();
    await lifecycleAudit(job, canRetry ? 'automation.job_retried' : 'automation.job_failed', { failureReason, attemptsMade: job.attemptsMade });
    await writeLog(job, job.status, failureReason);
    logger.error(`Automation job ${job._id} failed`, error);
    throw error;
  }
};

export const emitAutomationJobEvent = async (event: AutomationEventPayload): Promise<void> => {
  emitAutomationEvent(event);
  logger.info(`Automation event emitted: ${event.eventName}`, event);
};
