import { Router } from 'express';
import {
  blacklistGuest,
  createGuest,
  deleteGuest,
  getGuestById,
  getGuestHistory,
  getGuestStats,
  listGuests,
  listRepeatGuests,
  mergeGuests,
  recordVisit,
  removeGuestDocument,
  unblockGuest,
  updateGuest,
  updateGuestPreferences,
  updateGuestTags,
  uploadGuestDocument,
} from './controller';
import { validate } from '../../validations/validate';
import {
  blacklistGuestSchema,
  createGuestSchema,
  guestDocumentParamSchema,
  guestIdParamSchema,
  listGuestsQuerySchema,
  listRepeatGuestsQuerySchema,
  mergeGuestsSchema,
  updateGuestPreferencesSchema,
  updateGuestSchema,
  updateGuestTagsSchema,
  uploadGuestDocumentSchema,
} from './validation';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import {
  GUEST_CREATE_ROLES,
  GUEST_MANAGEMENT_ROLES,
  GUEST_VIEW_ROLES,
} from './guest.constants';

const router = Router();

router.use(authMiddleware, hotelAccessMiddleware);

router.get(
  '/stats',
  roleMiddleware(...GUEST_VIEW_ROLES, 'super_admin'),
  requireHotelId,
  getGuestStats
);

router.get(
  '/repeat',
  roleMiddleware(...GUEST_VIEW_ROLES, 'super_admin'),
  validate(listRepeatGuestsQuerySchema, 'query'),
  requireHotelId,
  listRepeatGuests
);

router.post(
  '/merge',
  roleMiddleware(...GUEST_MANAGEMENT_ROLES, 'super_admin'),
  validate(mergeGuestsSchema),
  requireHotelId,
  mergeGuests
);

router.get(
  '/',
  roleMiddleware(...GUEST_VIEW_ROLES, 'super_admin'),
  validate(listGuestsQuerySchema, 'query'),
  requireHotelId,
  listGuests
);

router.get(
  '/:id/history',
  roleMiddleware(...GUEST_VIEW_ROLES, 'super_admin'),
  validate(guestIdParamSchema, 'params'),
  getGuestHistory
);

router.get(
  '/:id',
  roleMiddleware(...GUEST_VIEW_ROLES, 'super_admin'),
  validate(guestIdParamSchema, 'params'),
  getGuestById
);

router.post(
  '/',
  roleMiddleware(...GUEST_CREATE_ROLES, 'super_admin'),
  validate(createGuestSchema),
  requireHotelId,
  createGuest
);

router.patch(
  '/:id',
  roleMiddleware(...GUEST_CREATE_ROLES, 'super_admin'),
  validate(guestIdParamSchema, 'params'),
  validate(updateGuestSchema),
  updateGuest
);

router.patch(
  '/:id/visit',
  roleMiddleware(...GUEST_CREATE_ROLES, 'super_admin'),
  validate(guestIdParamSchema, 'params'),
  recordVisit
);

router.patch(
  '/:id/preferences',
  roleMiddleware(...GUEST_CREATE_ROLES, 'super_admin'),
  validate(guestIdParamSchema, 'params'),
  validate(updateGuestPreferencesSchema),
  updateGuestPreferences
);

router.patch(
  '/:id/tags',
  roleMiddleware(...GUEST_CREATE_ROLES, 'super_admin'),
  validate(guestIdParamSchema, 'params'),
  validate(updateGuestTagsSchema),
  updateGuestTags
);

router.post(
  '/:id/documents',
  roleMiddleware(...GUEST_CREATE_ROLES, 'super_admin'),
  validate(guestIdParamSchema, 'params'),
  validate(uploadGuestDocumentSchema),
  uploadGuestDocument
);

router.delete(
  '/:id/documents/:documentId',
  roleMiddleware(...GUEST_CREATE_ROLES, 'super_admin'),
  validate(guestDocumentParamSchema, 'params'),
  removeGuestDocument
);

router.patch(
  '/:id/blacklist',
  roleMiddleware(...GUEST_MANAGEMENT_ROLES, 'super_admin'),
  validate(guestIdParamSchema, 'params'),
  validate(blacklistGuestSchema),
  blacklistGuest
);

router.patch(
  '/:id/unblock',
  roleMiddleware(...GUEST_MANAGEMENT_ROLES, 'super_admin'),
  validate(guestIdParamSchema, 'params'),
  unblockGuest
);

router.delete(
  '/:id',
  roleMiddleware(...GUEST_MANAGEMENT_ROLES, 'super_admin'),
  validate(guestIdParamSchema, 'params'),
  deleteGuest
);

export default router;
