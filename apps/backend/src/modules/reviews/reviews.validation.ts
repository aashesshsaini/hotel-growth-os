import { z } from 'zod';
import { REVIEW_CHANNELS, REVIEW_SOURCES, REVIEW_STATUSES } from '@hotel-growth-os/shared';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });
export const tokenParamSchema = z.object({ token: z.string().min(16) });

export const listQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  status: z.enum(REVIEW_STATUSES).optional(),
  source: z.enum(REVIEW_SOURCES).optional(),
  requestChannel: z.enum(REVIEW_CHANNELS).optional(),
  guestId: objectIdSchema.optional(),
  bookingId: objectIdSchema.optional(),
  assignedTo: objectIdSchema.optional(),
  isPositive: z.coerce.boolean().optional(),
  ratingMin: z.coerce.number().min(1).max(5).optional(),
  ratingMax: z.coerce.number().min(1).max(5).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

const departmentRatingsSchema = z.object({
  frontOffice: z.coerce.number().min(1).max(5).optional(),
  housekeeping: z.coerce.number().min(1).max(5).optional(),
  restaurant: z.coerce.number().min(1).max(5).optional(),
  spa: z.coerce.number().min(1).max(5).optional(),
  maintenance: z.coerce.number().min(1).max(5).optional(),
});

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  bookingId: objectIdSchema,
  guestId: objectIdSchema,
  status: z.enum(REVIEW_STATUSES).optional(),
  source: z.enum(REVIEW_SOURCES).optional(),
  requestChannel: z.enum(REVIEW_CHANNELS).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  staffRating: z.coerce.number().min(1).max(5).optional(),
  departmentRatings: departmentRatingsSchema.optional(),
  feedback: z.string().optional(),
  isPositive: z.boolean().optional(),
  sentimentTags: z.array(z.string()).optional(),
  googleReviewSent: z.boolean().optional(),
  managerNotified: z.boolean().optional(),
  assignedTo: objectIdSchema.optional(),
  requestSentAt: z.coerce.date().optional(),
  submittedAt: z.coerce.date().optional(),
  internalNotes: z.string().optional(),
});

export const updateSchema = createSchema.partial();

export const requestReviewSchema = z.object({
  bookingId: objectIdSchema,
  guestId: objectIdSchema.optional(),
  requestChannel: z.enum(REVIEW_CHANNELS).default('whatsapp'),
  sendNow: z.boolean().optional(),
});

export const replyReviewSchema = z.object({
  managerReply: z.string().min(1),
});

export const escalateReviewSchema = z.object({
  assignedTo: objectIdSchema.optional(),
  note: z.string().optional(),
});

export const resolveReviewSchema = z.object({
  note: z.string().optional(),
});

export const addReviewNoteSchema = z.object({
  text: z.string().min(1),
});

export const publicSubmitSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  feedback: z.string().optional(),
  staffRating: z.coerce.number().min(1).max(5).optional(),
  departmentRatings: departmentRatingsSchema.optional(),
  source: z.enum(REVIEW_SOURCES).default('website'),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type RequestReviewInput = z.infer<typeof requestReviewSchema>;
export type ReplyReviewInput = z.infer<typeof replyReviewSchema>;
export type EscalateReviewInput = z.infer<typeof escalateReviewSchema>;
export type ResolveReviewInput = z.infer<typeof resolveReviewSchema>;
export type AddReviewNoteInput = z.infer<typeof addReviewNoteSchema>;
export type PublicSubmitInput = z.infer<typeof publicSubmitSchema>;
