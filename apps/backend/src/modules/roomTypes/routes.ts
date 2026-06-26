import { Router } from 'express';
import {
  createRoomType,
  deleteRoomType,
  getPublicRoomTypes,
  getRoomTypeAvailability,
  getRoomTypeById,
  getRoomTypeStats,
  listRoomTypes,
  removeRoomTypeImage,
  updateRoomType,
  updateRoomTypeAmenities,
  updateRoomTypePricing,
  updateRoomTypeStatus,
  uploadRoomTypeImages,
} from './controller';
import { validate } from '../../validations/validate';
import {
  createRoomTypeSchema,
  listRoomTypesQuerySchema,
  publicHotelSlugParamSchema,
  roomTypeAvailabilityQuerySchema,
  roomTypeIdParamSchema,
  roomTypeImageIdParamSchema,
  updateRoomTypeAmenitiesSchema,
  updateRoomTypePricingSchema,
  updateRoomTypeSchema,
  updateRoomTypeStatusSchema,
  uploadRoomTypeImagesSchema,
} from './validation';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { ROOM_TYPE_MANAGEMENT_ROLES, ROOM_TYPE_VIEW_ROLES } from './roomType.constants';

const router = Router();

router.get(
  '/public/:hotelSlug',
  validate(publicHotelSlugParamSchema, 'params'),
  getPublicRoomTypes
);

router.use(authMiddleware, hotelAccessMiddleware);

router.get(
  '/stats',
  roleMiddleware(...ROOM_TYPE_VIEW_ROLES, 'super_admin'),
  requireHotelId,
  getRoomTypeStats
);

router.get(
  '/',
  roleMiddleware(...ROOM_TYPE_VIEW_ROLES, 'super_admin'),
  validate(listRoomTypesQuerySchema, 'query'),
  requireHotelId,
  listRoomTypes
);

router.get(
  '/:id/availability',
  roleMiddleware(...ROOM_TYPE_VIEW_ROLES, 'super_admin'),
  validate(roomTypeIdParamSchema, 'params'),
  validate(roomTypeAvailabilityQuerySchema, 'query'),
  getRoomTypeAvailability
);

router.get(
  '/:id',
  roleMiddleware(...ROOM_TYPE_VIEW_ROLES, 'super_admin'),
  validate(roomTypeIdParamSchema, 'params'),
  getRoomTypeById
);

router.post(
  '/',
  roleMiddleware(...ROOM_TYPE_MANAGEMENT_ROLES, 'super_admin'),
  validate(createRoomTypeSchema),
  requireHotelId,
  createRoomType
);

router.patch(
  '/:id',
  validate(roomTypeIdParamSchema, 'params'),
  roleMiddleware(...ROOM_TYPE_MANAGEMENT_ROLES, 'super_admin'),
  validate(updateRoomTypeSchema),
  updateRoomType
);

router.put(
  '/:id',
  validate(roomTypeIdParamSchema, 'params'),
  roleMiddleware(...ROOM_TYPE_MANAGEMENT_ROLES, 'super_admin'),
  validate(updateRoomTypeSchema),
  updateRoomType
);

router.patch(
  '/:id/status',
  validate(roomTypeIdParamSchema, 'params'),
  roleMiddleware(...ROOM_TYPE_MANAGEMENT_ROLES, 'super_admin'),
  validate(updateRoomTypeStatusSchema),
  updateRoomTypeStatus
);

router.patch(
  '/:id/pricing',
  validate(roomTypeIdParamSchema, 'params'),
  roleMiddleware(...ROOM_TYPE_MANAGEMENT_ROLES, 'super_admin'),
  validate(updateRoomTypePricingSchema),
  updateRoomTypePricing
);

router.patch(
  '/:id/amenities',
  validate(roomTypeIdParamSchema, 'params'),
  roleMiddleware(...ROOM_TYPE_MANAGEMENT_ROLES, 'super_admin'),
  validate(updateRoomTypeAmenitiesSchema),
  updateRoomTypeAmenities
);

router.post(
  '/:id/images',
  validate(roomTypeIdParamSchema, 'params'),
  roleMiddleware(...ROOM_TYPE_MANAGEMENT_ROLES, 'super_admin'),
  validate(uploadRoomTypeImagesSchema),
  uploadRoomTypeImages
);

router.delete(
  '/:id/images/:imageId',
  validate(roomTypeImageIdParamSchema, 'params'),
  roleMiddleware(...ROOM_TYPE_MANAGEMENT_ROLES, 'super_admin'),
  removeRoomTypeImage
);

router.delete(
  '/:id',
  validate(roomTypeIdParamSchema, 'params'),
  roleMiddleware(...ROOM_TYPE_MANAGEMENT_ROLES, 'super_admin'),
  deleteRoomType
);

export default router;
