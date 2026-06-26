import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './eventLeads.controller';
import {
  addDocumentSchema,
  addNoteSchema,
  addPackageSchema,
  addProposalSchema,
  addSiteVisitSchema,
  assignSchema,
  convertToBookingSchema,
  createSchema,
  idParamSchema,
  listQuerySchema,
  recordPaymentSchema,
  statusSchema,
  updateSchema,
} from './eventLeads.validation';

const router = Router();
const viewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;
const manageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'] as const;

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
router.post('/:id/proposals', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(addProposalSchema), controller.addProposal);
router.post('/:id/packages', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(addPackageSchema), controller.addPackage);
router.post('/:id/site-visits', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(addSiteVisitSchema), controller.addSiteVisit);
router.post('/:id/documents', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(addDocumentSchema), controller.addDocument);
router.post('/:id/payments', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(recordPaymentSchema), controller.recordPayment);
router.post('/:id/convert/booking', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), validate(convertToBookingSchema), controller.convertToBooking);
router.delete('/:id', validate(idParamSchema, 'params'), roleMiddleware(...manageRoles), controller.remove);

export default router;
