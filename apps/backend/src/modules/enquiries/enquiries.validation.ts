import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';
import { ENQUIRY_PRIORITIES, ENQUIRY_SOURCES, ENQUIRY_STATUSES, ENQUIRY_TYPES } from '../../models/Enquiry';

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  status: z.enum(ENQUIRY_STATUSES).optional(),
  source: z.enum(ENQUIRY_SOURCES).optional(),
  enquiryType: z.enum(ENQUIRY_TYPES).optional(),
  priority: z.enum(ENQUIRY_PRIORITIES).optional(),
  assignedTo: objectIdSchema.optional(),
  followUpFrom: z.coerce.date().optional(),
  followUpTo: z.coerce.date().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt', 'followUpDate', 'priority', 'status', 'budget']).optional(),
});

const createObjectSchema = z.object({
  hotelId: objectIdSchema.optional(),
  guestName: z.string().min(2).max(120),
  phone: z.string().min(5).max(20),
  email: z.string().email().optional().or(z.literal('')),
  source: z.enum(ENQUIRY_SOURCES).default('phone_call'),
  status: z.enum(ENQUIRY_STATUSES).optional(),
  enquiryType: z.enum(ENQUIRY_TYPES).optional(),
  priority: z.enum(ENQUIRY_PRIORITIES).optional(),
  checkInDate: z.coerce.date().optional(),
  checkOutDate: z.coerce.date().optional(),
  guestsCount: z.coerce.number().min(1).optional(),
  roomTypePreference: z.string().max(120).optional(),
  budget: z.coerce.number().min(0).optional(),
  assignedTo: objectIdSchema.optional(),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().max(3000).optional(),
  internalNotes: z.string().max(3000).optional(),
  lostReason: z.string().max(1000).optional(),
});

export const createSchema = createObjectSchema.refine((data) => !data.checkInDate || !data.checkOutDate || data.checkOutDate > data.checkInDate, {
  message: 'Check-out date must be after check-in date',
  path: ['checkOutDate'],
});
export const updateSchema = createObjectSchema.partial();
export const assignSchema = z.object({ assignedTo: objectIdSchema, notes: z.string().max(1000).optional() });
export const statusSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES),
  notes: z.string().max(1000).optional(),
  lostReason: z.string().max(1000).optional(),
  followUpDate: z.coerce.date().optional(),
});
export const noteSchema = z.object({ note: z.string().min(1).max(3000), internal: z.boolean().optional() });
export const convertToBookingSchema = z.object({
  guestId: objectIdSchema.optional(),
  roomId: objectIdSchema.optional(),
  roomTypeId: objectIdSchema.optional(),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  roomCount: z.coerce.number().int().min(1).optional(),
  adults: z.coerce.number().int().min(1).default(1),
  children: z.coerce.number().int().min(0).optional(),
  roomRate: z.coerce.number().min(0).optional(),
  totalAmount: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  assignedTo: objectIdSchema.optional(),
}).refine((data) => data.checkOutDate > data.checkInDate, {
  message: 'Check-out date must be after check-in date',
  path: ['checkOutDate'],
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type AssignInput = z.infer<typeof assignSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type ConvertToBookingInput = z.infer<typeof convertToBookingSchema>;
