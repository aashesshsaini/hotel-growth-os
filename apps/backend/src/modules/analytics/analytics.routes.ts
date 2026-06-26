import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './analytics.controller';
import { analyticsQuerySchema, exportQuerySchema } from './analytics.validation';

const router = Router();
const analyticsViewRoles = [
  'super_admin',
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/overview', roleMiddleware(...analyticsViewRoles), validate(analyticsQuerySchema, 'query'), requireHotelId, controller.overview);
router.get('/export', roleMiddleware(...analyticsViewRoles), validate(exportQuerySchema, 'query'), requireHotelId, controller.exportData);

export default router;
