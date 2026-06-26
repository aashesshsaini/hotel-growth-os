import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';
import { HOUSEKEEPING_TASK_STATUSES, HOUSEKEEPING_TASK_TYPES } from '../../models/HousekeepingTask';

const optionalBoolean = z
  .union([z.boolean(), z.literal('true'), z.literal('false')])
  .transform((val) => val === true || val === 'true')
  .optional();

const checklistSchema = z.object({
  item: z.string().min(1).max(200),
  isDone: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const listHousekeepingTasksQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  search: z.string().optional(),
  roomId: objectIdSchema.optional(),
  assignedTo: objectIdSchema.optional(),
  taskType: z.enum(HOUSEKEEPING_TASK_TYPES).optional(),
  status: z.enum(HOUSEKEEPING_TASK_STATUSES).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  scheduledFrom: z.coerce.date().optional(),
  scheduledTo: z.coerce.date().optional(),
  includeCompleted: optionalBoolean,
  sortBy: z.enum(['scheduledFor', 'createdAt', 'priority', 'status', 'taskNumber']).optional(),
});

export const housekeepingTaskIdParamSchema = z.object({
  id: objectIdSchema,
});

export const dailyHousekeepingScheduleQuerySchema = z.object({
  hotelId: objectIdSchema.optional(),
  date: z.coerce.date().optional(),
});

const taskBaseFields = {
  hotelId: objectIdSchema.optional(),
  roomId: objectIdSchema,
  assignedTo: objectIdSchema.optional(),
  taskType: z.enum(HOUSEKEEPING_TASK_TYPES),
  status: z.enum(HOUSEKEEPING_TASK_STATUSES).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  scheduledFor: z.coerce.date().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  actualMinutes: z.number().int().min(0).optional(),
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  checklist: z.array(checklistSchema).optional(),
  rejectionReason: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
};

const createHousekeepingTaskObjectSchema = z.object(taskBaseFields);

export const createHousekeepingTaskSchema = createHousekeepingTaskObjectSchema;

export const updateHousekeepingTaskSchema = createHousekeepingTaskObjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

export const assignHousekeepingTaskSchema = z.object({
  assignedTo: objectIdSchema,
  notes: z.string().max(1000).optional(),
});

export const updateHousekeepingTaskStatusSchema = z.object({
  status: z.enum(HOUSEKEEPING_TASK_STATUSES),
  notes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(1000).optional(),
  checklist: z.array(checklistSchema).optional(),
  actualMinutes: z.number().int().min(0).optional(),
});

export type ListHousekeepingTasksQuery = z.infer<typeof listHousekeepingTasksQuerySchema>;
export type DailyHousekeepingScheduleQuery = z.infer<typeof dailyHousekeepingScheduleQuerySchema>;
export type CreateHousekeepingTaskInput = z.infer<typeof createHousekeepingTaskSchema>;
export type UpdateHousekeepingTaskInput = z.infer<typeof updateHousekeepingTaskSchema>;
export type AssignHousekeepingTaskInput = z.infer<typeof assignHousekeepingTaskSchema>;
export type UpdateHousekeepingTaskStatusInput = z.infer<typeof updateHousekeepingTaskStatusSchema>;
