import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import { ListStaffQuery } from './validation';
import { ViewerContext } from './staff.types';
import {
  addStaffNoteService,
  assignStaffToHotelService,
  createStaffService,
  deleteStaffService,
  getStaffByIdService,
  getStaffStatsService,
  listStaffService,
  recordStaffAttendanceService,
  updateStaffPermissionsService,
  updateStaffService,
  updateStaffStatusService,
} from './service';

const getViewer = (req: AuthRequest): ViewerContext => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const listStaff = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await listStaffService(req.query as unknown as ListStaffQuery, getViewer(req));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const recordStaffAttendance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const staff = await recordStaffAttendanceService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, staff, 'Staff attendance recorded successfully');
  } catch (error) {
    next(error);
  }
};

export const addStaffNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const staff = await addStaffNoteService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, staff, 'Staff note added successfully');
  } catch (error) {
    next(error);
  }
};

export const getStaffStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getStaffStatsService(getViewer(req), req.query.hotelId as string | undefined);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

export const getStaffById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const staff = await getStaffByIdService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, staff);
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const staff = await createStaffService(req.body, getViewer(req));
    sendCreated(res, staff, 'Staff member created successfully');
  } catch (error) {
    next(error);
  }
};

export const updateStaff = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const staff = await updateStaffService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, staff, 'Staff member updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateStaffStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const staff = await updateStaffStatusService(
      getParam(req.params.id),
      req.body,
      getViewer(req)
    );
    sendSuccess(res, staff, 'Staff status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateStaffPermissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const staff = await updateStaffPermissionsService(
      getParam(req.params.id),
      req.body,
      getViewer(req)
    );
    sendSuccess(res, staff, 'Staff permissions updated successfully');
  } catch (error) {
    next(error);
  }
};

export const assignStaffToHotel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const staff = await assignStaffToHotelService(
      getParam(req.params.id),
      req.body,
      getViewer(req)
    );
    sendSuccess(res, staff, 'Staff member assigned to hotel successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteStaff = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await deleteStaffService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, undefined, 'Staff member removed successfully');
  } catch (error) {
    next(error);
  }
};
