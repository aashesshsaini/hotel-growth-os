import { z } from 'zod';
import {
  HOUSEKEEPING_STATUSES,
  MAINTENANCE_STATUSES,
  ROOM_STATUSES,
} from '@hotel-growth-os/shared';
import { paginationSchema, objectIdSchema } from '../../validations/common';

const optionalBoolean = z
  .union([z.boolean(), z.literal('true'), z.literal('false')])
  .transform((val) => val === true || val === 'true')
  .optional();

export const listRoomsQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  roomTypeId: objectIdSchema.optional(),
  status: z.enum(ROOM_STATUSES).optional(),
  housekeepingStatus: z.enum(HOUSEKEEPING_STATUSES).optional(),
  maintenanceStatus: z.enum(MAINTENANCE_STATUSES).optional(),
  floor: z.coerce.number().int().optional(),
  floorNumber: z.coerce.number().int().optional(),
  buildingName: z.string().optional(),
  wing: z.string().optional(),
  isBookable: optionalBoolean,
  isBlocked: optionalBoolean,
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  sortBy: z
    .enum(['roomNumber', 'floor', 'status', 'createdAt', 'housekeepingStatus'])
    .optional(),
});

export const roomIdParamSchema = z.object({
  id: objectIdSchema,
});

export const availableRoomsQuerySchema = z.object({
  hotelId: objectIdSchema.optional(),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  roomTypeId: objectIdSchema.optional(),
  numberOfGuests: z.coerce.number().int().min(1).optional(),
  numberOfRooms: z.coerce.number().int().min(1).optional(),
});

const roomBaseFields = {
  roomTypeId: objectIdSchema,
  roomNumber: z.string().min(1).max(30),
  floorNumber: z.number().int().optional(),
  floor: z.number().int().optional(),
  buildingName: z.string().max(100).optional(),
  wing: z.string().max(50).optional(),
  roomName: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(ROOM_STATUSES).optional(),
  housekeepingStatus: z.enum(HOUSEKEEPING_STATUSES).optional(),
  maintenanceStatus: z.enum(MAINTENANCE_STATUSES).optional(),
  maxGuestsOverride: z.number().int().min(1).optional(),
  priceOverride: z.number().min(0).optional(),
  isPriceOverridden: z.boolean().optional(),
  isBookable: z.boolean().optional(),
  isVisibleToStaff: z.boolean().optional(),
  amenitiesOverride: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
};

export const createRoomSchema = z.object({
  hotelId: objectIdSchema.optional(),
  ...roomBaseFields,
  status: z.enum(ROOM_STATUSES).optional().default('available'),
});

export const bulkCreateRoomsSchema = z.object({
  hotelId: objectIdSchema.optional(),
  roomTypeId: objectIdSchema,
  startRoomNumber: z.coerce.number().int().min(1),
  endRoomNumber: z.coerce.number().int().min(1),
  prefix: z.string().max(10).optional().default(''),
  floorNumber: z.number().int().optional(),
  buildingName: z.string().max(100).optional(),
  wing: z.string().max(50).optional(),
}).refine((data) => data.endRoomNumber >= data.startRoomNumber, {
  message: 'End room number must be greater than or equal to start room number',
});

export const updateRoomSchema = createRoomSchema.partial().omit({ hotelId: true });

export const updateRoomStatusSchema = z.object({
  status: z.enum(ROOM_STATUSES),
  notes: z.string().max(1000).optional(),
  allowManualOccupied: z.boolean().optional(),
});

export const bulkUpdateRoomStatusSchema = z.object({
  roomIds: z.array(objectIdSchema).min(1),
  status: z.enum(ROOM_STATUSES),
  notes: z.string().max(1000).optional(),
});

export const blockRoomSchema = z
  .object({
    blockedReason: z.string().min(1).max(500),
    blockedFrom: z.coerce.date().optional(),
    blockedTo: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.blockedFrom && data.blockedTo) {
        return data.blockedTo > data.blockedFrom;
      }
      return true;
    },
    { message: 'blockedTo must be after blockedFrom' }
  );

export const markRoomMaintenanceSchema = z.object({
  maintenanceStatus: z.enum(MAINTENANCE_STATUSES),
  notes: z.string().max(1000).optional(),
});

export const updateHousekeepingStatusSchema = z.object({
  housekeepingStatus: z.enum(HOUSEKEEPING_STATUSES),
  notes: z.string().max(1000).optional(),
});

export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type BulkCreateRoomsInput = z.infer<typeof bulkCreateRoomsSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type UpdateRoomStatusInput = z.infer<typeof updateRoomStatusSchema>;
export type BulkUpdateRoomStatusInput = z.infer<typeof bulkUpdateRoomStatusSchema>;
export type AvailableRoomsQuery = z.infer<typeof availableRoomsQuerySchema>;
export type BlockRoomInput = z.infer<typeof blockRoomSchema>;
export type MarkRoomMaintenanceInput = z.infer<typeof markRoomMaintenanceSchema>;
export type UpdateHousekeepingStatusInput = z.infer<typeof updateHousekeepingStatusSchema>;
