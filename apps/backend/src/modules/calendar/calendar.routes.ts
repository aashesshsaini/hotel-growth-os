import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { hotelAccessMiddleware, requireHotelId } from '../../middlewares/hotelAccessMiddleware';
import { roleMiddleware } from '../../middlewares/roleMiddleware';
import { validate } from '../../validations/validate';
import { objectIdSchema } from '../../validations/common';
import * as controller from './calendar.controller';
import {
  calendarQuerySchema,
  conflictQuerySchema,
  idParamSchema,
  moveBookingSchema,
  quickBookingSchema,
  resizeBookingSchema,
} from './calendar.validation';

const router = Router();
const calendarViewRoles = [
  'super_admin',
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
] as const;
const calendarManageRoles = [
  'super_admin',
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
] as const;

const transferRoomSchema = z.object({
  roomId: objectIdSchema,
  note: z.string().max(1000).optional(),
});

router.use(authMiddleware, hotelAccessMiddleware);

router.get('/overview', roleMiddleware(...calendarViewRoles), validate(calendarQuerySchema, 'query'), requireHotelId, controller.overview);
router.get('/bookings', roleMiddleware(...calendarViewRoles), validate(calendarQuerySchema, 'query'), requireHotelId, controller.bookings);
router.get('/occupancy', roleMiddleware(...calendarViewRoles), validate(calendarQuerySchema, 'query'), requireHotelId, controller.occupancy);
router.get('/availability', roleMiddleware(...calendarViewRoles), validate(calendarQuerySchema, 'query'), requireHotelId, controller.availability);
router.get('/conflicts', roleMiddleware(...calendarViewRoles), validate(conflictQuerySchema, 'query'), requireHotelId, controller.conflicts);
router.post('/bookings/quick', roleMiddleware(...calendarManageRoles), validate(quickBookingSchema), requireHotelId, controller.quickBooking);
router.patch('/bookings/:id/move', roleMiddleware(...calendarManageRoles), validate(idParamSchema, 'params'), validate(moveBookingSchema), controller.moveBooking);
router.patch('/bookings/:id/resize', roleMiddleware(...calendarManageRoles), validate(idParamSchema, 'params'), validate(resizeBookingSchema), controller.resizeBooking);
router.patch('/bookings/:id/transfer-room', roleMiddleware(...calendarManageRoles), validate(idParamSchema, 'params'), validate(transferRoomSchema), controller.transferRoom);

export default router;
