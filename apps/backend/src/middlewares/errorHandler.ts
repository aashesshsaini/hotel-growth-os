import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }

  logger.error('Unhandled error', err);
  return sendError(res, 'Internal server error', 500);
};

export const notFoundHandler = (_req: Request, res: Response): Response => {
  return sendError(res, 'Route not found', 404);
};
