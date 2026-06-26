import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import * as service from './bookings.service';
import { ListQuery } from './bookings.validation';

const viewer = (req: AuthRequest) => ({ userId: req.user!.userId, role: req.user!.role, hotelId: req.hotelId });

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.list(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); } };
export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.getById(getParam(req.params.id), viewer(req))); } catch (e) { next(e); } };
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendCreated(res, await service.create(req.body, viewer(req))); } catch (e) { next(e); } };
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.update(getParam(req.params.id), req.body, viewer(req))); } catch (e) { next(e); } };
export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { await service.remove(getParam(req.params.id), viewer(req)); sendSuccess(res, undefined, 'Deleted successfully'); } catch (e) { next(e); } };
export const stats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.getStats(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); } };
export const upcomingCheckIns = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.getUpcomingCheckIns(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); } };
export const upcomingCheckOuts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.getUpcomingCheckOuts(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); } };
export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.updateStatus(getParam(req.params.id), req.body, viewer(req)), 'Booking status updated successfully'); } catch (e) { next(e); } };
export const cancel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.cancel(getParam(req.params.id), req.body, viewer(req)), 'Booking cancelled successfully'); } catch (e) { next(e); } };
export const checkIn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.checkIn(getParam(req.params.id), viewer(req)), 'Guest checked in successfully'); } catch (e) { next(e); } };
export const checkOut = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.checkOut(getParam(req.params.id), viewer(req)), 'Guest checked out successfully'); } catch (e) { next(e); } };
export const assignRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.assignRoom(getParam(req.params.id), req.body, viewer(req)), 'Room assigned successfully'); } catch (e) { next(e); } };
export const updateNotes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.updateNotes(getParam(req.params.id), req.body, viewer(req)), 'Booking notes updated successfully'); } catch (e) { next(e); } };
export const recordPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await service.recordPayment(getParam(req.params.id), req.body, viewer(req)), 'Payment recorded successfully'); } catch (e) { next(e); } };
