import { z } from 'zod';
import {
  CAMPAIGN_AUDIENCE_SEGMENTS,
  CAMPAIGN_CHANNELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
} from '@hotel-growth-os/shared';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const campaignIdParamSchema = z.object({ id: objectIdSchema });

export const listCampaignsQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  type: z.enum(CAMPAIGN_TYPES).optional(),
  channel: z.enum(CAMPAIGN_CHANNELS).optional(),
  audienceSegment: z.enum(CAMPAIGN_AUDIENCE_SEGMENTS).optional(),
  assignedTo: objectIdSchema.optional(),
  scheduledFrom: z.coerce.date().optional(),
  scheduledTo: z.coerce.date().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
});

export const audienceFiltersSchema = z.object({
  city: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lastBookingDays: z.coerce.number().int().min(1).optional(),
  inactiveDays: z.coerce.number().int().min(1).optional(),
  customGuestIds: z.array(objectIdSchema).optional(),
  customLeadIds: z.array(objectIdSchema).optional(),
  customEnquiryIds: z.array(objectIdSchema).optional(),
});

const createCampaignObjectSchema = z.object({
  hotelId: objectIdSchema.optional(),
  name: z.string().min(2).max(160),
  type: z.enum(CAMPAIGN_TYPES),
  channel: z.enum(CAMPAIGN_CHANNELS).optional(),
  message: z.string().min(1).max(5000),
  subject: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  targetAudience: z.string().max(500).optional(),
  audienceSegment: z.enum(CAMPAIGN_AUDIENCE_SEGMENTS).optional(),
  audienceFilters: audienceFiltersSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  assignedTo: objectIdSchema.optional(),
  internalNotes: z.string().max(3000).optional(),
  tags: z.array(z.string()).optional(),
});

export const createCampaignSchema = createCampaignObjectSchema.refine(
  (data) => {
    if (data.status === 'scheduled' && !data.scheduledAt) return false;
    return true;
  },
  { message: 'Scheduled campaigns require a scheduled date', path: ['scheduledAt'] }
);

export const updateCampaignSchema = createCampaignObjectSchema.partial();

export const updateCampaignStatusSchema = z.object({
  status: z.enum(CAMPAIGN_STATUSES),
  notes: z.string().max(1000).optional(),
});

export const addCampaignNoteSchema = z.object({
  text: z.string().min(1).max(2000),
});

export const launchCampaignSchema = z.object({
  dryRun: z.boolean().optional(),
});

export const listCampaignLogsQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'responded']).optional(),
});

export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type UpdateCampaignStatusInput = z.infer<typeof updateCampaignStatusSchema>;
export type AddCampaignNoteInput = z.infer<typeof addCampaignNoteSchema>;
export type LaunchCampaignInput = z.infer<typeof launchCampaignSchema>;
export type ListCampaignLogsQuery = z.infer<typeof listCampaignLogsQuerySchema>;

// Backward-compatible exports for existing imports
export const idParamSchema = campaignIdParamSchema;
export const listQuerySchema = listCampaignsQuerySchema;
export const createSchema = createCampaignSchema;
export const updateSchema = updateCampaignSchema;
export type ListQuery = ListCampaignsQuery;
export type CreateInput = CreateCampaignInput;
export type UpdateInput = UpdateCampaignInput;
