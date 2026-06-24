import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.d';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../utils/errors';

export const hotelAccessMiddleware = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }

  if (req.user.role === 'super_admin') {
    const hotelIdFromParams = req.params.hotelId || req.query.hotelId || req.body?.hotelId;
    if (hotelIdFromParams) {
      req.hotelId = String(hotelIdFromParams);
    }
    next();
    return;
  }

  if (!req.user.hotelId) {
    next(new ForbiddenError('No hotel assigned to user'));
    return;
  }

  const requestedHotelId =
    req.params.hotelId || req.query.hotelId || req.body?.hotelId || req.headers['x-hotel-id'];

  if (requestedHotelId && String(requestedHotelId) !== req.user.hotelId) {
    next(new ForbiddenError('Access denied to this hotel'));
    return;
  }

  req.hotelId = req.user.hotelId;
  next();
};

export const requireHotelId = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (!req.hotelId) {
    next(new ValidationError('Hotel ID is required'));
    return;
  }
  next();
};
