import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { getParam } from '../../utils/params';
import { sendCreated, sendSuccess } from '../../utils/response';
import * as service from './eventLeads.service';
import {
  AddDocumentInput,
  AddNoteInput,
  AddPackageInput,
  AddProposalInput,
  AddSiteVisitInput,
  AssignInput,
  ConvertToBookingInput,
  ListQuery,
  RecordPaymentInput,
  StatusInput,
} from './eventLeads.validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.list(req.query as unknown as ListQuery, viewer(req)));
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

export const stats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getStats(viewer(req), req.query.hotelId as string | undefined));
  } catch (e) {
    next(e);
  }
};

export const pipeline = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPipeline(viewer(req), req.query.hotelId as string | undefined));
  } catch (e) {
    next(e);
  }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.create(req.body, viewer(req)), 'Event lead created successfully');
  } catch (e) {
    next(e);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.update(getParam(req.params.id), req.body, viewer(req)), 'Event lead updated successfully');
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

export const assign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.assign(getParam(req.params.id), req.body as AssignInput, viewer(req)), 'Event manager assigned');
  } catch (e) {
    next(e);
  }
};

export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.updateStatus(getParam(req.params.id), req.body as StatusInput, viewer(req)), 'Status updated successfully');
  } catch (e) {
    next(e);
  }
};

export const addNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.addNote(getParam(req.params.id), req.body as AddNoteInput, viewer(req)), 'Note added successfully');
  } catch (e) {
    next(e);
  }
};

export const addProposal = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.addProposal(getParam(req.params.id), req.body as AddProposalInput, viewer(req)), 'Proposal added successfully');
  } catch (e) {
    next(e);
  }
};

export const addPackage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.addPackage(getParam(req.params.id), req.body as AddPackageInput, viewer(req)), 'Package added successfully');
  } catch (e) {
    next(e);
  }
};

export const addSiteVisit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.addSiteVisit(getParam(req.params.id), req.body as AddSiteVisitInput, viewer(req)), 'Site visit scheduled successfully');
  } catch (e) {
    next(e);
  }
};

export const addDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.addDocument(getParam(req.params.id), req.body as AddDocumentInput, viewer(req)), 'Document added successfully');
  } catch (e) {
    next(e);
  }
};

export const recordPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.recordPayment(getParam(req.params.id), req.body as RecordPaymentInput, viewer(req)), 'Payment recorded successfully');
  } catch (e) {
    next(e);
  }
};

export const convertToBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.convertToBooking(getParam(req.params.id), req.body as ConvertToBookingInput, viewer(req)), 'Event lead converted to booking successfully');
  } catch (e) {
    next(e);
  }
};
