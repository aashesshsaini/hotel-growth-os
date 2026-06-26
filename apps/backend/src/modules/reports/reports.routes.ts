import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './reports.controller';
import { categoryParamSchema, exportQuerySchema, reportQuerySchema } from './reports.validation';

const router = Router();
const reportViewRoles = [
  'super_admin',
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/', roleMiddleware(...reportViewRoles), controller.legacyReports);
router.get('/summary', roleMiddleware(...reportViewRoles), validate(reportQuerySchema, 'query'), requireHotelId, controller.summary);
router.get('/categories', roleMiddleware(...reportViewRoles), controller.categories);
router.get('/:category/export', roleMiddleware(...reportViewRoles), validate(categoryParamSchema, 'params'), validate(exportQuerySchema, 'query'), requireHotelId, controller.exportReport);
router.get('/:category', roleMiddleware(...reportViewRoles), validate(categoryParamSchema, 'params'), validate(reportQuerySchema, 'query'), requireHotelId, controller.categoryReport);

export default router;
