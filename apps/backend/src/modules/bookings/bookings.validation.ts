import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({ hotelId: objectIdSchema.optional(), status: z.string().optional() });

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  guestId: objectIdSchema, enquiryId: objectIdSchema.optional(), checkInDate: z.coerce.date(), checkOutDate: z.coerce.date(), adults: z.coerce.number().min(1), children: z.coerce.number().min(0).optional(), status: z.enum(['pending','confirmed','checked_in','checked_out','cancelled']).optional(), paymentStatus: z.enum(['unpaid','partially_paid','paid','refunded']).optional(), totalAmount: z.coerce.number().min(0), paidAmount: z.coerce.number().min(0).optional(), discount: z.coerce.number().min(0).optional(), specialRequests: z.string().optional(), cancellationReason: z.string().optional(),
});
export const updateSchema = createSchema.partial();

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
