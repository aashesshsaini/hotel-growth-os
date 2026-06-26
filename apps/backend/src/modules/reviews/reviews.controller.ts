import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import * as service from './reviews.service';
import {
  AddReviewNoteInput,
  CreateInput,
  EscalateReviewInput,
  ListQuery,
  PublicSubmitInput,
  ReplyReviewInput,
  RequestReviewInput,
  ResolveReviewInput,
  UpdateInput,
} from './reviews.validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const stats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.stats(viewer(req))); } catch (e) { next(e); }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.list(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getById(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendCreated(res, await service.create(req.body as CreateInput, viewer(req))); } catch (e) { next(e); }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.update(getParam(req.params.id), req.body as UpdateInput, viewer(req))); } catch (e) { next(e); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await service.remove(getParam(req.params.id), viewer(req)); sendSuccess(res, undefined, 'Deleted successfully'); } catch (e) { next(e); }
};

export const requestReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendCreated(res, await service.requestReview(req.body as RequestReviewInput, viewer(req))); } catch (e) { next(e); }
};

export const sendRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.sendRequest(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};

export const reply = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.reply(getParam(req.params.id), req.body as ReplyReviewInput, viewer(req))); } catch (e) { next(e); }
};

export const escalate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.escalate(getParam(req.params.id), req.body as EscalateReviewInput, viewer(req))); } catch (e) { next(e); }
};

export const resolveReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.resolveReview(getParam(req.params.id), req.body as ResolveReviewInput, viewer(req))); } catch (e) { next(e); }
};

export const notifyManager = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.notifyManager(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};

export const sendGoogleLink = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.sendGoogleLink(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};

export const addNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.addNote(getParam(req.params.id), req.body as AddReviewNoteInput, viewer(req))); } catch (e) { next(e); }
};

export const getPublicRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getPublicRequest(getParam(req.params.token))); } catch (e) { next(e); }
};

export const submitPublic = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.submitPublic(getParam(req.params.token), req.body as PublicSubmitInput)); } catch (e) { next(e); }
};
