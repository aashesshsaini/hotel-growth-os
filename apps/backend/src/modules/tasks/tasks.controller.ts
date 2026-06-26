import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import * as service from './tasks.service';
import { ListQuery } from './tasks.validation';

const viewer = (req: AuthRequest) => ({ userId: req.user!.userId, role: req.user!.role, hotelId: req.hotelId });

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.list(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); } };
export const stats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.stats(viewer(req), req.query.hotelId as string | undefined)); } catch (e) { next(e); } };
export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.getById(getParam(req.params.id), viewer(req))); } catch (e) { next(e); } };
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendCreated(res, await service.create(req.body, viewer(req))); } catch (e) { next(e); } };
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.update(getParam(req.params.id), req.body, viewer(req))); } catch (e) { next(e); } };
export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { await service.remove(getParam(req.params.id), viewer(req)); sendSuccess(res, undefined, 'Deleted successfully'); } catch (e) { next(e); } };
export const assign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.assign(getParam(req.params.id), req.body, viewer(req)), 'Follow-up assigned successfully'); } catch (e) { next(e); } };
export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.updateStatus(getParam(req.params.id), req.body, viewer(req)), 'Follow-up status updated successfully'); } catch (e) { next(e); } };
export const reschedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.reschedule(getParam(req.params.id), req.body, viewer(req)), 'Follow-up rescheduled successfully'); } catch (e) { next(e); } };
export const addNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.addNote(getParam(req.params.id), req.body, viewer(req)), 'Follow-up note added successfully'); } catch (e) { next(e); } };
