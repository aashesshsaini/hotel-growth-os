import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({ hotelId: objectIdSchema.optional(), status: z.string().optional() });

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  phone: z.string().min(5), content: z.string().min(1), direction: z.enum(['incoming','outgoing']).default('outgoing'), messageType: z.enum(['text','image','document','template']).optional(), status: z.enum(['received','sent','delivered','read','failed']).optional(), guestId: objectIdSchema.optional(), enquiryId: objectIdSchema.optional(), metadata: z.record(z.unknown()).optional(),
});
export const updateSchema = createSchema.partial();

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
