import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Success',
  statusCode = 200
): Response => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const sendCreated = <T>(res: Response, data?: T, message = 'Created'): Response => {
  return sendSuccess(res, data, message, 201);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500
): Response => {
  return res.status(statusCode).json({ success: false, error: message });
};
