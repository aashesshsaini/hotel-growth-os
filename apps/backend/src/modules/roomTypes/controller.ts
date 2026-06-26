import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import { ListRoomTypesQuery, RoomTypeAvailabilityQuery } from './validation';
import { ViewerContext } from './roomType.types';
import {
  createRoomTypeService,
  deleteRoomTypeService,
  getPublicRoomTypesService,
  getRoomTypeAvailabilityService,
  getRoomTypeByIdService,
  getRoomTypeStatsService,
  listRoomTypesService,
  removeRoomTypeImageService,
  updateRoomTypeAmenitiesService,
  updateRoomTypePricingService,
  updateRoomTypeService,
  updateRoomTypeStatusService,
  uploadRoomTypeImagesService,
} from './service';

const getViewer = (req: AuthRequest): ViewerContext => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const listRoomTypes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await listRoomTypesService(req.query as unknown as ListRoomTypesQuery, getViewer(req));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getRoomTypeAvailability = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const availability = await getRoomTypeAvailabilityService(
      getParam(req.params.id),
      req.query as unknown as RoomTypeAvailabilityQuery,
      getViewer(req)
    );
    sendSuccess(res, availability);
  } catch (error) {
    next(error);
  }
};

export const getRoomTypeStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getRoomTypeStatsService(getViewer(req), req.query.hotelId as string | undefined);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

export const getPublicRoomTypes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomTypes = await getPublicRoomTypesService(getParam(req.params.hotelSlug));
    sendSuccess(res, roomTypes);
  } catch (error) {
    next(error);
  }
};

export const getRoomTypeById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomType = await getRoomTypeByIdService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, roomType);
  } catch (error) {
    next(error);
  }
};

export const createRoomType = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomType = await createRoomTypeService(req.body, getViewer(req));
    sendCreated(res, roomType, 'Room type created successfully');
  } catch (error) {
    next(error);
  }
};

export const updateRoomType = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomType = await updateRoomTypeService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, roomType, 'Room type updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateRoomTypeStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomType = await updateRoomTypeStatusService(
      getParam(req.params.id),
      req.body,
      getViewer(req)
    );
    sendSuccess(res, roomType, 'Room type status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateRoomTypePricing = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomType = await updateRoomTypePricingService(
      getParam(req.params.id),
      req.body,
      getViewer(req)
    );
    sendSuccess(res, roomType, 'Room type pricing updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateRoomTypeAmenities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomType = await updateRoomTypeAmenitiesService(
      getParam(req.params.id),
      req.body,
      getViewer(req)
    );
    sendSuccess(res, roomType, 'Room type amenities updated successfully');
  } catch (error) {
    next(error);
  }
};

export const uploadRoomTypeImages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomType = await uploadRoomTypeImagesService(
      getParam(req.params.id),
      req.body,
      getViewer(req)
    );
    sendSuccess(res, roomType, 'Room type images uploaded successfully');
  } catch (error) {
    next(error);
  }
};

export const removeRoomTypeImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const roomType = await removeRoomTypeImageService(
      getParam(req.params.id),
      getParam(req.params.imageId),
      getViewer(req)
    );
    sendSuccess(res, roomType, 'Room type image removed successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteRoomType = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await deleteRoomTypeService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, undefined, 'Room type deleted successfully');
  } catch (error) {
    next(error);
  }
};
