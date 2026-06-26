import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './reviews.controller';
import {
  addReviewNoteSchema,
  createSchema,
  escalateReviewSchema,
  idParamSchema,
  listQuerySchema,
  publicSubmitSchema,
  replyReviewSchema,
  requestReviewSchema,
  resolveReviewSchema,
  tokenParamSchema,
  updateSchema,
} from './reviews.validation';

const router = Router();
const reviewViewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;
const reviewManageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff'] as const;

router.get('/public/:token', validate(tokenParamSchema, 'params'), controller.getPublicRequest);
router.post('/public/:token/submit', validate(tokenParamSchema, 'params'), validate(publicSubmitSchema), controller.submitPublic);

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/stats', roleMiddleware(...reviewViewRoles), requireHotelId, controller.stats);
router.get('/', roleMiddleware(...reviewViewRoles), validate(listQuerySchema, 'query'), requireHotelId, controller.list);
router.post('/request', roleMiddleware(...reviewManageRoles), validate(requestReviewSchema), requireHotelId, controller.requestReview);
router.get('/:id', roleMiddleware(...reviewViewRoles), validate(idParamSchema, 'params'), controller.getById);
router.post('/', roleMiddleware(...reviewManageRoles), validate(createSchema), requireHotelId, controller.create);
router.patch('/:id', validate(idParamSchema, 'params'), roleMiddleware(...reviewManageRoles), validate(updateSchema), controller.update);
router.put('/:id', validate(idParamSchema, 'params'), roleMiddleware(...reviewManageRoles), validate(updateSchema), controller.update);
router.delete('/:id', validate(idParamSchema, 'params'), roleMiddleware(...reviewManageRoles), controller.remove);
router.post('/:id/send-request', validate(idParamSchema, 'params'), roleMiddleware(...reviewManageRoles), controller.sendRequest);
router.post('/:id/reply', validate(idParamSchema, 'params'), roleMiddleware(...reviewManageRoles), validate(replyReviewSchema), controller.reply);
router.post('/:id/escalate', validate(idParamSchema, 'params'), roleMiddleware(...reviewManageRoles), validate(escalateReviewSchema), controller.escalate);
router.post('/:id/resolve', validate(idParamSchema, 'params'), roleMiddleware(...reviewManageRoles), validate(resolveReviewSchema), controller.resolveReview);
router.post('/:id/notify-manager', validate(idParamSchema, 'params'), roleMiddleware(...reviewManageRoles), controller.notifyManager);
router.post('/:id/send-google-link', validate(idParamSchema, 'params'), roleMiddleware(...reviewManageRoles), controller.sendGoogleLink);
router.patch('/:id/notes', validate(idParamSchema, 'params'), roleMiddleware(...reviewManageRoles), validate(addReviewNoteSchema), controller.addNote);

export default router;
