import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './campaigns.controller';
import {
  addCampaignNoteSchema,
  campaignIdParamSchema,
  createCampaignSchema,
  launchCampaignSchema,
  listCampaignLogsQuerySchema,
  listCampaignsQuerySchema,
  updateCampaignSchema,
  updateCampaignStatusSchema,
} from './campaigns.validation';

const router = Router();
const campaignViewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;
const campaignManageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/stats', roleMiddleware(...campaignViewRoles), requireHotelId, controller.stats);
router.get('/', roleMiddleware(...campaignViewRoles), validate(listCampaignsQuerySchema, 'query'), requireHotelId, controller.list);
router.get('/:id/audience-preview', roleMiddleware(...campaignViewRoles), validate(campaignIdParamSchema, 'params'), controller.previewAudience);
router.get('/:id/logs', roleMiddleware(...campaignViewRoles), validate(campaignIdParamSchema, 'params'), validate(listCampaignLogsQuerySchema, 'query'), controller.getLogs);
router.get('/:id', roleMiddleware(...campaignViewRoles), validate(campaignIdParamSchema, 'params'), controller.getById);
router.post('/', roleMiddleware(...campaignManageRoles), validate(createCampaignSchema), requireHotelId, controller.create);
router.patch('/:id', validate(campaignIdParamSchema, 'params'), roleMiddleware(...campaignManageRoles), validate(updateCampaignSchema), controller.update);
router.patch('/:id/status', validate(campaignIdParamSchema, 'params'), roleMiddleware(...campaignManageRoles), validate(updateCampaignStatusSchema), controller.updateStatus);
router.patch('/:id/notes', validate(campaignIdParamSchema, 'params'), roleMiddleware(...campaignManageRoles), validate(addCampaignNoteSchema), controller.addNote);
router.post('/:id/launch', validate(campaignIdParamSchema, 'params'), roleMiddleware(...campaignManageRoles), validate(launchCampaignSchema), controller.launch);
router.post('/:id/pause', validate(campaignIdParamSchema, 'params'), roleMiddleware(...campaignManageRoles), controller.pause);
router.post('/:id/cancel', validate(campaignIdParamSchema, 'params'), roleMiddleware(...campaignManageRoles), controller.cancel);
router.post('/:id/complete', validate(campaignIdParamSchema, 'params'), roleMiddleware(...campaignManageRoles), controller.complete);
router.delete('/:id', validate(campaignIdParamSchema, 'params'), roleMiddleware(...campaignManageRoles), controller.remove);

export default router;
