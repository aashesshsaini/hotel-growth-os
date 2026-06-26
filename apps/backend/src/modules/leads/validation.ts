import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../validations/common';
import { LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES, LEAD_TYPES } from '../../models/Lead';

const optionalBoolean = z
  .union([z.boolean(), z.literal('true'), z.literal('false')])
  .transform((val) => val === true || val === 'true')
  .optional();

export const listLeadsQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  search: z.string().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  leadType: z.enum(LEAD_TYPES).optional(),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  assignedTo: objectIdSchema.optional(),
  followUpFrom: z.coerce.date().optional(),
  followUpTo: z.coerce.date().optional(),
  includeConverted: optionalBoolean,
  sortBy: z.enum(['createdAt', 'followUpDate', 'priority', 'status', 'leadNumber', 'estimatedValue']).optional(),
});

export const leadIdParamSchema = z.object({ id: objectIdSchema });

const leadBaseFields = {
  hotelId: objectIdSchema.optional(),
  fullName: z.string().min(2).max(120),
  phone: z.string().min(5).max(20),
  email: z.string().email().optional().or(z.literal('')),
  companyName: z.string().max(160).optional(),
  city: z.string().max(100).optional(),
  source: z.enum(LEAD_SOURCES),
  leadType: z.enum(LEAD_TYPES),
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  estimatedValue: z.number().min(0).optional(),
  expectedRooms: z.number().int().min(0).optional(),
  expectedGuests: z.number().int().min(0).optional(),
  checkInDate: z.coerce.date().optional(),
  checkOutDate: z.coerce.date().optional(),
  eventDate: z.coerce.date().optional(),
  assignedTo: objectIdSchema.optional(),
  followUpDate: z.coerce.date().optional(),
  notes: z.string().max(3000).optional(),
  lostReason: z.string().max(1000).optional(),
  enquiryId: objectIdSchema.optional(),
  corporateLeadId: objectIdSchema.optional(),
  eventLeadId: objectIdSchema.optional(),
};

const createLeadObjectSchema = z.object(leadBaseFields);
export const createLeadSchema = createLeadObjectSchema.refine(
  (data) => !data.checkInDate || !data.checkOutDate || data.checkOutDate > data.checkInDate,
  { message: 'Check-out date must be after check-in date', path: ['checkOutDate'] }
);
export const updateLeadSchema = createLeadObjectSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

export const assignLeadSchema = z.object({
  assignedTo: objectIdSchema,
  notes: z.string().max(1000).optional(),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  notes: z.string().max(1000).optional(),
  lostReason: z.string().max(1000).optional(),
  followUpDate: z.coerce.date().optional(),
});

export const addLeadNoteSchema = z.object({
  note: z.string().min(1).max(3000),
});

export const convertLeadToBookingSchema = z.object({
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

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type AddLeadNoteInput = z.infer<typeof addLeadNoteSchema>;
export type ConvertLeadToBookingInput = z.infer<typeof convertLeadToBookingSchema>;
