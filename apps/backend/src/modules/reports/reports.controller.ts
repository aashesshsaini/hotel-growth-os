import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendSuccess } from '../../utils/response';
import * as service from './reports.service';
import { CategoryParam, ExportQuery, ReportQuery } from './reports.validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const legacyReports = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getReports(viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const summary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getSummary(req.query as unknown as ReportQuery, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const categories = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, service.getCategories());
  } catch (e) {
    next(e);
  }
};

export const categoryReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category } = req.params as CategoryParam;
    sendSuccess(res, await service.getCategoryReport(category, req.query as unknown as ReportQuery, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const exportReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { category } = req.params as CategoryParam;
    sendSuccess(res, await service.exportCategoryReport(category, req.query as unknown as ExportQuery, viewer(req)));
  } catch (e) {
    next(e);
  }
};
