import { config } from '../../config';
import { logger } from '../../utils/logger';
import { enqueueDueAutomationJobs } from './automation.service';

let scheduler: NodeJS.Timeout | undefined;
let isTickRunning = false;

export const startAutomationScheduler = (): void => {
  if (!config.automation.schedulerEnabled) {
    logger.info('Automation scheduler disabled');
    return;
  }
  if (scheduler) return;
  scheduler = setInterval(async () => {
    if (isTickRunning) return;
    isTickRunning = true;
    try {
      const count = await enqueueDueAutomationJobs();
      if (count > 0) logger.info(`Automation scheduler enqueued ${count} due jobs`);
    } catch (error) {
      logger.error('Automation scheduler tick failed', error);
    } finally {
      isTickRunning = false;
    }
  }, config.automation.schedulerPollIntervalMs);
  scheduler.unref();
  logger.info('Automation scheduler started', { intervalMs: config.automation.schedulerPollIntervalMs });
};

export const stopAutomationScheduler = (): void => {
  if (!scheduler) return;
  clearInterval(scheduler);
  scheduler = undefined;
  logger.info('Automation scheduler stopped');
};
