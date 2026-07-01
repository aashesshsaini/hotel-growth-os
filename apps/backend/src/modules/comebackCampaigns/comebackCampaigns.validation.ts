import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID') });
const channelSchema = z.enum(['whatsapp', 'email', 'sms']);
const statusSchema = z.enum(['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'archived', 'failed']);
const offerTypeSchema = z.enum(['flat_discount', 'percentage_discount', 'free_breakfast', 'free_upgrade', 'late_checkout', 'welcome_drink', 'package_deal', 'coupon_code', 'custom_offer']);

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const settingsSchema = z.object({
  isEnabled: z.boolean(),
  isPaused: z.boolean().optional(),
  inactiveAfterDays: z.array(z.coerce.number().int().refine((value) => [30, 60, 90, 180, 365].includes(value))).min(1),
  cooldownDays: z.coerce.number().int().min(1).max(365),
  defaultChannel: channelSchema,
  fallbackChannel: z.enum(['whatsapp', 'email', 'sms', 'none']),
  sendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().min(2).max(80),
  retryEnabled: z.boolean(),
  signature: z.string().max(500).optional().or(z.literal('')),
});

export const audienceSchema = z.object({
  channel: channelSchema,
  inactiveAfterDays: z.coerce.number().int().refine((value) => [30, 60, 90, 180, 365].includes(value)),
  filters: z.object({
    lastStayFrom: z.coerce.date().optional(),
    lastStayTo: z.coerce.date().optional(),
    minBookings: z.coerce.number().int().min(0).optional(),
    minSpend: z.coerce.number().min(0).optional(),
    maxSpend: z.coerce.number().min(0).optional(),
    roomTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    tags: z.array(z.string()).optional(),
    guestType: z.enum(['individual', 'family', 'corporate', 'event_guest', 'walk_in', 'ota_guest', 'vip']).optional(),
    isVip: z.coerce.boolean().optional(),
  }).optional(),
});

export const templateListQuerySchema = listQuerySchema.extend({ channel: channelSchema.optional(), isActive: z.coerce.boolean().optional() });
export const templateCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  channel: channelSchema,
  subject: z.string().trim().max(160).optional().or(z.literal('')),
  body: z.string().trim().min(5).max(3000),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});
export const templateUpdateSchema = templateCreateSchema.partial();
export const duplicateSchema = z.object({ name: z.string().trim().min(2).max(120).optional() });

export const campaignListQuerySchema = listQuerySchema.extend({ status: statusSchema.optional(), channel: channelSchema.optional(), inactiveAfterDays: z.coerce.number().optional() });
export const campaignCreateSchema = z.object({
  templateId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  name: z.string().trim().min(2).max(140),
  channel: channelSchema,
  inactiveAfterDays: z.coerce.number().int().refine((value) => [30, 60, 90, 180, 365].includes(value)),
  audienceFilters: audienceSchema.shape.filters,
  offer: z.object({
    type: offerTypeSchema,
    title: z.string().trim().min(2).max(160),
    value: z.coerce.number().min(0).optional(),
    couponCode: z.string().trim().max(40).optional().or(z.literal('')),
    expiryDate: z.coerce.date().optional(),
    bookingLink: z.string().url().optional().or(z.literal('')),
    description: z.string().max(500).optional().or(z.literal('')),
  }),
  scheduledAt: z.coerce.date().optional(),
  sendNow: z.boolean().optional(),
});
export const campaignUpdateSchema = campaignCreateSchema.partial();
export const historyQuerySchema = listQuerySchema.extend({ status: z.enum(['pending', 'queued', 'sent', 'delivered', 'opened', 'failed', 'cancelled', 'skipped']).optional(), channel: channelSchema.optional(), campaignId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional() });
export const analyticsQuerySchema = z.object({ months: z.coerce.number().int().min(1).max(24).default(6) });
export const testMessageSchema = z.object({ campaignId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(), channel: channelSchema.optional(), recipient: z.string().trim().min(5).max(120) });

export type ListQuery = z.infer<typeof listQuerySchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type AudienceInput = z.infer<typeof audienceSchema>;
export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type TestMessageInput = z.infer<typeof testMessageSchema>;
