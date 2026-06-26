import { z } from 'zod';
import {
  STAFF_ROLES,
  STAFF_STATUSES,
  SHIFT_TYPES,
  GENDERS,
  STAFF_PERMISSIONS,
} from '@hotel-growth-os/shared';
import { paginationSchema, objectIdSchema } from '../../validations/common';
import { STAFF_ATTENDANCE_STATUSES } from '../../models/StaffAttendance';

const phoneSchema = z
  .string()
  .min(10, 'Phone must be at least 10 digits')
  .max(15, 'Phone must be at most 15 digits')
  .regex(/^[+]?[\d\s-]+$/, 'Invalid phone number');

export const listStaffQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  role: z.enum(STAFF_ROLES).optional(),
  department: z.string().optional(),
  status: z.enum(STAFF_STATUSES).optional(),
  shiftType: z.enum(SHIFT_TYPES).optional(),
  designation: z.string().optional(),
  skill: z.string().optional(),
  joiningDateFrom: z.coerce.date().optional(),
  joiningDateTo: z.coerce.date().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const staffIdParamSchema = z.object({
  id: objectIdSchema,
});

const staffFieldsSchema = z.object({
  employeeId: z.string().min(1).max(30).optional(),
  fullName: z.string().min(2, 'Full name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: phoneSchema,
  alternatePhone: phoneSchema.optional().or(z.literal('')),
  role: z.enum(STAFF_ROLES),
  department: z.string().max(100).optional(),
  designation: z.string().max(100).optional(),
  profileImage: z.string().url().optional().or(z.literal('')),
  gender: z.enum(GENDERS).optional(),
  dateOfBirth: z.coerce.date().optional(),
  joiningDate: z.coerce.date().optional(),
  salary: z.number().min(0).optional(),
  experienceYears: z.number().min(0).optional(),
  skills: z.array(z.string().min(1).max(80)).optional(),
  shiftType: z.enum(SHIFT_TYPES).optional(),
  shiftStartTime: z.string().max(10).optional(),
  shiftEndTime: z.string().max(10).optional(),
  address: z.string().max(500).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: phoneSchema.optional().or(z.literal('')),
  documents: z.array(z.object({
    documentType: z.string().min(1).max(80),
    name: z.string().max(120).optional(),
    url: z.string().url(),
    publicId: z.string().optional(),
  })).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(STAFF_STATUSES).optional(),
  hotelId: objectIdSchema.optional(),
});

export const createStaffSchema = staffFieldsSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  permissions: z.array(z.enum(STAFF_PERMISSIONS)).optional(),
});

export const updateStaffSchema = staffFieldsSchema
  .partial()
  .extend({
    permissions: z.array(z.enum(STAFF_PERMISSIONS)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

export const updateStaffStatusSchema = z.object({
  status: z.enum(STAFF_STATUSES),
  reason: z.string().max(500).optional(),
});

export const updateStaffPermissionsSchema = z.object({
  permissions: z.array(z.enum(STAFF_PERMISSIONS)),
});

export const assignStaffSchema = z.object({
  hotelId: objectIdSchema,
});

export const recordAttendanceSchema = z.object({
  date: z.coerce.date().optional(),
  status: z.enum(STAFF_ATTENDANCE_STATUSES),
  checkInAt: z.coerce.date().optional(),
  checkOutAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

export const addStaffNoteSchema = z.object({
  note: z.string().min(1).max(2000),
});

export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type UpdateStaffStatusInput = z.infer<typeof updateStaffStatusSchema>;
export type UpdateStaffPermissionsInput = z.infer<typeof updateStaffPermissionsSchema>;
export type AssignStaffInput = z.infer<typeof assignStaffSchema>;
export type RecordAttendanceInput = z.infer<typeof recordAttendanceSchema>;
export type AddStaffNoteInput = z.infer<typeof addStaffNoteSchema>;
