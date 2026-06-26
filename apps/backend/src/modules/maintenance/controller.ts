import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import {
  assignMaintenanceIssueService,
  createMaintenanceIssueService,
  deleteMaintenanceIssueService,
  getMaintenanceIssueByIdService,
  getMaintenanceStatsService,
  getRoomMaintenanceHistoryService,
  listMaintenanceIssuesService,
  updateMaintenanceIssueService,
  updateMaintenanceIssueStatusService,
} from './service';
import { ListMaintenanceIssuesQuery, RoomMaintenanceHistoryQuery } from './validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const listMaintenanceIssues = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await listMaintenanceIssuesService(req.query as unknown as ListMaintenanceIssuesQuery, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getMaintenanceStatsService(viewer(req), req.query.hotelId as string | undefined));
  } catch (error) {
    next(error);
  }
};

export const getRoomMaintenanceHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getRoomMaintenanceHistoryService(req.query as unknown as RoomMaintenanceHistoryQuery, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceIssueById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getMaintenanceIssueByIdService(getParam(req.params.id), viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const createMaintenanceIssue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendCreated(res, await createMaintenanceIssueService(req.body, viewer(req)), 'Maintenance issue created successfully');
  } catch (error) {
    next(error);
  }
};

export const updateMaintenanceIssue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await updateMaintenanceIssueService(getParam(req.params.id), req.body, viewer(req)), 'Maintenance issue updated successfully');
  } catch (error) {
    next(error);
  }
};

export const assignMaintenanceIssue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await assignMaintenanceIssueService(getParam(req.params.id), req.body, viewer(req)), 'Maintenance issue assigned successfully');
  } catch (error) {
    next(error);
  }
};

export const updateMaintenanceIssueStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await updateMaintenanceIssueStatusService(getParam(req.params.id), req.body, viewer(req)), 'Maintenance issue status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteMaintenanceIssue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await deleteMaintenanceIssueService(getParam(req.params.id), viewer(req));
    sendSuccess(res, undefined, 'Maintenance issue deleted successfully');
  } catch (error) {
    next(error);
  }
};
