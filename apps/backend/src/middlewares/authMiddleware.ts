import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.d';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import { User } from '../models';

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const user = await User.findById(payload.userId).select('+password');
    if (!user || !user.isActive || user.isDeleted) {
      throw new UnauthorizedError('Invalid or inactive user');
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      hotelId: user.hotelId?.toString(),
    };

    if (user.hotelId) {
      req.hotelId = user.hotelId.toString();
    }

    next();
  } catch (error) {
    next(error instanceof UnauthorizedError ? error : new UnauthorizedError('Invalid token'));
  }
};
