import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { getParam } from '../../utils/params';
import { sendSuccess } from '../../utils/response';
import * as service from './calendar.service';
import {
  CalendarQuery,
  ConflictQuery,
  MoveBookingInput,
  QuickBookingInput,
  ResizeBookingInput,
} from './calendar.validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const overview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getOverview(req.query as unknown as CalendarQuery, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const bookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getBookings(req.query as unknown as CalendarQuery, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const occupancy = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getOccupancy(req.query as unknown as CalendarQuery, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const availability = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getAvailability(req.query as unknown as CalendarQuery, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const conflicts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.checkConflict(req.query as unknown as ConflictQuery, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const moveBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.moveBooking(getParam(req.params.id), req.body as MoveBookingInput, viewer(req)), 'Booking moved successfully');
  } catch (e) {
    next(e);
  }
};

export const resizeBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.resizeBooking(getParam(req.params.id), req.body as ResizeBookingInput, viewer(req)), 'Booking updated successfully');
  } catch (e) {
    next(e);
  }
};

export const quickBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.quickBooking(req.body as QuickBookingInput, viewer(req)), 'Quick booking created');
  } catch (e) {
    next(e);
  }
};

export const transferRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId, note } = req.body as { roomId: string; note?: string };
    sendSuccess(res, await service.transferBookingRoom(getParam(req.params.id), roomId, viewer(req), note), 'Room transferred successfully');
  } catch (e) {
    next(e);
  }
};
