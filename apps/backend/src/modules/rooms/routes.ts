import { Router } from 'express';
import {
  blockRoom,
  bulkCreateRooms,
  bulkUpdateRoomStatus,
  createRoom,
  deleteRoom,
  getAvailableRooms,
  getRoomById,
  getRoomStats,
  listRooms,
  markRoomMaintenance,
  unblockRoom,
  updateHousekeepingStatus,
  updateRoom,
  updateRoomStatus,
} from './controller';
import { validate } from '../../validations/validate';
import {
  availableRoomsQuerySchema,
  blockRoomSchema,
  bulkCreateRoomsSchema,
  bulkUpdateRoomStatusSchema,
  createRoomSchema,
  listRoomsQuerySchema,
  markRoomMaintenanceSchema,
  roomIdParamSchema,
  updateHousekeepingStatusSchema,
  updateRoomSchema,
  updateRoomStatusSchema,
} from './validation';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import {
  HOUSEKEEPING_ROLES,
  MAINTENANCE_ROLES,
  ROOM_MANAGEMENT_ROLES,
  ROOM_STATUS_UPDATE_ROLES,
  ROOM_VIEW_ROLES,
} from './room.constants';

const router = Router();

router.use(authMiddleware, hotelAccessMiddleware);

router.get(
  '/stats',
  roleMiddleware(...ROOM_VIEW_ROLES, 'super_admin'),
  requireHotelId,
  getRoomStats
);

router.get(
  '/available',
  roleMiddleware(...ROOM_VIEW_ROLES, 'super_admin'),
  validate(availableRoomsQuerySchema, 'query'),
  requireHotelId,
  getAvailableRooms
);

router.get(
  '/',
  roleMiddleware(...ROOM_VIEW_ROLES, 'super_admin'),
  validate(listRoomsQuerySchema, 'query'),
  requireHotelId,
  listRooms
);

router.get(
  '/:id',
  roleMiddleware(...ROOM_VIEW_ROLES, 'super_admin'),
  validate(roomIdParamSchema, 'params'),
  getRoomById
);

router.post(
  '/bulk',
  roleMiddleware(...ROOM_MANAGEMENT_ROLES, 'super_admin'),
  validate(bulkCreateRoomsSchema),
  requireHotelId,
  bulkCreateRooms
);

router.post(
  '/',
  roleMiddleware(...ROOM_MANAGEMENT_ROLES, 'super_admin'),
  validate(createRoomSchema),
  requireHotelId,
  createRoom
);

router.patch(
  '/bulk/status',
  roleMiddleware(...ROOM_MANAGEMENT_ROLES, 'super_admin'),
  validate(bulkUpdateRoomStatusSchema),
  bulkUpdateRoomStatus
);

router.patch(
  '/:id',
  validate(roomIdParamSchema, 'params'),
  roleMiddleware(...ROOM_MANAGEMENT_ROLES, 'super_admin'),
  validate(updateRoomSchema),
  updateRoom
);

router.put(
  '/:id',
  validate(roomIdParamSchema, 'params'),
  roleMiddleware(...ROOM_MANAGEMENT_ROLES, 'super_admin'),
  validate(updateRoomSchema),
  updateRoom
);

router.patch(
  '/:id/status',
  validate(roomIdParamSchema, 'params'),
  roleMiddleware(...ROOM_STATUS_UPDATE_ROLES, 'super_admin'),
  validate(updateRoomStatusSchema),
  updateRoomStatus
);

router.patch(
  '/:id/block',
  validate(roomIdParamSchema, 'params'),
  roleMiddleware(...ROOM_MANAGEMENT_ROLES, 'super_admin'),
  validate(blockRoomSchema),
  blockRoom
);

router.patch(
  '/:id/unblock',
  validate(roomIdParamSchema, 'params'),
  roleMiddleware(...ROOM_MANAGEMENT_ROLES, 'super_admin'),
  unblockRoom
);

router.patch(
  '/:id/maintenance',
  validate(roomIdParamSchema, 'params'),
  roleMiddleware(...MAINTENANCE_ROLES, 'super_admin'),
  validate(markRoomMaintenanceSchema),
  markRoomMaintenance
);

router.patch(
  '/:id/housekeeping',
  validate(roomIdParamSchema, 'params'),
  roleMiddleware(...HOUSEKEEPING_ROLES, 'super_admin'),
  validate(updateHousekeepingStatusSchema),
  updateHousekeepingStatus
);

router.delete(
  '/:id',
  validate(roomIdParamSchema, 'params'),
  roleMiddleware(...ROOM_MANAGEMENT_ROLES, 'super_admin'),
  deleteRoom
);

export default router;
