import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './loyaltyReferrals.controller';
import { acceptReferralSchema, adjustPointsSchema, analyticsQuerySchema, codeSchema, earnPointsSchema, inviteSchema, issueRewardSchema, listQuerySchema, redeemPointsSchema, settingsSchema } from './loyaltyReferrals.validation';

const router = Router();
const viewRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'] as const;
const manageRoles = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'] as const;

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/dashboard', roleMiddleware(...viewRoles), requireHotelId, controller.dashboard);
router.get('/analytics', roleMiddleware(...viewRoles), validate(analyticsQuerySchema, 'query'), requireHotelId, controller.analytics);
router.get('/settings', roleMiddleware(...viewRoles), requireHotelId, controller.getSettings);
router.put('/settings', roleMiddleware(...manageRoles), validate(settingsSchema), requireHotelId, controller.updateSettings);
router.get('/export', roleMiddleware(...viewRoles), requireHotelId, controller.exportReports);

router.get('/referrals/codes', roleMiddleware(...viewRoles), validate(listQuerySchema, 'query'), requireHotelId, controller.codes);
router.post('/referrals/code', roleMiddleware(...manageRoles), validate(codeSchema), requireHotelId, controller.generateCode);
router.get('/referrals/invitations', roleMiddleware(...viewRoles), validate(listQuerySchema, 'query'), requireHotelId, controller.invites);
router.post('/referrals/invite', roleMiddleware(...manageRoles), validate(inviteSchema), requireHotelId, controller.invite);
router.post('/referrals/accept', roleMiddleware(...manageRoles), validate(acceptReferralSchema), requireHotelId, controller.accept);
router.post('/referrals/reward', roleMiddleware(...manageRoles), validate(issueRewardSchema), requireHotelId, controller.issueReward);

router.get('/transactions', roleMiddleware(...viewRoles), validate(listQuerySchema, 'query'), requireHotelId, controller.transactions);
router.post('/points/earn', roleMiddleware(...manageRoles), validate(earnPointsSchema), requireHotelId, controller.earnPoints);
router.post('/points/adjust', roleMiddleware(...manageRoles), validate(adjustPointsSchema), requireHotelId, controller.adjustPoints);
router.post('/points/redeem', roleMiddleware(...manageRoles), validate(redeemPointsSchema), requireHotelId, controller.redeemPoints);
router.get('/redemptions', roleMiddleware(...viewRoles), validate(listQuerySchema, 'query'), requireHotelId, controller.redemptions);

export default router;
