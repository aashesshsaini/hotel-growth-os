import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import { AvailableRoomsQuery, ListRoomsQuery } from './validation';
import { ViewerContext } from './room.types';
import {
  blockRoomService,
  bulkCreateRoomsService,
  bulkUpdateRoomStatusService,
  createRoomService,
  deleteRoomService,
  getAvailableRoomsService,
  getRoomByIdService,
  getRoomStatsService,
  listRoomsService,
  markRoomMaintenanceService,
  unblockRoomService,
  updateHousekeepingStatusService,
  updateRoomService,
  updateRoomStatusService,
} from './service';

const getViewer = (req: AuthRequest): ViewerContext => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const listRooms = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await listRoomsService(req.query as unknown as ListRoomsQuery, getViewer(req));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getRoomStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getRoomStatsService(getViewer(req), req.query.hotelId as string | undefined);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

export const getAvailableRooms = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rooms = await getAvailableRoomsService(
      req.query as unknown as AvailableRoomsQuery,
      getViewer(req)
    );
    sendSuccess(res, rooms);
  } catch (error) {
    next(error);
  }
};

export const getRoomById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const room = await getRoomByIdService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, room);
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const room = await createRoomService(req.body, getViewer(req));
    sendCreated(res, room, 'Room created successfully');
  } catch (error) {
    next(error);
  }
};

export const bulkCreateRooms = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await bulkCreateRoomsService(req.body, getViewer(req));
    sendCreated(res, result, `${result.created} rooms created successfully`);
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const room = await updateRoomService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, room, 'Room updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateRoomStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const room = await updateRoomStatusService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, room, 'Room status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateRoomStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await bulkUpdateRoomStatusService(req.body, getViewer(req));
    sendSuccess(res, result, 'Room statuses updated successfully');
  } catch (error) {
    next(error);
  }
};

export const blockRoom = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const room = await blockRoomService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, room, 'Room blocked successfully');
  } catch (error) {
    next(error);
  }
};

export const unblockRoom = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const room = await unblockRoomService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, room, 'Room unblocked successfully');
  } catch (error) {
    next(error);
  }
};

export const markRoomMaintenance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const room = await markRoomMaintenanceService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, room, 'Maintenance status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateHousekeepingStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const room = await updateHousekeepingStatusService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, room, 'Housekeeping status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await deleteRoomService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, undefined, 'Room deleted successfully');
  } catch (error) {
    next(error);
  }
};
