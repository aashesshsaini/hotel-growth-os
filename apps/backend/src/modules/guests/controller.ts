import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import { ViewerContext } from './guest.types';
import {
  ListGuestsQuery,
  ListRepeatGuestsQuery,
} from './validation';
import {
  blacklistGuestService,
  createGuestService,
  deleteGuestService,
  getGuestByIdService,
  getGuestHistoryService,
  getGuestStatsService,
  listGuestsService,
  listRepeatGuestsService,
  mergeGuestsService,
  recordVisitService,
  removeGuestDocumentService,
  unblockGuestService,
  updateGuestPreferencesService,
  updateGuestService,
  updateGuestTagsService,
  uploadGuestDocumentService,
} from './service';

const getViewer = (req: AuthRequest): ViewerContext => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const listGuests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await listGuestsService(req.query as unknown as ListGuestsQuery, getViewer(req));
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const listRepeatGuests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await listRepeatGuestsService(
      req.query as unknown as ListRepeatGuestsQuery,
      getViewer(req)
    );
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getGuestStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getGuestStatsService(getViewer(req), req.query.hotelId as string | undefined);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

export const getGuestById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const includeAudit = req.query.includeAudit === 'true';
    const guest = await getGuestByIdService(getParam(req.params.id), getViewer(req), includeAudit);
    sendSuccess(res, guest);
  } catch (error) {
    next(error);
  }
};

export const getGuestHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const history = await getGuestHistoryService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, history);
  } catch (error) {
    next(error);
  }
};

export const createGuest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guest = await createGuestService(req.body, getViewer(req));
    sendCreated(res, guest, 'Guest created successfully');
  } catch (error) {
    next(error);
  }
};

export const updateGuest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guest = await updateGuestService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, guest, 'Guest updated successfully');
  } catch (error) {
    next(error);
  }
};

export const recordVisit = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guest = await recordVisitService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, guest, 'Guest visit recorded successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteGuest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await deleteGuestService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, undefined, 'Guest deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const mergeGuests = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await mergeGuestsService(req.body, getViewer(req));
    sendSuccess(res, result, 'Guests merged successfully');
  } catch (error) {
    next(error);
  }
};

export const updateGuestPreferences = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guest = await updateGuestPreferencesService(
      getParam(req.params.id),
      req.body,
      getViewer(req)
    );
    sendSuccess(res, guest, 'Preferences updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateGuestTags = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guest = await updateGuestTagsService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, guest, 'Tags updated successfully');
  } catch (error) {
    next(error);
  }
};

export const uploadGuestDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guest = await uploadGuestDocumentService(
      getParam(req.params.id),
      req.body,
      getViewer(req)
    );
    sendSuccess(res, guest, 'Document uploaded successfully');
  } catch (error) {
    next(error);
  }
};

export const removeGuestDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guest = await removeGuestDocumentService(
      getParam(req.params.id),
      getParam(req.params.documentId),
      getViewer(req)
    );
    sendSuccess(res, guest, 'Document removed successfully');
  } catch (error) {
    next(error);
  }
};

export const blacklistGuest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guest = await blacklistGuestService(getParam(req.params.id), req.body, getViewer(req));
    sendSuccess(res, guest, 'Guest blacklisted successfully');
  } catch (error) {
    next(error);
  }
};

export const unblockGuest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guest = await unblockGuestService(getParam(req.params.id), getViewer(req));
    sendSuccess(res, guest, 'Guest unblocked successfully');
  } catch (error) {
    next(error);
  }
};
