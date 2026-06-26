import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';
import { FOLLOW_UP_TYPES, TASK_PRIORITIES, TASK_STATUSES } from '../../models/Task';

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  followUpType: z.enum(FOLLOW_UP_TYPES).optional(),
  assignedTo: objectIdSchema.optional(),
  relatedType: z.string().optional(),
  relatedId: objectIdSchema.optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  today: z.enum(['true', 'false']).optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  overdue: z.enum(['true', 'false']).optional().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  sortBy: z.enum(['createdAt', 'dueDate', 'reminderAt', 'priority', 'status']).optional(),
});

const relatedSchema = z.object({
  type: z.enum(['Lead', 'Enquiry', 'Guest', 'Booking', 'Payment', 'Review', 'Other']),
  id: objectIdSchema,
  label: z.string().max(160).optional(),
}).optional();

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  title: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  assignedTo: objectIdSchema.optional(),
  dueDate: z.coerce.date().optional(),
  reminderAt: z.coerce.date().optional(),
  followUpType: z.enum(FOLLOW_UP_TYPES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  notes: z.string().max(3000).optional(),
  outcome: z.string().max(1000).optional(),
  relatedTo: relatedSchema,
});
export const updateSchema = createSchema.partial();
export const assignSchema = z.object({ assignedTo: objectIdSchema, notes: z.string().max(1000).optional() });
export const statusSchema = z.object({
  status: z.enum(TASK_STATUSES),
  notes: z.string().max(1000).optional(),
  outcome: z.string().max(1000).optional(),
});
export const rescheduleSchema = z.object({
  dueDate: z.coerce.date(),
  reminderAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});
export const noteSchema = z.object({ note: z.string().min(1).max(3000) });

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type AssignInput = z.infer<typeof assignSchema>;
export type StatusInput = z.infer<typeof statusSchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
