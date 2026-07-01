import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './festivalCampaigns.controller';
import {
  analyticsQuerySchema,
  campaignCreateSchema,
  campaignListQuerySchema,
  campaignUpdateSchema,
  duplicateSchema,
  festivalCreateSchema,
  festivalUpdateSchema,
  historyQuerySchema,
  idParamSchema,
  listQuerySchema,
  settingsSchema,
  templateCreateSchema,
  templateListQuerySchema,
  templateUpdateSchema,
  testCampaignSchema,
} from './festivalCampaigns.validation';

const router = Router();
const viewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;
const manageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/dashboard', roleMiddleware(...viewRoles), requireHotelId, controller.dashboard);
router.get('/analytics', roleMiddleware(...viewRoles), validate(analyticsQuerySchema, 'query'), requireHotelId, controller.analytics);
router.get('/history', roleMiddleware(...viewRoles), validate(historyQuerySchema, 'query'), requireHotelId, controller.history);
router.get('/export', roleMiddleware(...viewRoles), requireHotelId, controller.exportCampaigns);

router.get('/settings', roleMiddleware(...viewRoles), requireHotelId, controller.getSettings);
router.put('/settings', roleMiddleware(...manageRoles), validate(settingsSchema), requireHotelId, controller.updateSettings);
router.post('/pause', roleMiddleware(...manageRoles), requireHotelId, controller.pause);
router.post('/resume', roleMiddleware(...manageRoles), requireHotelId, controller.resume);
router.post('/retry-failed', roleMiddleware(...manageRoles), requireHotelId, controller.retryFailed);
router.post('/test-campaign', roleMiddleware(...manageRoles), validate(testCampaignSchema), requireHotelId, controller.testCampaign);

router.get('/festivals', roleMiddleware(...viewRoles), validate(listQuerySchema, 'query'), requireHotelId, controller.listFestivals);
router.post('/festivals', roleMiddleware(...manageRoles), validate(festivalCreateSchema), requireHotelId, controller.createFestival);
router.patch('/festivals/:id', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), validate(festivalUpdateSchema), controller.updateFestival);

router.get('/templates', roleMiddleware(...viewRoles), validate(templateListQuerySchema, 'query'), requireHotelId, controller.listTemplates);
router.post('/templates', roleMiddleware(...manageRoles), validate(templateCreateSchema), requireHotelId, controller.createTemplate);
router.patch('/templates/:id', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), validate(templateUpdateSchema), controller.updateTemplate);
router.delete('/templates/:id', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.deleteTemplate);
router.post('/templates/:id/duplicate', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), validate(duplicateSchema), controller.duplicateTemplate);
router.post('/templates/:id/preview', roleMiddleware(...viewRoles), validate(idParamSchema, 'params'), controller.previewTemplate);

router.get('/campaigns', roleMiddleware(...viewRoles), validate(campaignListQuerySchema, 'query'), requireHotelId, controller.listCampaigns);
router.post('/campaigns', roleMiddleware(...manageRoles), validate(campaignCreateSchema), requireHotelId, controller.createCampaign);
router.post('/campaigns/preview-recipients', roleMiddleware(...manageRoles), validate(campaignCreateSchema.pick({ channel: true, audienceSegment: true, audienceFilters: true })), requireHotelId, controller.previewRecipients);
router.patch('/campaigns/:id', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), validate(campaignUpdateSchema), controller.updateCampaign);
router.delete('/campaigns/:id', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.deleteCampaign);
router.post('/campaigns/:id/duplicate', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.duplicateCampaign);
router.post('/campaigns/:id/pause', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.pauseCampaign);
router.post('/campaigns/:id/resume', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.resumeCampaign);
router.post('/campaigns/:id/archive', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.archiveCampaign);
router.post('/campaigns/:id/cancel', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.cancelCampaign);

export default router;
