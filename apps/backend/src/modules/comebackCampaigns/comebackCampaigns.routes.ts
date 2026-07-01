import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './comebackCampaigns.controller';
import { analyticsQuerySchema, audienceSchema, campaignCreateSchema, campaignListQuerySchema, campaignUpdateSchema, duplicateSchema, historyQuerySchema, idParamSchema, settingsSchema, templateCreateSchema, templateListQuerySchema, templateUpdateSchema, testMessageSchema } from './comebackCampaigns.validation';

const router = Router();
const viewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;
const manageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/dashboard', roleMiddleware(...viewRoles), requireHotelId, controller.dashboard);
router.get('/analytics', roleMiddleware(...viewRoles), validate(analyticsQuerySchema, 'query'), requireHotelId, controller.analytics);
router.get('/history', roleMiddleware(...viewRoles), validate(historyQuerySchema, 'query'), requireHotelId, controller.history);
router.get('/export', roleMiddleware(...viewRoles), requireHotelId, controller.exportHistory);
router.get('/settings', roleMiddleware(...viewRoles), requireHotelId, controller.getSettings);
router.put('/settings', roleMiddleware(...manageRoles), validate(settingsSchema), requireHotelId, controller.updateSettings);
router.post('/pause', roleMiddleware(...manageRoles), requireHotelId, controller.pause);
router.post('/resume', roleMiddleware(...manageRoles), requireHotelId, controller.resume);
router.post('/scan', roleMiddleware(...manageRoles), requireHotelId, controller.scan);
router.post('/audience/preview', roleMiddleware(...manageRoles), validate(audienceSchema), requireHotelId, controller.previewAudience);
router.post('/retry-failed', roleMiddleware(...manageRoles), requireHotelId, controller.retryFailed);
router.post('/test-message', roleMiddleware(...manageRoles), validate(testMessageSchema), requireHotelId, controller.testMessage);

router.get('/templates', roleMiddleware(...viewRoles), validate(templateListQuerySchema, 'query'), requireHotelId, controller.listTemplates);
router.post('/templates', roleMiddleware(...manageRoles), validate(templateCreateSchema), requireHotelId, controller.createTemplate);
router.patch('/templates/:id', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), validate(templateUpdateSchema), controller.updateTemplate);
router.post('/templates/:id/duplicate', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), validate(duplicateSchema), controller.duplicateTemplate);
router.post('/templates/:id/archive', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.archiveTemplate);
router.post('/templates/:id/preview', roleMiddleware(...viewRoles), validate(idParamSchema, 'params'), controller.previewTemplate);

router.get('/campaigns', roleMiddleware(...viewRoles), validate(campaignListQuerySchema, 'query'), requireHotelId, controller.listCampaigns);
router.post('/campaigns', roleMiddleware(...manageRoles), validate(campaignCreateSchema), requireHotelId, controller.createCampaign);
router.post('/campaigns/preview', roleMiddleware(...manageRoles), validate(audienceSchema), requireHotelId, controller.previewAudience);
router.patch('/campaigns/:id', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), validate(campaignUpdateSchema), controller.updateCampaign);
router.post('/campaigns/:id/duplicate', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.duplicateCampaign);
router.post('/campaigns/:id/pause', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.pauseCampaign);
router.post('/campaigns/:id/resume', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.resumeCampaign);
router.post('/campaigns/:id/archive', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.archiveCampaign);
router.post('/campaigns/:id/cancel', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.cancelCampaign);

export default router;
