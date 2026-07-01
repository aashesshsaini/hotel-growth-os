import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { AutomationEventPayload, AutomationJobHandler } from './automation.types';

const handlers = new Map<string, AutomationJobHandler>();
const eventBus = new EventEmitter();

export const registerAutomationJobHandler = (jobType: string, handler: AutomationJobHandler): void => {
  handlers.set(jobType, handler);
  logger.info(`Automation handler registered: ${jobType}`);
};

export const getAutomationJobHandler = (jobType: string): AutomationJobHandler | undefined => handlers.get(jobType);

export const registerAutomationEventListener = (
  eventName: string,
  listener: (event: AutomationEventPayload) => Promise<void> | void
): void => {
  eventBus.on(eventName, (event) => {
    Promise.resolve(listener(event)).catch((error) => logger.error(`Automation event listener failed: ${eventName}`, error));
  });
  logger.info(`Automation event listener registered: ${eventName}`);
};

export const emitAutomationEvent = (event: AutomationEventPayload): void => {
  eventBus.emit(event.eventName, event);
};
