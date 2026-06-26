import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import {
  assignHousekeepingTaskService,
  createHousekeepingTaskService,
  deleteHousekeepingTaskService,
  getDailyHousekeepingScheduleService,
  getHousekeepingStatsService,
  getHousekeepingTaskByIdService,
  listHousekeepingTasksService,
  updateHousekeepingTaskService,
  updateHousekeepingTaskStatusService,
} from './service';
import { DailyHousekeepingScheduleQuery, ListHousekeepingTasksQuery } from './validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const listHousekeepingTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await listHousekeepingTasksService(req.query as unknown as ListHousekeepingTasksQuery, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const getHousekeepingStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getHousekeepingStatsService(viewer(req), req.query.hotelId as string | undefined));
  } catch (error) {
    next(error);
  }
};

export const getDailyHousekeepingSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getDailyHousekeepingScheduleService(req.query as unknown as DailyHousekeepingScheduleQuery, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const getHousekeepingTaskById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getHousekeepingTaskByIdService(getParam(req.params.id), viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const createHousekeepingTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendCreated(res, await createHousekeepingTaskService(req.body, viewer(req)), 'Housekeeping task created successfully');
  } catch (error) {
    next(error);
  }
};

export const updateHousekeepingTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await updateHousekeepingTaskService(getParam(req.params.id), req.body, viewer(req)), 'Housekeeping task updated successfully');
  } catch (error) {
    next(error);
  }
};

export const assignHousekeepingTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await assignHousekeepingTaskService(getParam(req.params.id), req.body, viewer(req)), 'Housekeeping task assigned successfully');
  } catch (error) {
    next(error);
  }
};

export const updateHousekeepingTaskStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await updateHousekeepingTaskStatusService(getParam(req.params.id), req.body, viewer(req)), 'Housekeeping task status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteHousekeepingTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await deleteHousekeepingTaskService(getParam(req.params.id), viewer(req));
    sendSuccess(res, undefined, 'Housekeeping task deleted successfully');
  } catch (error) {
    next(error);
  }
};
