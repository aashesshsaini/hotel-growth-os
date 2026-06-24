import { Response, NextFunction } from 'express';
import { UserRole } from '@hotel-growth-os/shared';
import { AuthRequest } from '../types/express.d';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export const roleMiddleware =
  (...allowedRoles: UserRole[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };

export const superAdminOnly = roleMiddleware('super_admin');

export const hotelStaffRoles: UserRole[] = [
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
];

export const hotelManagementRoles: UserRole[] = ['hotel_owner', 'hotel_manager'];
