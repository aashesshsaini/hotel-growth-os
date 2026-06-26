import { z } from 'zod';
import { objectIdSchema } from '../../validations/common';

export const REPORT_CATEGORIES = [
  'bookings',
  'guests',
  'revenue',
  'payments',
  'occupancy',
  'rooms',
  'leads',
  'campaigns',
  'whatsapp',
  'reviews',
  'staff',
  'housekeeping',
  'maintenance',
] as const;

export const REPORT_PERIODS = [
  'today',
  'yesterday',
  'this_week',
  'this_month',
  'last_month',
  'this_quarter',
  'this_year',
  'custom',
] as const;

export const REPORT_EXPORT_FORMATS = ['csv', 'excel', 'pdf'] as const;

export const reportQuerySchema = z.object({
  hotelId: objectIdSchema.optional(),
  period: z.enum(REPORT_PERIODS).default('this_month'),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  search: z.string().trim().optional(),
});

export const categoryParamSchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
});

export const exportQuerySchema = reportQuerySchema.extend({
  format: z.enum(REPORT_EXPORT_FORMATS).default('csv'),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type CategoryParam = z.infer<typeof categoryParamSchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
