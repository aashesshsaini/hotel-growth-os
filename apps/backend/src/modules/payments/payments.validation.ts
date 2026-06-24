import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({ hotelId: objectIdSchema.optional(), status: z.string().optional() });

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  bookingId: objectIdSchema, guestId: objectIdSchema, amount: z.coerce.number().min(0), method: z.enum(['cash','upi','razorpay','card','bank_transfer']), status: z.enum(['pending','completed','failed','refunded']).optional(), transactionId: z.string().optional(), notes: z.string().optional(), paidAt: z.coerce.date().optional(),
});
export const updateSchema = createSchema.partial();

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
