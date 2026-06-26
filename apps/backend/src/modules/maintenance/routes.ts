import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import {
  assignMaintenanceIssue,
  createMaintenanceIssue,
  deleteMaintenanceIssue,
  getMaintenanceIssueById,
  getMaintenanceStats,
  getRoomMaintenanceHistory,
  listMaintenanceIssues,
  updateMaintenanceIssue,
  updateMaintenanceIssueStatus,
} from './controller';
import {
  assignMaintenanceIssueSchema,
  createMaintenanceIssueSchema,
  listMaintenanceIssuesQuerySchema,
  maintenanceIssueIdParamSchema,
  roomMaintenanceHistoryQuerySchema,
  updateMaintenanceIssueSchema,
  updateMaintenanceIssueStatusSchema,
} from './validation';

const router = Router();

const viewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'maintenance', 'housekeeping'] as const;
const manageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'maintenance'] as const;
const reportRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'maintenance', 'housekeeping'] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/stats', roleMiddleware(...viewRoles), requireHotelId, getMaintenanceStats);
router.get(
  '/room-history',
  roleMiddleware(...viewRoles),
  validate(roomMaintenanceHistoryQuerySchema, 'query'),
  requireHotelId,
  getRoomMaintenanceHistory
);
router.get(
  '/',
  roleMiddleware(...viewRoles),
  validate(listMaintenanceIssuesQuerySchema, 'query'),
  requireHotelId,
  listMaintenanceIssues
);
router.get('/:id', roleMiddleware(...viewRoles), validate(maintenanceIssueIdParamSchema, 'params'), getMaintenanceIssueById);
router.post('/', roleMiddleware(...reportRoles), validate(createMaintenanceIssueSchema), requireHotelId, createMaintenanceIssue);
router.patch('/:id', validate(maintenanceIssueIdParamSchema, 'params'), roleMiddleware(...manageRoles), validate(updateMaintenanceIssueSchema), updateMaintenanceIssue);
router.patch('/:id/assign', validate(maintenanceIssueIdParamSchema, 'params'), roleMiddleware(...manageRoles), validate(assignMaintenanceIssueSchema), assignMaintenanceIssue);
router.patch('/:id/status', validate(maintenanceIssueIdParamSchema, 'params'), roleMiddleware(...manageRoles), validate(updateMaintenanceIssueStatusSchema), updateMaintenanceIssueStatus);
router.delete('/:id', validate(maintenanceIssueIdParamSchema, 'params'), roleMiddleware(...manageRoles), deleteMaintenanceIssue);

export default router;
