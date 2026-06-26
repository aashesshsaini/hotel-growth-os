import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware } from '../../middlewares/hotelAccessMiddleware';
import { validate } from '../../validations/validate';
import {
  assignRoomSchema,
  cancelSchema,
  createSchema,
  idParamSchema,
  listQuerySchema,
  notesSchema,
  paymentSchema,
  statusSchema,
  updateSchema,
} from './bookings.validation';
import * as controller from './bookings.controller';

const router = Router();
router.use(authMiddleware, hotelAccessMiddleware);
router.get('/stats', validate(listQuerySchema, 'query'), controller.stats);
router.get('/upcoming/check-ins', validate(listQuerySchema, 'query'), controller.upcomingCheckIns);
router.get('/upcoming/check-outs', validate(listQuerySchema, 'query'), controller.upcomingCheckOuts);
router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.get('/:id', validate(idParamSchema, 'params'), controller.getById);
router.post('/', validate(createSchema), controller.create);
router.patch('/:id', validate(idParamSchema, 'params'), validate(updateSchema), controller.update);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateSchema), controller.update);
router.patch('/:id/status', validate(idParamSchema, 'params'), validate(statusSchema), controller.updateStatus);
router.patch('/:id/cancel', validate(idParamSchema, 'params'), validate(cancelSchema), controller.cancel);
router.patch('/:id/check-in', validate(idParamSchema, 'params'), controller.checkIn);
router.patch('/:id/check-out', validate(idParamSchema, 'params'), controller.checkOut);
router.patch('/:id/assign-room', validate(idParamSchema, 'params'), validate(assignRoomSchema), controller.assignRoom);
router.patch('/:id/notes', validate(idParamSchema, 'params'), validate(notesSchema), controller.updateNotes);
router.post('/:id/payments', validate(idParamSchema, 'params'), validate(paymentSchema), controller.recordPayment);
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove);
export default router;
