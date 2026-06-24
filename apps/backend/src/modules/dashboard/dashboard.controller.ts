import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendSuccess } from '../../utils/response';
import { getDashboard } from './dashboard.service';
export const dashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await getDashboard({ hotelId: req.hotelId })); } catch (e) { next(e); } };
