import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './payments.controller';
import {
  addPaymentNoteSchema,
  bookingIdParamSchema,
  createSchema,
  idParamSchema,
  listQuerySchema,
  refundSchema,
  updateSchema,
  updateStatusSchema,
} from './payments.validation';

const router = Router();
const paymentViewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff', 'accountant'] as const;
const paymentManageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'accountant'] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/stats', roleMiddleware(...paymentViewRoles), requireHotelId, controller.stats);
router.get('/booking/:bookingId/summary', roleMiddleware(...paymentViewRoles), validate(bookingIdParamSchema, 'params'), controller.getBookingSummary);
router.get('/', roleMiddleware(...paymentViewRoles), validate(listQuerySchema, 'query'), requireHotelId, controller.list);
router.get('/:id', roleMiddleware(...paymentViewRoles), validate(idParamSchema, 'params'), controller.getById);
router.post('/', roleMiddleware(...paymentManageRoles), validate(createSchema), requireHotelId, controller.create);
router.patch('/:id', validate(idParamSchema, 'params'), roleMiddleware(...paymentManageRoles), validate(updateSchema), controller.update);
router.put('/:id', validate(idParamSchema, 'params'), roleMiddleware(...paymentManageRoles), validate(updateSchema), controller.update);
router.delete('/:id', validate(idParamSchema, 'params'), roleMiddleware(...paymentManageRoles), controller.remove);
router.post('/:id/refund', validate(idParamSchema, 'params'), roleMiddleware(...paymentManageRoles), validate(refundSchema), controller.refund);
router.patch('/:id/status', validate(idParamSchema, 'params'), roleMiddleware(...paymentManageRoles), validate(updateStatusSchema), controller.updateStatus);
router.patch('/:id/notes', validate(idParamSchema, 'params'), roleMiddleware(...paymentManageRoles), validate(addPaymentNoteSchema), controller.addNote);

export default router;
