import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({ hotelId: objectIdSchema.optional(), status: z.string().optional() });

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  name: z.string().min(2), type: z.enum(['old_guests','festival_offer','weekend_offer','birthday_offer']), message: z.string().min(1), targetAudience: z.string().optional(), scheduledAt: z.coerce.date().optional(), status: z.enum(['draft','scheduled','running','completed','cancelled']).optional(),
});
export const updateSchema = createSchema.partial();

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
