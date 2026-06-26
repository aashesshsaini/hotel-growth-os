import { z } from 'zod';
import {
  CORPORATE_COMPANY_TYPES,
  CORPORATE_LEAD_STATUSES,
  CORPORATE_PAYMENT_TERMS,
  CORPORATE_PRIORITIES,
} from '../../models/CorporateLead';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });

export const listQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  status: z.enum(CORPORATE_LEAD_STATUSES).optional(),
  companyType: z.enum(CORPORATE_COMPANY_TYPES).optional(),
  priority: z.enum(CORPORATE_PRIORITIES).optional(),
  assignedTo: objectIdSchema.optional(),
  followUpFrom: z.coerce.date().optional(),
  followUpTo: z.coerce.date().optional(),
});

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  designation: z.string().max(120).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  isPrimary: z.boolean().optional(),
});

const addressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
});

const corporateBody = {
  hotelId: objectIdSchema.optional(),
  companyName: z.string().min(2).max(160),
  companyType: z.enum(CORPORATE_COMPANY_TYPES).optional(),
  industry: z.string().max(120).optional(),
  website: z.string().max(200).optional(),
  contactPerson: z.string().min(2).max(120),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().or(z.literal('')),
  contacts: z.array(contactSchema).optional(),
  address: addressSchema.optional(),
  gstNumber: z.string().max(20).optional(),
  panNumber: z.string().max(20).optional(),
  requirements: z.string().max(2000).optional(),
  estimatedRooms: z.coerce.number().int().min(0).optional(),
  estimatedGuests: z.coerce.number().int().min(0).optional(),
  eventDates: z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).optional(),
  status: z.enum(CORPORATE_LEAD_STATUSES).optional(),
  priority: z.enum(CORPORATE_PRIORITIES).optional(),
  source: z.string().max(80).optional(),
  tags: z.array(z.string()).optional(),
  followUpDate: z.coerce.date().optional(),
  renewalReminderDate: z.coerce.date().optional(),
  notes: z.string().max(4000).optional(),
  totalValue: z.coerce.number().min(0).optional(),
  paidAmount: z.coerce.number().min(0).optional(),
  creditLimit: z.coerce.number().min(0).optional(),
  paymentTerms: z.enum(CORPORATE_PAYMENT_TERMS).optional(),
  corporateRate: z.coerce.number().min(0).optional(),
  specialPricing: z.string().max(1000).optional(),
  contractStartDate: z.coerce.date().optional(),
  contractEndDate: z.coerce.date().optional(),
  roomAllocation: z.coerce.number().int().min(0).optional(),
  assignedTo: objectIdSchema.optional(),
  lostReason: z.string().max(1000).optional(),
};

export const createSchema = z.object(corporateBody);
export const updateSchema = createSchema.partial();

export const assignSchema = z.object({
  assignedTo: objectIdSchema,
  notes: z.string().max(1000).optional(),
});

export const statusSchema = z.object({
  status: z.enum(CORPORATE_LEAD_STATUSES),
  notes: z.string().max(1000).optional(),
  lostReason: z.string().max(1000).optional(),
  followUpDate: z.coerce.date().optional(),
});

export const addNoteSchema = z.object({ note: z.string().min(1).max(2000) });

export const addMeetingSchema = z.object({
  title: z.string().min(2).max(160),
  scheduledAt: z.coerce.date(),
  location: z.string().max(200).optional(),
  attendees: z.string().max(500).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
  notes: z.string().max(2000).optional(),
});

export const addProposalSchema = z.object({
  title: z.string().min(2).max(160),
  amount: z.coerce.number().min(0),
  sentAt: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional(),
  notes: z.string().max(2000).optional(),
});

export const addDocumentSchema = z.object({
  name: z.string().min(1).max(160),
  url: z.string().url(),
  documentType: z.string().max(80).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type AssignInput = z.infer<typeof assignSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
export type AddMeetingInput = z.infer<typeof addMeetingSchema>;
export type AddProposalInput = z.infer<typeof addProposalSchema>;
export type AddDocumentInput = z.infer<typeof addDocumentSchema>;
