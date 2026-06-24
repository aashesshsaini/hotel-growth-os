import { campaignQueue, notificationQueue, whatsappQueue } from '../queues';

export const addWhatsAppJob = (name: string, data: unknown) => whatsappQueue.add(name, data);
export const addCampaignJob = (name: string, data: unknown) => campaignQueue.add(name, data);
export const addNotificationJob = (name: string, data: unknown) => notificationQueue.add(name, data);
