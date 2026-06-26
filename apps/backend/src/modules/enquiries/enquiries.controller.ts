import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import * as service from './enquiries.service';
import { ListQuery } from './enquiries.validation';

const viewer = (req: AuthRequest) => ({ userId: req.user!.userId, role: req.user!.role, hotelId: req.hotelId });

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.list(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); } };
export const stats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.stats(viewer(req), req.query.hotelId as string | undefined)); } catch (e) { next(e); } };
export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.getById(getParam(req.params.id), viewer(req))); } catch (e) { next(e); } };
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendCreated(res, await service.create(req.body, viewer(req))); } catch (e) { next(e); } };
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.update(getParam(req.params.id), req.body, viewer(req))); } catch (e) { next(e); } };
export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { await service.remove(getParam(req.params.id), viewer(req)); sendSuccess(res, undefined, 'Deleted successfully'); } catch (e) { next(e); } };
export const assign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.assign(getParam(req.params.id), req.body, viewer(req)), 'Enquiry assigned successfully'); } catch (e) { next(e); } };
export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.updateStatus(getParam(req.params.id), req.body, viewer(req)), 'Enquiry status updated successfully'); } catch (e) { next(e); } };
export const addNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.addNote(getParam(req.params.id), req.body, viewer(req)), 'Enquiry note added successfully'); } catch (e) { next(e); } };
export const convertToLead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.convertToLead(getParam(req.params.id), viewer(req)), 'Enquiry converted to lead successfully'); } catch (e) { next(e); } };
export const convertToGuest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.convertToGuest(getParam(req.params.id), viewer(req)), 'Enquiry converted to guest successfully'); } catch (e) { next(e); } };
export const convertToBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.convertToBooking(getParam(req.params.id), req.body, viewer(req)), 'Enquiry converted to booking successfully'); } catch (e) { next(e); } };
