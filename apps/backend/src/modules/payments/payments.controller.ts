import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import * as service from './payments.service';
import {
  AddPaymentNoteInput,
  CreateInput,
  ListQuery,
  RefundInput,
  UpdateInput,
  UpdateStatusInput,
} from './payments.validation';

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

export const getBookingSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getBookingSummary(getParam(req.params.bookingId), viewer(req))); } catch (e) { next(e); }
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

export const refund = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.refund(getParam(req.params.id), req.body as RefundInput, viewer(req))); } catch (e) { next(e); }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.updateStatus(getParam(req.params.id), req.body as UpdateStatusInput, viewer(req))); } catch (e) { next(e); }
};

export const addNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.addNote(getParam(req.params.id), req.body as AddPaymentNoteInput, viewer(req))); } catch (e) { next(e); }
};
