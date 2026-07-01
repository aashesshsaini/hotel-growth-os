import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './hotelIntegrations.controller';
import {
  emailIntegrationSchema,
  googleReviewIntegrationSchema,
  integrationTypeParamSchema,
  whatsappIntegrationSchema,
} from './hotelIntegrations.validation';

const router = Router();
const viewRoles = ['super_admin', 'hotel_owner', 'hotel_manager'] as const;
const manageRoles = ['super_admin', 'hotel_owner', 'hotel_manager'] as const;

router.use(authMiddleware, hotelAccessMiddleware, requireHotelId);
router.get('/', roleMiddleware(...viewRoles), controller.getSettings);
router.get('/health', roleMiddleware(...viewRoles), controller.health);
router.put('/whatsapp', roleMiddleware(...manageRoles), validate(whatsappIntegrationSchema), controller.updateWhatsApp);
router.put('/email', roleMiddleware(...manageRoles), validate(emailIntegrationSchema), controller.updateEmail);
router.put('/googleReview', roleMiddleware(...manageRoles), validate(googleReviewIntegrationSchema), controller.updateGoogleReview);
router.post('/:type/test', roleMiddleware(...manageRoles), validate(integrationTypeParamSchema, 'params'), controller.testIntegration);
router.post('/:type/disconnect', roleMiddleware(...manageRoles), validate(integrationTypeParamSchema, 'params'), controller.disconnectIntegration);

export default router;
