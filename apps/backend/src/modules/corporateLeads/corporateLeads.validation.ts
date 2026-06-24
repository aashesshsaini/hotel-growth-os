import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({ hotelId: objectIdSchema.optional(), status: z.string().optional() });

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  companyName: z.string().min(2), contactPerson: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional().or(z.literal('')), status: z.string().optional(), notes: z.string().optional(),
});
export const updateSchema = createSchema.partial();

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
