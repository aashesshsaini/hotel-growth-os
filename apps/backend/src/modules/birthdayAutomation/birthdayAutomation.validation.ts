import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID') });

const channelSchema = z.enum(['whatsapp', 'email', 'sms']);
const occasionSchema = z.enum(['birthday', 'anniversary']);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Send time must use HH:mm format');

export const settingsSchema = z.object({
  birthdayEnabled: z.boolean(),
  anniversaryEnabled: z.boolean(),
  daysBeforeBirthday: z.coerce.number().int().min(0).max(30),
  daysBeforeAnniversary: z.coerce.number().int().min(0).max(30),
  sendTime: timeSchema,
  timezone: z.string().min(2).max(80),
  preferredChannel: channelSchema,
  fallbackChannel: z.enum(['whatsapp', 'email', 'sms', 'none']),
  signature: z.string().max(500).optional().or(z.literal('')),
  reminderEnabled: z.boolean(),
  retryEnabled: z.boolean(),
});

export const templateListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  occasion: occasionSchema.optional(),
  channel: channelSchema.optional(),
  isActive: z.coerce.boolean().optional(),
});

export const templateCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  occasion: occasionSchema,
  channel: channelSchema,
  subject: z.string().trim().max(160).optional().or(z.literal('')),
  body: z.string().trim().min(5).max(3000),
  isActive: z.boolean().optional(),
});

export const templateUpdateSchema = templateCreateSchema.partial();

export const duplicateTemplateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
});

export const campaignListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  occasion: occasionSchema.optional(),
  channel: channelSchema.optional(),
  status: z.enum(['draft', 'scheduled', 'running', 'completed', 'cancelled', 'failed']).optional(),
});

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  occasion: occasionSchema,
  channel: channelSchema,
  templateId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  scheduledAt: z.coerce.date().optional(),
  filters: z.object({
    search: z.string().optional(),
    guestType: z.string().optional(),
    city: z.string().optional(),
    isVip: z.coerce.boolean().optional(),
  }).optional(),
  sendNow: z.boolean().optional(),
});

export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  occasion: occasionSchema.optional(),
  channel: channelSchema.optional(),
  status: z.enum(['pending', 'queued', 'sent', 'delivered', 'opened', 'failed', 'cancelled', 'skipped']).optional(),
});

export const analyticsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

export const manualSendSchema = z.object({
  occasion: occasionSchema,
  channel: channelSchema.optional(),
  guestIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).max(250).optional(),
  templateId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const testMessageSchema = z.object({
  occasion: occasionSchema,
  channel: channelSchema.optional(),
  recipient: z.string().trim().min(5).max(120),
  templateId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

export const scanSchema = z.object({
  date: z.coerce.date().optional(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type ManualSendInput = z.infer<typeof manualSendSchema>;
export type TestMessageInput = z.infer<typeof testMessageSchema>;
export type ScanInput = z.infer<typeof scanSchema>;
