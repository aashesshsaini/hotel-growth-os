import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../validations/common';
import {
  MAINTENANCE_ISSUE_PRIORITIES,
  MAINTENANCE_ISSUE_STATUSES,
  MAINTENANCE_ISSUE_TYPES,
} from '../../models/MaintenanceIssue';

const optionalBoolean = z
  .union([z.boolean(), z.literal('true'), z.literal('false')])
  .transform((val) => val === true || val === 'true')
  .optional();

const imageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  caption: z.string().max(200).optional(),
});

export const listMaintenanceIssuesQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  search: z.string().optional(),
  roomId: objectIdSchema.optional(),
  assignedTo: objectIdSchema.optional(),
  sourceHousekeepingTaskId: objectIdSchema.optional(),
  issueType: z.enum(MAINTENANCE_ISSUE_TYPES).optional(),
  status: z.enum(MAINTENANCE_ISSUE_STATUSES).optional(),
  priority: z.enum(MAINTENANCE_ISSUE_PRIORITIES).optional(),
  reportedFrom: z.coerce.date().optional(),
  reportedTo: z.coerce.date().optional(),
  includeClosed: optionalBoolean,
  sortBy: z.enum(['reportedAt', 'createdAt', 'priority', 'status', 'issueNumber', 'actualCost']).optional(),
});

export const maintenanceIssueIdParamSchema = z.object({
  id: objectIdSchema,
});

export const roomMaintenanceHistoryQuerySchema = z.object({
  hotelId: objectIdSchema.optional(),
  roomId: objectIdSchema,
});

const issueBaseFields = {
  hotelId: objectIdSchema.optional(),
  roomId: objectIdSchema,
  assignedTo: objectIdSchema.optional(),
  sourceHousekeepingTaskId: objectIdSchema.optional(),
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  issueType: z.enum(MAINTENANCE_ISSUE_TYPES),
  status: z.enum(MAINTENANCE_ISSUE_STATUSES).optional(),
  priority: z.enum(MAINTENANCE_ISSUE_PRIORITIES).optional(),
  scheduledFor: z.coerce.date().optional(),
  estimatedCost: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  vendorName: z.string().max(120).optional(),
  vendorPhone: z.string().max(30).optional(),
  resolutionNotes: z.string().max(2000).optional(),
  holdReason: z.string().max(1000).optional(),
  images: z.array(imageSchema).optional(),
};

const createMaintenanceIssueObjectSchema = z.object(issueBaseFields);

export const createMaintenanceIssueSchema = createMaintenanceIssueObjectSchema;
export const updateMaintenanceIssueSchema = createMaintenanceIssueObjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

export const assignMaintenanceIssueSchema = z.object({
  assignedTo: objectIdSchema,
  notes: z.string().max(1000).optional(),
});

export const updateMaintenanceIssueStatusSchema = z.object({
  status: z.enum(MAINTENANCE_ISSUE_STATUSES),
  notes: z.string().max(1000).optional(),
  resolutionNotes: z.string().max(2000).optional(),
  holdReason: z.string().max(1000).optional(),
  actualCost: z.number().min(0).optional(),
});

export type ListMaintenanceIssuesQuery = z.infer<typeof listMaintenanceIssuesQuerySchema>;
export type RoomMaintenanceHistoryQuery = z.infer<typeof roomMaintenanceHistoryQuerySchema>;
export type CreateMaintenanceIssueInput = z.infer<typeof createMaintenanceIssueSchema>;
export type UpdateMaintenanceIssueInput = z.infer<typeof updateMaintenanceIssueSchema>;
export type AssignMaintenanceIssueInput = z.infer<typeof assignMaintenanceIssueSchema>;
export type UpdateMaintenanceIssueStatusInput = z.infer<typeof updateMaintenanceIssueStatusSchema>;
