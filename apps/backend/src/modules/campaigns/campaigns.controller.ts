import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import * as service from './campaigns.service';
import {
  AddCampaignNoteInput,
  CreateCampaignInput,
  LaunchCampaignInput,
  ListCampaignLogsQuery,
  ListCampaignsQuery,
  UpdateCampaignInput,
  UpdateCampaignStatusInput,
} from './campaigns.validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.list(req.query as unknown as ListCampaignsQuery, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const stats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.stats(viewer(req), req.hotelId));
  } catch (e) {
    next(e);
  }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getById(getParam(req.params.id), viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.create(req.body as CreateCampaignInput, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.update(getParam(req.params.id), req.body as UpdateCampaignInput, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.remove(getParam(req.params.id), viewer(req));
    sendSuccess(res, undefined, 'Deleted successfully');
  } catch (e) {
    next(e);
  }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(
      res,
      await service.updateStatus(getParam(req.params.id), req.body as UpdateCampaignStatusInput, viewer(req))
    );
  } catch (e) {
    next(e);
  }
};

export const addNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.addNote(getParam(req.params.id), req.body as AddCampaignNoteInput, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const previewAudience = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.previewAudience(getParam(req.params.id), viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const getLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(
      res,
      await service.getLogs(getParam(req.params.id), req.query as unknown as ListCampaignLogsQuery, viewer(req))
    );
  } catch (e) {
    next(e);
  }
};

export const launch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.launch(getParam(req.params.id), req.body as LaunchCampaignInput, viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const pause = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.pause(getParam(req.params.id), viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const cancel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.cancel(getParam(req.params.id), viewer(req)));
  } catch (e) {
    next(e);
  }
};

export const complete = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.complete(getParam(req.params.id), viewer(req)));
  } catch (e) {
    next(e);
  }
};
