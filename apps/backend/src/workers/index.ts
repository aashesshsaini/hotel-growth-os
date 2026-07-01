import { Worker } from 'bullmq';
import { config } from '../config';
import { WhatsAppMessage } from '../models';
import { whatsappProvider } from '../services/whatsapp.service';
import { logger } from '../utils/logger';
import { processAutomationJob } from '../modules/automation/automation.service';
import { startAutomationScheduler, stopAutomationScheduler } from '../modules/automation/automation.scheduler';
import { registerOccasionAutomationHandlers } from '../modules/birthdayAutomation/birthdayAutomation.service';
import { registerFestivalAutomationHandlers } from '../modules/festivalCampaigns/festivalCampaigns.service';
import { registerComebackAutomationHandlers } from '../modules/comebackCampaigns/comebackCampaigns.service';
import { registerReviewGrowthAutomationHandlers } from '../modules/reviewGrowth/reviewGrowth.automation';

let workers: Worker[] = [];
const connection = { host: config.redis.host, port: config.redis.port, password: config.redis.password, maxRetriesPerRequest: null };

const deliverStoredMessage = async (messageId: string) => {
  const message = await WhatsAppMessage.findById(messageId);
  if (!message || message.isDeleted) return;
  const result = await whatsappProvider.sendMessage({
    phone: message.phone,
    content: message.content,
    messageType: message.messageType,
    templateName: message.templateName,
    templateLanguage: message.templateLanguage,
    mediaUrl: message.mediaUrl,
  });
  if (!result.success) {
    message.status = 'failed';
    message.failedAt = new Date();
    message.failureReason = result.error || 'Delivery failed';
    message.retryCount = (message.retryCount ?? 0) + 1;
    await message.save();
    return;
  }
  const now = new Date();
  message.whatsappMessageId = result.whatsappMessageId;
  message.status = 'sent';
  message.sentAt = now;
  message.metadata = { ...(message.metadata ?? {}), simulated: result.simulated };
  await message.save();
  message.status = 'delivered';
  message.deliveredAt = new Date();
  await message.save();
};

export const startWorkers = async (): Promise<void> => {
  if (process.env.ENABLE_WORKERS !== 'true') {
    logger.info('BullMQ workers disabled');
    return;
  }
  registerOccasionAutomationHandlers();
  registerFestivalAutomationHandlers();
  registerComebackAutomationHandlers();
  registerReviewGrowthAutomationHandlers();
  workers = [
    new Worker(
      'whatsapp',
      async (job) => {
        if (job.name === 'send-message' && job.data?.messageId) {
          await deliverStoredMessage(String(job.data.messageId));
          return;
        }
        logger.info('Processing WhatsApp job', job.data);
      },
      { connection }
    ),
    new Worker('campaign', async (job) => logger.info('Processing campaign job', job.data), { connection }),
    new Worker('notification', async (job) => logger.info('Processing notification job', job.data), { connection }),
    new Worker(
      config.automation.queueName,
      async (job) => {
        if (!job.data?.automationJobId) {
          logger.warn('Automation job missing automationJobId', job.data);
          return { skipped: true };
        }
        return processAutomationJob(String(job.data.automationJobId));
      },
      { connection, concurrency: config.automation.workerCount }
    ),
  ];
  workers.forEach((worker) => worker.on('failed', (job, error) => logger.error(`Worker job failed: ${job?.id}`, error)));
  startAutomationScheduler();
};

export const stopWorkers = async (): Promise<void> => {
  stopAutomationScheduler();
  await Promise.all(workers.map((worker) => worker.close()));
  workers = [];
};
