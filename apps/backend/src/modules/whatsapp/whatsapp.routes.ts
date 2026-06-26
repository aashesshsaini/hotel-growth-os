import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './whatsapp.controller';
import {
  broadcastWhatsAppMessageSchema,
  createWhatsAppAutomationRuleSchema,
  createWhatsAppMessageSchema,
  createWhatsAppTemplateSchema,
  listConversationsQuerySchema,
  listWhatsAppMessagesQuerySchema,
  phoneParamSchema,
  scheduleWhatsAppMessageSchema,
  sendWhatsAppMessageSchema,
  updateWhatsAppAutomationRuleSchema,
  updateWhatsAppMessageSchema,
  updateWhatsAppTemplateSchema,
  whatsappIdParamSchema,
} from './whatsapp.validation';

const router = Router();
const whatsappViewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;
const whatsappManageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;

router.get('/webhook', controller.verifyWebhook);
router.post('/webhook', controller.processWebhook);

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/stats', roleMiddleware(...whatsappViewRoles), requireHotelId, controller.stats);
router.get('/integration-status', roleMiddleware(...whatsappViewRoles), controller.integrationStatus);
router.get('/conversations', roleMiddleware(...whatsappViewRoles), validate(listConversationsQuerySchema, 'query'), requireHotelId, controller.conversations);
router.get('/conversations/:phone', roleMiddleware(...whatsappViewRoles), validate(phoneParamSchema, 'params'), controller.conversationThread);
router.get('/templates', roleMiddleware(...whatsappViewRoles), validate(listWhatsAppMessagesQuerySchema, 'query'), requireHotelId, controller.listTemplates);
router.get('/automation-rules', roleMiddleware(...whatsappViewRoles), validate(listWhatsAppMessagesQuerySchema, 'query'), requireHotelId, controller.listAutomationRules);
router.get('/messages', roleMiddleware(...whatsappViewRoles), validate(listWhatsAppMessagesQuerySchema, 'query'), requireHotelId, controller.list);
router.post('/send', roleMiddleware(...whatsappManageRoles), validate(sendWhatsAppMessageSchema), requireHotelId, controller.sendMessage);
router.post('/schedule', roleMiddleware(...whatsappManageRoles), validate(scheduleWhatsAppMessageSchema), requireHotelId, controller.scheduleMessage);
router.post('/broadcast', roleMiddleware(...whatsappManageRoles), validate(broadcastWhatsAppMessageSchema), requireHotelId, controller.broadcastMessage);
router.post('/process-scheduled', roleMiddleware(...whatsappManageRoles), requireHotelId, controller.processScheduled);
router.post('/templates', roleMiddleware(...whatsappManageRoles), validate(createWhatsAppTemplateSchema), requireHotelId, controller.createTemplate);
router.patch('/templates/:id', validate(whatsappIdParamSchema, 'params'), roleMiddleware(...whatsappManageRoles), validate(updateWhatsAppTemplateSchema), controller.updateTemplate);
router.post('/automation-rules', roleMiddleware(...whatsappManageRoles), validate(createWhatsAppAutomationRuleSchema), requireHotelId, controller.createAutomationRule);
router.patch('/automation-rules/:id', validate(whatsappIdParamSchema, 'params'), roleMiddleware(...whatsappManageRoles), validate(updateWhatsAppAutomationRuleSchema), controller.updateAutomationRule);
router.post('/:id/retry', validate(whatsappIdParamSchema, 'params'), roleMiddleware(...whatsappManageRoles), controller.retryMessage);

router.get('/', roleMiddleware(...whatsappViewRoles), validate(listWhatsAppMessagesQuerySchema, 'query'), requireHotelId, controller.list);
router.get('/:id', roleMiddleware(...whatsappViewRoles), validate(whatsappIdParamSchema, 'params'), controller.getById);
router.post('/', roleMiddleware(...whatsappManageRoles), validate(createWhatsAppMessageSchema), requireHotelId, controller.create);
router.patch('/:id', validate(whatsappIdParamSchema, 'params'), roleMiddleware(...whatsappManageRoles), validate(updateWhatsAppMessageSchema), controller.update);
router.put('/:id', validate(whatsappIdParamSchema, 'params'), roleMiddleware(...whatsappManageRoles), validate(updateWhatsAppMessageSchema), controller.update);
router.delete('/:id', validate(whatsappIdParamSchema, 'params'), roleMiddleware(...whatsappManageRoles), controller.remove);

export default router;
