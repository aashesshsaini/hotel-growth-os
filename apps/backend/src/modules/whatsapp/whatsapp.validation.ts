import { z } from 'zod';
import {
  WHATSAPP_AUTOMATION_TRIGGERS,
  WHATSAPP_DIRECTIONS,
  WHATSAPP_MESSAGE_STATUSES,
  WHATSAPP_MESSAGE_TYPES,
  WHATSAPP_TEMPLATE_STATUSES,
} from '@hotel-growth-os/shared';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const whatsappIdParamSchema = z.object({ id: objectIdSchema });
export const phoneParamSchema = z.object({ phone: z.string().min(5) });

export const listWhatsAppMessagesQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  status: z.enum(WHATSAPP_MESSAGE_STATUSES).optional(),
  direction: z.enum(WHATSAPP_DIRECTIONS).optional(),
  messageType: z.enum(WHATSAPP_MESSAGE_TYPES).optional(),
  phone: z.string().optional(),
  guestId: objectIdSchema.optional(),
  assignedTo: objectIdSchema.optional(),
  automationTrigger: z.enum(WHATSAPP_AUTOMATION_TRIGGERS).optional(),
  scheduled: z.coerce.boolean().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const listConversationsQuerySchema = paginationSchema.extend({
  status: z.enum(WHATSAPP_MESSAGE_STATUSES).optional(),
  direction: z.enum(WHATSAPP_DIRECTIONS).optional(),
  assignedTo: objectIdSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const createWhatsAppMessageObjectSchema = z.object({
  hotelId: objectIdSchema.optional(),
  phone: z.string().min(5),
  content: z.string().min(1).max(5000),
  direction: z.enum(WHATSAPP_DIRECTIONS).default('outgoing'),
  messageType: z.enum(WHATSAPP_MESSAGE_TYPES).optional(),
  status: z.enum(WHATSAPP_MESSAGE_STATUSES).optional(),
  guestId: objectIdSchema.optional(),
  enquiryId: objectIdSchema.optional(),
  leadId: objectIdSchema.optional(),
  bookingId: objectIdSchema.optional(),
  campaignId: objectIdSchema.optional(),
  taskId: objectIdSchema.optional(),
  assignedTo: objectIdSchema.optional(),
  mediaUrl: z.string().url().optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  automationTrigger: z.enum(WHATSAPP_AUTOMATION_TRIGGERS).optional(),
  scheduledAt: z.coerce.date().optional(),
  internalNotes: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createWhatsAppMessageSchema = createWhatsAppMessageObjectSchema;
export const updateWhatsAppMessageSchema = createWhatsAppMessageObjectSchema.partial();

export const sendWhatsAppMessageSchema = z.object({
  phone: z.string().min(5),
  content: z.string().min(1).max(5000),
  messageType: z.enum(WHATSAPP_MESSAGE_TYPES).optional(),
  guestId: objectIdSchema.optional(),
  leadId: objectIdSchema.optional(),
  enquiryId: objectIdSchema.optional(),
  bookingId: objectIdSchema.optional(),
  campaignId: objectIdSchema.optional(),
  taskId: objectIdSchema.optional(),
  assignedTo: objectIdSchema.optional(),
  mediaUrl: z.string().url().optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  automationTrigger: z.enum(WHATSAPP_AUTOMATION_TRIGGERS).optional(),
});

export const scheduleWhatsAppMessageSchema = sendWhatsAppMessageSchema.extend({
  scheduledAt: z.coerce.date(),
});

export const broadcastWhatsAppMessageSchema = z.object({
  phones: z.array(z.string().min(5)).min(1).max(500),
  content: z.string().min(1).max(5000),
  messageType: z.enum(WHATSAPP_MESSAGE_TYPES).optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  automationTrigger: z.enum(WHATSAPP_AUTOMATION_TRIGGERS).optional(),
  campaignId: objectIdSchema.optional(),
});

export const createWhatsAppTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.string().optional(),
  language: z.string().default('en'),
  status: z.enum(WHATSAPP_TEMPLATE_STATUSES).optional(),
  header: z.string().optional(),
  body: z.string().min(1).max(5000),
  footer: z.string().optional(),
  buttons: z
    .array(
      z.object({
        type: z.string(),
        text: z.string(),
        url: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .optional(),
  isActive: z.boolean().optional(),
});

export const updateWhatsAppTemplateSchema = createWhatsAppTemplateSchema.partial();

export const createWhatsAppAutomationRuleSchema = z.object({
  name: z.string().min(2).max(160),
  trigger: z.enum(WHATSAPP_AUTOMATION_TRIGGERS),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  messageType: z.enum(['text', 'template']).optional(),
  messageContent: z.string().max(5000).optional(),
  templateId: objectIdSchema.optional(),
  delayMinutes: z.coerce.number().int().min(0).optional(),
  assignedTo: objectIdSchema.optional(),
  conditions: z.record(z.unknown()).optional(),
});

export const updateWhatsAppAutomationRuleSchema = createWhatsAppAutomationRuleSchema.partial();

export const webhookQuerySchema = z.object({
  'hub.mode': z.string().optional(),
  'hub.verify_token': z.string().optional(),
  'hub.challenge': z.string().optional(),
  hotelId: objectIdSchema.optional(),
});

export type ListWhatsAppMessagesQuery = z.infer<typeof listWhatsAppMessagesQuerySchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
export type CreateWhatsAppMessageInput = z.infer<typeof createWhatsAppMessageSchema>;
export type UpdateWhatsAppMessageInput = z.infer<typeof updateWhatsAppMessageSchema>;
export type SendWhatsAppMessageInput = z.infer<typeof sendWhatsAppMessageSchema>;
export type ScheduleWhatsAppMessageInput = z.infer<typeof scheduleWhatsAppMessageSchema>;
export type BroadcastWhatsAppMessageInput = z.infer<typeof broadcastWhatsAppMessageSchema>;
export type CreateWhatsAppTemplateInput = z.infer<typeof createWhatsAppTemplateSchema>;
export type UpdateWhatsAppTemplateInput = z.infer<typeof updateWhatsAppTemplateSchema>;
export type CreateWhatsAppAutomationRuleInput = z.infer<typeof createWhatsAppAutomationRuleSchema>;
export type UpdateWhatsAppAutomationRuleInput = z.infer<typeof updateWhatsAppAutomationRuleSchema>;

// Backward-compatible exports
export const idParamSchema = whatsappIdParamSchema;
export const listQuerySchema = listWhatsAppMessagesQuerySchema;
export const createSchema = createWhatsAppMessageSchema;
export const updateSchema = updateWhatsAppMessageSchema;
export type ListQuery = ListWhatsAppMessagesQuery;
export type CreateInput = CreateWhatsAppMessageInput;
export type UpdateInput = UpdateWhatsAppMessageInput;
