import { Queue } from 'bullmq';
import { config } from '../config';

const connection = { host: config.redis.host, port: config.redis.port, password: config.redis.password, maxRetriesPerRequest: null };

export const whatsappQueue = new Queue('whatsapp', { connection });
export const campaignQueue = new Queue('campaign', { connection });
export const notificationQueue = new Queue('notification', { connection });
export const automationQueue = new Queue(config.automation.queueName, { connection });

export const closeQueues = async (): Promise<void> => {
  await Promise.all([whatsappQueue.close(), campaignQueue.close(), notificationQueue.close(), automationQueue.close()]);
};
