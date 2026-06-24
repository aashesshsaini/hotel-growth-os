import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({ hotelId: objectIdSchema.optional(), status: z.string().optional() });

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  bookingId: objectIdSchema, guestId: objectIdSchema, rating: z.coerce.number().min(1).max(5), feedback: z.string().optional(), isPositive: z.boolean().optional(), googleReviewSent: z.boolean().optional(), managerNotified: z.boolean().optional(), requestSentAt: z.coerce.date().optional(), submittedAt: z.coerce.date().optional(),
});
export const updateSchema = createSchema.partial();

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
