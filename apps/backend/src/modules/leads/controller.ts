import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import {
  addLeadNoteService,
  assignLeadService,
  convertLeadToBookingService,
  convertLeadToGuestService,
  createLeadService,
  deleteLeadService,
  getLeadByIdService,
  getLeadStatsService,
  listLeadsService,
  updateLeadService,
  updateLeadStatusService,
} from './service';
import { ListLeadsQuery } from './validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const listLeads = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await listLeadsService(req.query as unknown as ListLeadsQuery, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const getLeadStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getLeadStatsService(viewer(req), req.query.hotelId as string | undefined));
  } catch (error) {
    next(error);
  }
};

export const getLeadById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getLeadByIdService(getParam(req.params.id), viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const createLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendCreated(res, await createLeadService(req.body, viewer(req)), 'Lead created successfully');
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await updateLeadService(getParam(req.params.id), req.body, viewer(req)), 'Lead updated successfully');
  } catch (error) {
    next(error);
  }
};

export const assignLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await assignLeadService(getParam(req.params.id), req.body, viewer(req)), 'Lead assigned successfully');
  } catch (error) {
    next(error);
  }
};

export const updateLeadStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await updateLeadStatusService(getParam(req.params.id), req.body, viewer(req)), 'Lead status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const addLeadNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await addLeadNoteService(getParam(req.params.id), req.body, viewer(req)), 'Lead note added successfully');
  } catch (error) {
    next(error);
  }
};

export const convertLeadToGuest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await convertLeadToGuestService(getParam(req.params.id), viewer(req)), 'Lead converted to guest successfully');
  } catch (error) {
    next(error);
  }
};

export const convertLeadToBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await convertLeadToBookingService(getParam(req.params.id), req.body, viewer(req)), 'Lead converted to booking successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await deleteLeadService(getParam(req.params.id), viewer(req));
    sendSuccess(res, undefined, 'Lead archived successfully');
  } catch (error) {
    next(error);
  }
};
