import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './birthdayAutomation.controller';
import {
  analyticsQuerySchema,
  campaignCreateSchema,
  campaignListQuerySchema,
  duplicateTemplateSchema,
  historyQuerySchema,
  idParamSchema,
  manualSendSchema,
  scanSchema,
  settingsSchema,
  templateCreateSchema,
  templateListQuerySchema,
  templateUpdateSchema,
  testMessageSchema,
} from './birthdayAutomation.validation';

const router = Router();
const viewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;
const manageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/dashboard', roleMiddleware(...viewRoles), requireHotelId, controller.dashboard);
router.get('/analytics', roleMiddleware(...viewRoles), validate(analyticsQuerySchema, 'query'), requireHotelId, controller.analytics);
router.get('/history', roleMiddleware(...viewRoles), validate(historyQuerySchema, 'query'), requireHotelId, controller.listHistory);
router.get('/export', roleMiddleware(...viewRoles), requireHotelId, controller.exportHistory);

router.get('/settings', roleMiddleware(...viewRoles), requireHotelId, controller.getSettings);
router.put('/settings', roleMiddleware(...manageRoles), validate(settingsSchema), requireHotelId, controller.updateSettings);
router.post('/pause', roleMiddleware(...manageRoles), requireHotelId, controller.pause);
router.post('/resume', roleMiddleware(...manageRoles), requireHotelId, controller.resume);
router.post('/scan', roleMiddleware(...manageRoles), validate(scanSchema), requireHotelId, controller.scan);
router.post('/retry-failed', roleMiddleware(...manageRoles), requireHotelId, controller.retryFailed);
router.post('/manual-send', roleMiddleware(...manageRoles), validate(manualSendSchema), requireHotelId, controller.manualSend);
router.post('/test-message', roleMiddleware(...manageRoles), validate(testMessageSchema), requireHotelId, controller.testMessage);

router.get('/templates', roleMiddleware(...viewRoles), validate(templateListQuerySchema, 'query'), requireHotelId, controller.listTemplates);
router.post('/templates', roleMiddleware(...manageRoles), validate(templateCreateSchema), requireHotelId, controller.createTemplate);
router.patch('/templates/:id', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), validate(templateUpdateSchema), controller.updateTemplate);
router.delete('/templates/:id', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.deleteTemplate);
router.post('/templates/:id/duplicate', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), validate(duplicateTemplateSchema), controller.duplicateTemplate);
router.post('/templates/:id/preview', roleMiddleware(...viewRoles), validate(idParamSchema, 'params'), controller.previewTemplate);

router.get('/campaigns', roleMiddleware(...viewRoles), validate(campaignListQuerySchema, 'query'), requireHotelId, controller.listCampaigns);
router.post('/campaigns', roleMiddleware(...manageRoles), validate(campaignCreateSchema), requireHotelId, controller.createCampaign);
router.post('/campaigns/preview-recipients', roleMiddleware(...manageRoles), validate(campaignCreateSchema.partial({ name: true })), requireHotelId, controller.previewRecipients);
router.post('/campaigns/:id/cancel', roleMiddleware(...manageRoles), validate(idParamSchema, 'params'), controller.cancelCampaign);

export default router;
