import { Router } from 'express';
import {
  assignStaffToHotel,
  createStaff,
  deleteStaff,
  addStaffNote,
  getStaffById,
  getStaffStats,
  listStaff,
  recordStaffAttendance,
  updateStaff,
  updateStaffPermissions,
  updateStaffStatus,
} from './controller';
import { validate } from '../../validations/validate';
import {
  assignStaffSchema,
  addStaffNoteSchema,
  createStaffSchema,
  listStaffQuerySchema,
  recordAttendanceSchema,
  staffIdParamSchema,
  updateStaffPermissionsSchema,
  updateStaffSchema,
  updateStaffStatusSchema,
} from './validation';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { roleMiddleware, superAdminOnly } from '../../middlewares/roleMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';

const router = Router();

router.use(authMiddleware, hotelAccessMiddleware);

const staffViewRoles = [
  'super_admin',
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
  'housekeeping',
  'maintenance',
  'security',
] as const;

const staffManageRoles = ['super_admin', 'hotel_owner', 'hotel_manager'] as const;

router.get('/stats', roleMiddleware(...staffViewRoles), requireHotelId, getStaffStats);

router.get(
  '/',
  roleMiddleware(...staffViewRoles),
  validate(listStaffQuerySchema, 'query'),
  requireHotelId,
  listStaff
);

router.get(
  '/:id',
  roleMiddleware(...staffViewRoles),
  validate(staffIdParamSchema, 'params'),
  getStaffById
);

router.post(
  '/',
  roleMiddleware(...staffManageRoles),
  validate(createStaffSchema),
  requireHotelId,
  createStaff
);

router.patch(
  '/:id',
  validate(staffIdParamSchema, 'params'),
  roleMiddleware(...staffManageRoles),
  validate(updateStaffSchema),
  updateStaff
);

router.put(
  '/:id',
  validate(staffIdParamSchema, 'params'),
  roleMiddleware(...staffManageRoles),
  validate(updateStaffSchema),
  updateStaff
);

router.patch(
  '/:id/attendance',
  validate(staffIdParamSchema, 'params'),
  roleMiddleware(...staffManageRoles),
  validate(recordAttendanceSchema),
  recordStaffAttendance
);

router.patch(
  '/:id/notes',
  validate(staffIdParamSchema, 'params'),
  roleMiddleware(...staffManageRoles),
  validate(addStaffNoteSchema),
  addStaffNote
);

router.patch(
  '/:id/status',
  validate(staffIdParamSchema, 'params'),
  roleMiddleware(...staffManageRoles),
  validate(updateStaffStatusSchema),
  updateStaffStatus
);

router.patch(
  '/:id/permissions',
  validate(staffIdParamSchema, 'params'),
  roleMiddleware(...staffManageRoles),
  validate(updateStaffPermissionsSchema),
  updateStaffPermissions
);

router.patch(
  '/:id/assign',
  validate(staffIdParamSchema, 'params'),
  superAdminOnly,
  validate(assignStaffSchema),
  assignStaffToHotel
);

router.delete(
  '/:id',
  validate(staffIdParamSchema, 'params'),
  roleMiddleware(...staffManageRoles),
  deleteStaff
);

export default router;
