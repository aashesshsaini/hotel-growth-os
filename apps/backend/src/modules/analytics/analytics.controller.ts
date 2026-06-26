import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendSuccess } from '../../utils/response';
import * as service from './analytics.service';
import { AnalyticsQuery, ExportQuery } from './analytics.validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const overview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getOverview(req.query as unknown as AnalyticsQuery, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const exportData = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await service.exportAnalytics(req.query as unknown as ExportQuery, viewer(req));
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
};
