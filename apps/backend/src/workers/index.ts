import { Worker } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';

let workers: Worker[] = [];
const connection = { host: config.redis.host, port: config.redis.port, password: config.redis.password, maxRetriesPerRequest: null };

export const startWorkers = async (): Promise<void> => {
  if (process.env.ENABLE_WORKERS !== 'true') {
    logger.info('BullMQ workers disabled');
    return;
  }
  workers = [
    new Worker('whatsapp', async (job) => logger.info('Processing WhatsApp job', job.data), { connection }),
    new Worker('campaign', async (job) => logger.info('Processing campaign job', job.data), { connection }),
    new Worker('notification', async (job) => logger.info('Processing notification job', job.data), { connection }),
  ];
  workers.forEach((worker) => worker.on('failed', (job, error) => logger.error(`Worker job failed: ${job?.id}`, error)));
};

export const stopWorkers = async (): Promise<void> => {
  await Promise.all(workers.map((worker) => worker.close()));
  workers = [];
};
