import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import {
  addLeadNote,
  assignLead,
  convertLeadToBooking,
  convertLeadToGuest,
  createLead,
  deleteLead,
  getLeadById,
  getLeadStats,
  listLeads,
  updateLead,
  updateLeadStatus,
} from './controller';
import {
  addLeadNoteSchema,
  assignLeadSchema,
  convertLeadToBookingSchema,
  createLeadSchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
  updateLeadStatusSchema,
} from './validation';

const router = Router();
const leadRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/stats', roleMiddleware(...leadRoles), requireHotelId, getLeadStats);
router.get('/', roleMiddleware(...leadRoles), validate(listLeadsQuerySchema, 'query'), requireHotelId, listLeads);
router.get('/:id', roleMiddleware(...leadRoles), validate(leadIdParamSchema, 'params'), getLeadById);
router.post('/', roleMiddleware(...leadRoles), validate(createLeadSchema), requireHotelId, createLead);
router.patch('/:id', validate(leadIdParamSchema, 'params'), roleMiddleware(...leadRoles), validate(updateLeadSchema), updateLead);
router.patch('/:id/assign', validate(leadIdParamSchema, 'params'), roleMiddleware(...leadRoles), validate(assignLeadSchema), assignLead);
router.patch('/:id/status', validate(leadIdParamSchema, 'params'), roleMiddleware(...leadRoles), validate(updateLeadStatusSchema), updateLeadStatus);
router.patch('/:id/notes', validate(leadIdParamSchema, 'params'), roleMiddleware(...leadRoles), validate(addLeadNoteSchema), addLeadNote);
router.post('/:id/convert/guest', validate(leadIdParamSchema, 'params'), roleMiddleware(...leadRoles), convertLeadToGuest);
router.post('/:id/convert/booking', validate(leadIdParamSchema, 'params'), roleMiddleware(...leadRoles), validate(convertLeadToBookingSchema), convertLeadToBooking);
router.delete('/:id', validate(leadIdParamSchema, 'params'), roleMiddleware(...leadRoles), deleteLead);

export default router;
