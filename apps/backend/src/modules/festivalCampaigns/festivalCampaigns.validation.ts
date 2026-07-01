import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID') });

const channelSchema = z.enum(['whatsapp', 'email', 'sms']);
const festivalCategorySchema = z.enum(['festival', 'national_holiday', 'global_holiday', 'seasonal_offer', 'weekend_offer', 'custom']);
const statusSchema = z.enum(['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'archived', 'failed']);
const audienceSegmentSchema = z.enum(['all_guests', 'repeat_guests', 'vip_guests', 'inactive_guests', 'recent_guests', 'birthday_guests', 'anniversary_guests', 'referral_guests', 'custom']);
const offerTypeSchema = z.enum(['percentage_discount', 'flat_discount', 'free_breakfast', 'free_upgrade', 'free_dinner', 'late_checkout', 'welcome_drink', 'coupon_code', 'package_offer', 'custom_offer']);

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const settingsSchema = z.object({
  isEnabled: z.boolean(),
  isPaused: z.boolean().optional(),
  defaultChannel: channelSchema,
  fallbackChannel: z.enum(['whatsapp', 'email', 'sms', 'none']),
  sendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().min(2).max(80),
  retryEnabled: z.boolean(),
  recurringEnabled: z.boolean(),
  signature: z.string().max(500).optional().or(z.literal('')),
});

export const festivalCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  date: z.coerce.date(),
  category: festivalCategorySchema,
  defaultBanner: z.string().url().optional().or(z.literal('')),
  defaultMessage: z.string().trim().min(5).max(1000),
  defaultOffer: z.string().trim().min(2).max(300),
  isRecurring: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const festivalUpdateSchema = festivalCreateSchema.partial();

export const templateListQuerySchema = listQuerySchema.extend({
  channel: channelSchema.optional(),
  festivalId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const templateCreateSchema = z.object({
  festivalId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  name: z.string().trim().min(2).max(120),
  channel: channelSchema,
  subject: z.string().trim().max(160).optional().or(z.literal('')),
  body: z.string().trim().min(5).max(3000),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const templateUpdateSchema = templateCreateSchema.partial();
export const duplicateSchema = z.object({ name: z.string().trim().min(2).max(120).optional() });

const audienceFiltersSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  minSpend: z.coerce.number().min(0).optional(),
  maxSpend: z.coerce.number().min(0).optional(),
  lastStayDays: z.coerce.number().int().min(1).max(3650).optional(),
  minBookings: z.coerce.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
}).optional();

export const campaignListQuerySchema = listQuerySchema.extend({
  status: statusSchema.optional(),
  channel: channelSchema.optional(),
  audienceSegment: audienceSegmentSchema.optional(),
  festivalId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

export const campaignCreateSchema = z.object({
  festivalId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  templateId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  name: z.string().trim().min(2).max(140),
  channel: channelSchema,
  audienceSegment: audienceSegmentSchema,
  audienceFilters: audienceFiltersSchema,
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
  recurring: z.enum(['none', 'yearly']).default('none'),
  sendNow: z.boolean().optional(),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

export const historyQuerySchema = listQuerySchema.extend({
  status: z.enum(['pending', 'queued', 'sent', 'delivered', 'opened', 'failed', 'cancelled', 'skipped']).optional(),
  channel: channelSchema.optional(),
  campaignId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

export const analyticsQuerySchema = z.object({ months: z.coerce.number().int().min(1).max(24).default(6) });

export const testCampaignSchema = z.object({
  campaignId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  festivalId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  channel: channelSchema.optional(),
  recipient: z.string().trim().min(5).max(120),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type FestivalCreateInput = z.infer<typeof festivalCreateSchema>;
export type FestivalUpdateInput = z.infer<typeof festivalUpdateSchema>;
export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type TestCampaignInput = z.infer<typeof testCampaignSchema>;
