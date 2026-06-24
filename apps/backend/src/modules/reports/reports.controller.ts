import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendSuccess } from '../../utils/response';
import { getReports } from './reports.service';
export const reports = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => { try { sendSuccess(res, await getReports({ hotelId: req.hotelId })); } catch (e) { next(e); } };
