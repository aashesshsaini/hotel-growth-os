import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({ hotelId: objectIdSchema.optional(), status: z.string().optional() });

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  guestName: z.string().min(2), phone: z.string().min(5), email: z.string().email().optional().or(z.literal('')), source: z.enum(['whatsapp','phone','website','walk_in','instagram','facebook']).default('phone'), status: z.enum(['new','contacted','interested','booked','lost']).optional(), checkInDate: z.coerce.date().optional(), checkOutDate: z.coerce.date().optional(), guestsCount: z.coerce.number().min(1).optional(), roomTypePreference: z.string().optional(), budget: z.coerce.number().min(0).optional(), followUpDate: z.coerce.date().optional(), notes: z.string().optional(), lostReason: z.string().optional(),
});
export const updateSchema = createSchema.partial();

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
