import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.d';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export const platformOnly = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }

  if (req.user.role !== 'super_admin') {
    next(new ForbiddenError('Platform access requires Super Admin permissions'));
    return;
  }

  next();
};
