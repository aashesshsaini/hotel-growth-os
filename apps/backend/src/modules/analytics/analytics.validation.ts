import { z } from 'zod';
import { objectIdSchema } from '../../validations/common';

export const analyticsQuerySchema = z.object({
  hotelId: objectIdSchema.optional(),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']).default('monthly'),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const exportQuerySchema = analyticsQuerySchema.extend({
  type: z.enum(['overview', 'revenue', 'bookings', 'leads', 'payments', 'reviews']).default('overview'),
  format: z.enum(['csv']).default('csv'),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
