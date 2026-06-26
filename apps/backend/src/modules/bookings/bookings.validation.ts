import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';

const bookingStatuses = [
  'inquiry',
  'reserved',
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'completed',
  'cancelled',
  'no_show',
] as const;

const bookingTypes = [
  'individual',
  'corporate',
  'wedding',
  'group',
  'walk_in',
  'online',
  'ota',
  'direct',
] as const;

const paymentStatuses = ['unpaid', 'partially_paid', 'paid', 'refunded'] as const;
const paymentMethods = ['cash', 'upi', 'card', 'net_banking', 'wallet', 'razorpay', 'bank_transfer', 'other'] as const;

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  status: z.enum(bookingStatuses).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
  bookingType: z.enum(bookingTypes).optional(),
  source: z.string().optional(),
  guestId: objectIdSchema.optional(),
  roomId: objectIdSchema.optional(),
  roomTypeId: objectIdSchema.optional(),
  checkInFrom: z.coerce.date().optional(),
  checkInTo: z.coerce.date().optional(),
  checkOutFrom: z.coerce.date().optional(),
  checkOutTo: z.coerce.date().optional(),
});

const extraServiceSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().int().min(1).default(1),
});

const bookingBody = {
  hotelId: objectIdSchema.optional(),
  guestId: objectIdSchema,
  enquiryId: objectIdSchema.optional(),
  corporateLeadId: objectIdSchema.optional(),
  eventLeadId: objectIdSchema.optional(),
  roomId: objectIdSchema.optional(),
  roomTypeId: objectIdSchema.optional(),
  bookingType: z.enum(bookingTypes).optional(),
  source: z.string().max(80).optional(),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  roomCount: z.coerce.number().int().min(1).optional(),
  adults: z.coerce.number().int().min(1),
  children: z.coerce.number().int().min(0).optional(),
  status: z.enum(bookingStatuses).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
  roomRate: z.coerce.number().min(0).optional(),
  totalAmount: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  extraCharges: z.coerce.number().min(0).optional(),
  couponCode: z.string().max(50).optional(),
  specialRequests: z.string().max(1000).optional(),
  guestPreferences: z.string().max(1000).optional(),
  internalNotes: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  extraServices: z.array(extraServiceSchema).optional(),
  assignedTo: objectIdSchema.optional(),
  expectedArrivalTime: z.string().max(20).optional(),
  expectedDepartureTime: z.string().max(20).optional(),
  isLateCheckIn: z.boolean().optional(),
  isLateCheckOut: z.boolean().optional(),
  cancellationReason: z.string().max(1000).optional(),
};

const createObjectSchema = z.object(bookingBody);

export const createSchema = createObjectSchema.refine((data) => data.checkOutDate > data.checkInDate, {
  message: 'Check-out date must be after check-in date',
  path: ['checkOutDate'],
});
export const updateSchema = createObjectSchema.partial().refine(
  (data) => !data.checkInDate || !data.checkOutDate || data.checkOutDate > data.checkInDate,
  {
    message: 'Check-out date must be after check-in date',
    path: ['checkOutDate'],
  }
);

export const statusSchema = z.object({
  status: z.enum(bookingStatuses),
  note: z.string().max(1000).optional(),
});

export const cancelSchema = z.object({
  reason: z.string().min(2).max(1000),
});

export const assignRoomSchema = z.object({
  roomId: objectIdSchema,
  note: z.string().max(1000).optional(),
});

export const notesSchema = z.object({
  notes: z.string().max(4000).optional(),
  internalNotes: z.string().max(4000).optional(),
});

export const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01),
  method: z.enum(paymentMethods),
  status: z.enum(['pending', 'paid', 'completed', 'failed', 'refunded', 'cancelled']).optional(),
  transactionId: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
export type CancelInput = z.infer<typeof cancelSchema>;
export type AssignRoomInput = z.infer<typeof assignRoomSchema>;
export type NotesInput = z.infer<typeof notesSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
