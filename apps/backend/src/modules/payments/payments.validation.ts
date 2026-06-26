import { z } from 'zod';
import {
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_RECORD_STATUSES,
  PAYMENT_TYPES,
} from '@hotel-growth-os/shared';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });
export const bookingIdParamSchema = z.object({ bookingId: objectIdSchema });

export const listQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  status: z.enum([...PAYMENT_RECORD_STATUSES, 'completed'] as [string, ...string[]]).optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  paymentType: z.enum(PAYMENT_TYPES).optional(),
  bookingId: objectIdSchema.optional(),
  guestId: objectIdSchema.optional(),
  invoiceStatus: z.enum(INVOICE_STATUSES).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  bookingId: objectIdSchema,
  guestId: objectIdSchema.optional(),
  amount: z.coerce.number(),
  method: z.enum(PAYMENT_METHODS),
  paymentType: z.enum(PAYMENT_TYPES).optional(),
  status: z.enum([...PAYMENT_RECORD_STATUSES, 'completed'] as [string, ...string[]]).optional(),
  invoiceStatus: z.enum(INVOICE_STATUSES).optional(),
  transactionId: z.string().optional(),
  upiReference: z.string().optional(),
  bankReference: z.string().optional(),
  cardLast4: z.string().max(4).optional(),
  gatewayProvider: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  paidAt: z.coerce.date().optional(),
  receivedBy: objectIdSchema.optional(),
  sendReminder: z.boolean().optional(),
});

export const updateSchema = createSchema.partial();

export const refundSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  refundReason: z.string().min(1),
  method: z.enum(PAYMENT_METHODS).optional(),
  notes: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([...PAYMENT_RECORD_STATUSES, 'completed'] as [string, ...string[]]),
  note: z.string().optional(),
});

export const addPaymentNoteSchema = z.object({
  text: z.string().min(1),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type AddPaymentNoteInput = z.infer<typeof addPaymentNoteSchema>;
