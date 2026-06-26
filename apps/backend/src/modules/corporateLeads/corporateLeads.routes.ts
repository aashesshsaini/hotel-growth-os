import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './corporateLeads.controller';
import {
  addDocumentSchema,
  addMeetingSchema,
  addNoteSchema,
  addProposalSchema,
  assignSchema,
  createSchema,
  idParamSchema,
  listQuerySchema,
  statusSchema,
  updateSchema,
} from './corporateLeads.validation';

const router = Router();
const viewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;
const manageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'] as const;

const recordPaymentSchema = z.object({
  amount: z.coerce.number().min(0.01),
  notes: z.string().max(1000).optional(),
});

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/stats', roleMiddleware(...viewRoles), requireHotelId, controller.stats);
router.get('/pipeline', roleMiddleware(...viewRoles), requireHotelId, controller.pipeline);
router.get('/', roleMiddleware(...viewRoles), validate(listQuerySchema, 'query'), requireHotelId, controller.list);
router.get('/:id', roleMiddleware(...viewRoles), validate(idParamSchema, 'params'), controller.getById);
router.post('/', roleMiddleware(...manageRoles), validate(createSchema), requireHotelId, controller.create);
router.patch('/:id', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(updateSchema), controller.update);
router.put('/:id', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(updateSchema), controller.update);
router.patch('/:id/assign', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(assignSchema), controller.assign);
router.patch('/:id/status', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(statusSchema), controller.updateStatus);
router.patch('/:id/notes', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(addNoteSchema), controller.addNote);
router.post('/:id/meetings', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(addMeetingSchema), controller.addMeeting);
router.post('/:id/proposals', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(addProposalSchema), controller.addProposal);
router.post('/:id/documents', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(addDocumentSchema), controller.addDocument);
router.post('/:id/payments', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(recordPaymentSchema), controller.recordPayment);
router.delete('/:id', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), controller.remove);

export default router;
