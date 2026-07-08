import { z } from "zod";
import {
  INTERNAL_FEEDBACK_STATUSES,
  REVIEW_GROWTH_CAMPAIGN_TRIGGERS,
  REVIEW_PLATFORMS,
  REVIEW_REQUEST_STATUSES,
} from "@hotel-growth-os/shared";
import { objectIdSchema, paginationSchema } from "../../validations/common";

export const idParamSchema = z.object({ id: objectIdSchema });

const googleReviewUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return /(google|g\.page|maps\.app\.goo\.gl|goo\.gl)/i.test(
        url.hostname + url.pathname,
      );
    } catch {
      return false;
    }
  }, "Invalid Google Review URL");

const phoneSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ""))
  .refine((value) => /^\+?[1-9]\d{7,14}$/.test(value), "Invalid phone number");
const emailSchema = z.string().email();
const delayMinutesSchema = z.coerce.number().int().min(0).max(43200);
const ratingSchema = z.coerce.number().min(1).max(5);

export const reviewCampaignListQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  trigger: z.enum(REVIEW_GROWTH_CAMPAIGN_TRIGGERS).optional(),
  isActive: z.coerce.boolean().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const reviewCampaignCreateSchema = z.object({
  hotelId: objectIdSchema.optional(),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  trigger: z.enum(REVIEW_GROWTH_CAMPAIGN_TRIGGERS),
  templateId: objectIdSchema.optional(),
  settingsId: objectIdSchema.optional(),
  isActive: z.boolean().default(true),
  delayMinutes: delayMinutesSchema.default(60),
  audienceFilters: z
    .object({
      guestTags: z.array(z.string()).optional(),
      bookingStatuses: z.array(z.string()).optional(),
      minRating: ratingSchema.optional(),
      maxRating: ratingSchema.optional(),
    })
    .optional(),
});

export const reviewCampaignUpdateSchema = reviewCampaignCreateSchema.partial();

export const reviewRequestListQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  status: z.enum(REVIEW_REQUEST_STATUSES).optional(),
  guestId: objectIdSchema.optional(),
  bookingId: objectIdSchema.optional(),
  campaignId: objectIdSchema.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const reviewRequestCreateSchema = z.object({
  hotelId: objectIdSchema.optional(),
  campaignId: objectIdSchema.optional(),
  bookingId: objectIdSchema,
  guestId: objectIdSchema,
  reviewId: objectIdSchema.optional(),
  templateId: objectIdSchema.optional(),
  platform: z.enum(REVIEW_PLATFORMS).default("GOOGLE"),
  channel: z.enum(["whatsapp", "sms", "email"]).default("whatsapp"),
  recipientPhone: phoneSchema.optional(),
  recipientEmail: emailSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
  reviewUrl: googleReviewUrlSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const reviewRequestStatusSchema = z.object({
  status: z.enum(REVIEW_REQUEST_STATUSES),
  failureReason: z.string().max(1000).optional(),
});

export const reviewRequestSendSchema = z.object({
  channel: z.enum(["whatsapp", "sms", "email"]).optional(),
  recipientPhone: phoneSchema.optional(),
  recipientEmail: emailSchema.optional(),
});

export const reviewRequestCancelSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const guestReviewListQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  guestId: objectIdSchema.optional(),
  bookingId: objectIdSchema.optional(),
  platform: z.enum(REVIEW_PLATFORMS).optional(),
  rating: ratingSchema.optional(),
  ratingMin: ratingSchema.optional(),
  ratingMax: ratingSchema.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const guestReviewCreateSchema = z.object({
  hotelId: objectIdSchema.optional(),
  guestId: objectIdSchema,
  bookingId: objectIdSchema.optional(),
  reviewRequestId: objectIdSchema.optional(),
  internalReviewId: objectIdSchema.optional(),
  platform: z.enum(REVIEW_PLATFORMS).default("GOOGLE"),
  externalReviewId: z.string().optional(),
  rating: ratingSchema,
  title: z.string().max(200).optional(),
  comment: z.string().max(5000).optional(),
  reviewerName: z.string().max(120).optional(),
  reviewUrl: googleReviewUrlSchema.optional(),
  reviewedAt: z.coerce.date().optional(),
  tags: z.array(z.string()).optional(),
});

export const internalFeedbackCreateSchema = z.object({
  hotelId: objectIdSchema.optional(),
  guestId: objectIdSchema,
  bookingId: objectIdSchema.optional(),
  reviewRequestId: objectIdSchema.optional(),
  guestReviewId: objectIdSchema.optional(),
  rating: ratingSchema.optional(),
  category: z
    .enum(["service", "cleanliness", "billing", "staff", "amenities", "other"])
    .default("service"),
  feedback: z.string().min(2).max(5000),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignedTo: objectIdSchema.optional(),
  tags: z.array(z.string()).optional(),
});

export const feedbackCategoryCreateSchema = z.object({
  hotelId: objectIdSchema.optional(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
});

export const feedbackCategoryUpdateSchema =
  feedbackCategoryCreateSchema.partial();

export const internalFeedbackListQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(INTERNAL_FEEDBACK_STATUSES).optional(),
  category: z
    .enum(["service", "cleanliness", "billing", "staff", "amenities", "other"])
    .optional(),
  assignedTo: objectIdSchema.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const internalFeedbackStatusSchema = z.object({
  status: z.enum(INTERNAL_FEEDBACK_STATUSES),
  resolutionNotes: z.string().max(3000).optional(),
});

export const internalFeedbackAssignSchema = z.object({
  assignedTo: objectIdSchema,
});

export const reviewTemplateCreateSchema = z.object({
  hotelId: objectIdSchema.optional(),
  name: z.string().min(2).max(120),
  platform: z.enum(REVIEW_PLATFORMS).default("GOOGLE"),
  channel: z.enum(["whatsapp", "sms", "email"]).default("whatsapp"),
  subject: z.string().max(200).optional(),
  body: z.string().min(2).max(4000),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const reviewTemplateUpdateSchema = reviewTemplateCreateSchema.partial();

export const reviewTemplateListQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  platform: z.enum(REVIEW_PLATFORMS).optional(),
  channel: z.enum(["whatsapp", "sms", "email"]).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const duplicateTemplateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
});

export const reviewSettingsSchema = z.object({
  hotelId: objectIdSchema.optional(),
  isEnabled: z.boolean().default(true),
  defaultPlatform: z.enum(REVIEW_PLATFORMS).default("GOOGLE"),
  googleReviewUrl: googleReviewUrlSchema.optional(),
  defaultDelayMinutes: delayMinutesSchema.default(120),
  reminderDelayMinutes: delayMinutesSchema.default(1440),
  recoveryDelayMinutes: delayMinutesSchema.default(2880),
  requestExpiryDays: z.coerce.number().int().min(1).max(365).default(14),
  autoSendOnCheckout: z.boolean().default(true),
  autoSendOnBookingCompleted: z.boolean().default(true),
  positiveRatingThreshold: ratingSchema.default(4),
  negativeRatingThreshold: ratingSchema.default(3),
  channels: z
    .object({
      whatsapp: z.boolean().default(true),
      sms: z.boolean().default(false),
      email: z.boolean().default(false),
    })
    .default({}),
  notificationUserIds: z.array(objectIdSchema).optional(),
});

export const autoSendToggleSchema = z.object({
  enabled: z.boolean(),
});

export const reminderConfigurationSchema = z.object({
  defaultDelayMinutes: delayMinutesSchema.optional(),
  reminderDelayMinutes: delayMinutesSchema.optional(),
  recoveryDelayMinutes: delayMinutesSchema.optional(),
  requestExpiryDays: z.coerce.number().int().min(1).max(365).optional(),
});

export const googleReviewUrlValidationSchema = z.object({
  url: googleReviewUrlSchema,
});

export const dashboardQuerySchema = z.object({
  hotelId: objectIdSchema.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const analyticsQuerySchema = dashboardQuerySchema.extend({
  campaignId: objectIdSchema.optional(),
});

export const exportQuerySchema = dashboardQuerySchema.extend({
  format: z.enum(["csv", "excel", "pdf"]).default("csv"),
  guestId: objectIdSchema.optional(),
  campaignId: objectIdSchema.optional(),
  rating: ratingSchema.optional(),
});

export type ReviewCampaignListQuery = z.infer<
  typeof reviewCampaignListQuerySchema
>;
export type ReviewCampaignCreateInput = z.infer<
  typeof reviewCampaignCreateSchema
>;
export type ReviewCampaignUpdateInput = z.infer<
  typeof reviewCampaignUpdateSchema
>;
export type ReviewRequestListQuery = z.infer<
  typeof reviewRequestListQuerySchema
>;
export type ReviewRequestCreateInput = z.infer<
  typeof reviewRequestCreateSchema
>;
export type ReviewRequestStatusInput = z.infer<
  typeof reviewRequestStatusSchema
>;
export type ReviewRequestSendInput = z.infer<typeof reviewRequestSendSchema>;
export type ReviewRequestCancelInput = z.infer<
  typeof reviewRequestCancelSchema
>;
export type GuestReviewListQuery = z.infer<typeof guestReviewListQuerySchema>;
export type GuestReviewCreateInput = z.infer<typeof guestReviewCreateSchema>;
export type InternalFeedbackListQuery = z.infer<
  typeof internalFeedbackListQuerySchema
>;
export type InternalFeedbackCreateInput = z.infer<
  typeof internalFeedbackCreateSchema
>;
export type InternalFeedbackStatusInput = z.infer<
  typeof internalFeedbackStatusSchema
>;
export type InternalFeedbackAssignInput = z.infer<
  typeof internalFeedbackAssignSchema
>;
export type ReviewTemplateCreateInput = z.infer<
  typeof reviewTemplateCreateSchema
>;
export type ReviewTemplateUpdateInput = z.infer<
  typeof reviewTemplateUpdateSchema
>;
export type ReviewTemplateListQuery = z.infer<
  typeof reviewTemplateListQuerySchema
>;
export type DuplicateTemplateInput = z.infer<typeof duplicateTemplateSchema>;
export type ReviewSettingsInput = z.infer<typeof reviewSettingsSchema>;
export type AutoSendToggleInput = z.infer<typeof autoSendToggleSchema>;
export type ReminderConfigurationInput = z.infer<
  typeof reminderConfigurationSchema
>;
export type GoogleReviewUrlValidationInput = z.infer<
  typeof googleReviewUrlValidationSchema
>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
