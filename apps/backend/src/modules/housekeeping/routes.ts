import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import {
  assignHousekeepingTask,
  createHousekeepingTask,
  deleteHousekeepingTask,
  getDailyHousekeepingSchedule,
  getHousekeepingStats,
  getHousekeepingTaskById,
  listHousekeepingTasks,
  updateHousekeepingTask,
  updateHousekeepingTaskStatus,
} from './controller';
import {
  assignHousekeepingTaskSchema,
  createHousekeepingTaskSchema,
  dailyHousekeepingScheduleQuerySchema,
  housekeepingTaskIdParamSchema,
  listHousekeepingTasksQuerySchema,
  updateHousekeepingTaskSchema,
  updateHousekeepingTaskStatusSchema,
} from './validation';

const router = Router();

const viewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'housekeeping'] as const;
const manageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'housekeeping'] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/stats', roleMiddleware(...viewRoles), requireHotelId, getHousekeepingStats);
router.get(
  '/schedule',
  roleMiddleware(...viewRoles),
  validate(dailyHousekeepingScheduleQuerySchema, 'query'),
  requireHotelId,
  getDailyHousekeepingSchedule
);
router.get(
  '/',
  roleMiddleware(...viewRoles),
  validate(listHousekeepingTasksQuerySchema, 'query'),
  requireHotelId,
  listHousekeepingTasks
);
router.get('/:id', roleMiddleware(...viewRoles), validate(housekeepingTaskIdParamSchema, 'params'), getHousekeepingTaskById);
router.post('/', roleMiddleware(...manageRoles), validate(createHousekeepingTaskSchema), requireHotelId, createHousekeepingTask);
router.patch('/:id', validate(housekeepingTaskIdParamSchema, 'params'), roleMiddleware(...manageRoles), validate(updateHousekeepingTaskSchema), updateHousekeepingTask);
router.patch('/:id/assign', validate(housekeepingTaskIdParamSchema, 'params'), roleMiddleware(...manageRoles), validate(assignHousekeepingTaskSchema), assignHousekeepingTask);
router.patch('/:id/status', validate(housekeepingTaskIdParamSchema, 'params'), roleMiddleware(...manageRoles), validate(updateHousekeepingTaskStatusSchema), updateHousekeepingTaskStatus);
router.delete('/:id', validate(housekeepingTaskIdParamSchema, 'params'), roleMiddleware(...manageRoles), deleteHousekeepingTask);

export default router;
