import { z } from 'zod';
import {
  EVENT_LEAD_SOURCES,
  EVENT_LEAD_STATUSES,
  EVENT_PRIORITIES,
  EVENT_TYPES,
} from '../../models/EventLead';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });

export const listQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  status: z.enum(EVENT_LEAD_STATUSES).optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  priority: z.enum(EVENT_PRIORITIES).optional(),
  source: z.enum(EVENT_LEAD_SOURCES).optional(),
  assignedTo: objectIdSchema.optional(),
  eventDateFrom: z.coerce.date().optional(),
  eventDateTo: z.coerce.date().optional(),
  followUpFrom: z.coerce.date().optional(),
  followUpTo: z.coerce.date().optional(),
});

const requirementsSchema = z.object({
  venue: z.string().max(1000).optional(),
  roomBlock: z.string().max(1000).optional(),
  catering: z.string().max(1000).optional(),
  decoration: z.string().max(1000).optional(),
  avSetup: z.string().max(1000).optional(),
  specialRequests: z.string().max(2000).optional(),
});

const eventBody = {
  hotelId: objectIdSchema.optional(),
  eventName: z.string().min(2).max(160),
  eventType: z.enum(EVENT_TYPES).or(z.string().min(2).max(80)),
  contactPerson: z.string().min(2).max(120),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal('')),
  eventDate: z.coerce.date(),
  eventEndDate: z.coerce.date().optional(),
  eventStartTime: z.string().max(20).optional(),
  eventEndTime: z.string().max(20).optional(),
  guestCount: z.coerce.number().int().min(1),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
  estimatedValue: z.coerce.number().min(0).optional(),
  packageName: z.string().max(160).optional(),
  packagePrice: z.coerce.number().min(0).optional(),
  requirements: requirementsSchema.optional(),
  status: z.enum(EVENT_LEAD_STATUSES).optional(),
  priority: z.enum(EVENT_PRIORITIES).optional(),
  source: z.enum(EVENT_LEAD_SOURCES).or(z.string().max(80)).optional(),
  tags: z.array(z.string()).optional(),
  followUpDate: z.coerce.date().optional(),
  followUpReminder: z.coerce.date().optional(),
  notes: z.string().max(4000).optional(),
  totalValue: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  advanceAmount: z.coerce.number().min(0).optional(),
  assignedTo: objectIdSchema.optional(),
  lostReason: z.string().max(1000).optional(),
};

export const createSchema = z.object(eventBody);
export const updateSchema = createSchema.partial();

export const assignSchema = z.object({
  assignedTo: objectIdSchema,
  notes: z.string().max(1000).optional(),
});

export const statusSchema = z.object({
  status: z.enum(EVENT_LEAD_STATUSES),
  notes: z.string().max(1000).optional(),
  lostReason: z.string().max(1000).optional(),
  followUpDate: z.coerce.date().optional(),
});

export const addNoteSchema = z.object({ note: z.string().min(1).max(2000) });

export const addProposalSchema = z.object({
  title: z.string().min(2).max(160),
  amount: z.coerce.number().min(0),
  sentAt: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional(),
  notes: z.string().max(2000).optional(),
});

export const addPackageSchema = z.object({
  name: z.string().min(2).max(160),
  price: z.coerce.number().min(0),
  description: z.string().max(2000).optional(),
  inclusions: z.string().max(2000).optional(),
  status: z.enum(['draft', 'offered', 'selected', 'rejected']).optional(),
});

export const addSiteVisitSchema = z.object({
  title: z.string().min(2).max(160),
  scheduledAt: z.coerce.date(),
  location: z.string().max(200).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
  notes: z.string().max(2000).optional(),
});

export const addDocumentSchema = z.object({
  name: z.string().min(1).max(160),
  url: z.string().url(),
  documentType: z.string().max(80).optional(),
});

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01),
  paymentType: z.enum(['advance', 'partial', 'final', 'refund']).optional(),
  notes: z.string().max(1000).optional(),
});

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
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type AddProposalInput = z.infer<typeof addProposalSchema>;
export type AddPackageInput = z.infer<typeof addPackageSchema>;
export type AddSiteVisitInput = z.infer<typeof addSiteVisitSchema>;
export type AddDocumentInput = z.infer<typeof addDocumentSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type ConvertToBookingInput = z.infer<typeof convertToBookingSchema>;
