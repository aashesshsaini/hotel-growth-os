import { z } from 'zod';
import { objectIdSchema } from '../../validations/common';

export const CALENDAR_VIEWS = ['day', 'week', 'month', 'timeline', 'resource'] as const;

export const calendarQuerySchema = z.object({
  hotelId: objectIdSchema.optional(),
  view: z.enum(CALENDAR_VIEWS).default('week'),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  roomId: objectIdSchema.optional(),
  roomTypeId: objectIdSchema.optional(),
  floor: z.coerce.number().int().optional(),
  status: z.string().optional(),
  bookingType: z.string().optional(),
  search: z.string().trim().optional(),
});

export const conflictQuerySchema = z.object({
  hotelId: objectIdSchema.optional(),
  roomId: objectIdSchema,
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  excludeBookingId: objectIdSchema.optional(),
});

export const moveBookingSchema = z.object({
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  roomId: objectIdSchema.optional(),
  note: z.string().max(1000).optional(),
}).refine((data) => data.checkOutDate > data.checkInDate, {
  message: 'Check-out must be after check-in',
  path: ['checkOutDate'],
});

export const resizeBookingSchema = z.object({
  checkInDate: z.coerce.date().optional(),
  checkOutDate: z.coerce.date().optional(),
  note: z.string().max(1000).optional(),
}).refine(
  (data) => data.checkInDate || data.checkOutDate,
  { message: 'At least one date is required', path: ['checkOutDate'] }
);

export const quickBookingSchema = z.object({
  hotelId: objectIdSchema.optional(),
  guestId: objectIdSchema,
  roomId: objectIdSchema.optional(),
  roomTypeId: objectIdSchema.optional(),
  bookingType: z.enum(['individual', 'corporate', 'wedding', 'group', 'walk_in', 'online', 'ota', 'direct']).default('individual'),
  source: z.string().max(80).optional(),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  adults: z.coerce.number().int().min(1).default(1),
  children: z.coerce.number().int().min(0).default(0),
  totalAmount: z.coerce.number().min(0).default(0),
  status: z.enum(['reserved', 'pending', 'confirmed']).default('reserved'),
  notes: z.string().max(1000).optional(),
}).refine((data) => data.checkOutDate > data.checkInDate, {
  message: 'Check-out must be after check-in',
  path: ['checkOutDate'],
});

export const idParamSchema = z.object({ id: objectIdSchema });

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type ConflictQuery = z.infer<typeof conflictQuerySchema>;
export type MoveBookingInput = z.infer<typeof moveBookingSchema>;
export type ResizeBookingInput = z.infer<typeof resizeBookingSchema>;
export type QuickBookingInput = z.infer<typeof quickBookingSchema>;
