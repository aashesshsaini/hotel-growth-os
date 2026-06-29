import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { getParam } from '../../utils/params';
import { sendCreated, sendSuccess } from '../../utils/response';
import * as service from './platform.service';
import {
  ImpersonateInput,
  PlatformHotelBulkActionInput,
  PlatformHotelCreateInput,
  PlatformHotelListQuery,
  PlatformHotelResetPasswordInput,
  PlatformHotelSendEmailInput,
  PlatformHotelStatusInput,
  PlatformHotelUpdateInput,
  PlatformPlanCreateInput,
  PlatformPlanListQuery,
  PlatformPlanStatusInput,
  PlatformPlanUpdateInput,
  PlatformSubscriptionActionInput,
  PlatformSubscriptionAssignInput,
  PlatformSubscriptionListQuery,
  PlatformInvoiceActionInput,
  PlatformInvoiceGenerateInput,
  PlatformInvoiceListQuery,
  PlatformAnalyticsQuery,
  PlatformTicketActionInput,
  PlatformTicketCreateInput,
  PlatformTicketListQuery,
  PlatformIncidentListQuery,
  PlatformSystemHealthQuery,
} from './platform.validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
});

export const dashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformDashboard());
  } catch (error) {
    next(error);
  }
};

export const listHotels = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.listPlatformHotels(req.query as unknown as PlatformHotelListQuery));
  } catch (error) {
    next(error);
  }
};

export const getHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformHotel(getParam(req.params.id)));
  } catch (error) {
    next(error);
  }
};

export const createHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.createPlatformHotel(req.body as PlatformHotelCreateInput, viewer(req)), 'Hotel created');
  } catch (error) {
    next(error);
  }
};

export const updateHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.updatePlatformHotel(getParam(req.params.id), req.body as PlatformHotelUpdateInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const updateHotelStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.updatePlatformHotelStatus(getParam(req.params.id), req.body as PlatformHotelStatusInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const deleteHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deletePlatformHotel(getParam(req.params.id), viewer(req));
    sendSuccess(res, undefined, 'Hotel deleted');
  } catch (error) {
    next(error);
  }
};

export const bulkHotelAction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.bulkPlatformHotelAction(req.body as PlatformHotelBulkActionInput, viewer(req)), 'Bulk action completed');
  } catch (error) {
    next(error);
  }
};

export const resetHotelOwnerPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(
      res,
      await service.resetHotelOwnerPassword(getParam(req.params.id), req.body as PlatformHotelResetPasswordInput, viewer(req)),
      'Owner password reset'
    );
  } catch (error) {
    next(error);
  }
};

export const sendHotelOwnerEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(
      res,
      await service.sendHotelOwnerEmail(getParam(req.params.id), req.body as PlatformHotelSendEmailInput, viewer(req)),
      'Email queued'
    );
  } catch (error) {
    next(error);
  }
};

export const exportHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.exportPlatformHotel(getParam(req.params.id), viewer(req)), 'Hotel export ready');
  } catch (error) {
    next(error);
  }
};

export const listPlans = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.listPlatformPlans(req.query as unknown as PlatformPlanListQuery));
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.createPlatformPlan(req.body as PlatformPlanCreateInput, viewer(req)), 'Plan created');
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.updatePlatformPlan(getParam(req.params.id), req.body as PlatformPlanUpdateInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const duplicatePlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.duplicatePlatformPlan(getParam(req.params.id), viewer(req)), 'Plan duplicated');
  } catch (error) {
    next(error);
  }
};

export const updatePlanStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.updatePlatformPlanStatus(getParam(req.params.id), req.body as PlatformPlanStatusInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.deletePlatformPlan(getParam(req.params.id), viewer(req));
    sendSuccess(res, undefined, 'Plan deleted');
  } catch (error) {
    next(error);
  }
};

export const listSubscriptions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.listPlatformSubscriptions(req.query as unknown as PlatformSubscriptionListQuery));
  } catch (error) {
    next(error);
  }
};

export const assignSubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.assignPlatformSubscription(req.body as PlatformSubscriptionAssignInput, viewer(req)), 'Subscription assigned');
  } catch (error) {
    next(error);
  }
};

export const subscriptionAction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.updatePlatformSubscriptionAction(getParam(req.params.id), req.body as PlatformSubscriptionActionInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const billingSummary = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformBillingSummary());
  } catch (error) {
    next(error);
  }
};

export const listInvoices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.listPlatformInvoices(req.query as unknown as PlatformInvoiceListQuery));
  } catch (error) {
    next(error);
  }
};

export const getInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformInvoice(getParam(req.params.id)));
  } catch (error) {
    next(error);
  }
};

export const generateInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.generatePlatformInvoice(req.body as PlatformInvoiceGenerateInput, viewer(req)), 'Invoice generated');
  } catch (error) {
    next(error);
  }
};

export const invoiceAction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.runPlatformInvoiceAction(getParam(req.params.id), req.body as PlatformInvoiceActionInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const platformAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformAnalytics(req.query as unknown as PlatformAnalyticsQuery));
  } catch (error) {
    next(error);
  }
};

export const supportSummary = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformSupportSummary());
  } catch (error) {
    next(error);
  }
};

export const listTickets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.listPlatformTickets(req.query as unknown as PlatformTicketListQuery));
  } catch (error) {
    next(error);
  }
};

export const getTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformTicket(getParam(req.params.id)));
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.createPlatformTicket(req.body as PlatformTicketCreateInput, viewer(req)), 'Ticket created');
  } catch (error) {
    next(error);
  }
};

export const ticketAction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.runPlatformTicketAction(getParam(req.params.id), req.body as PlatformTicketActionInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const systemHealth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformSystemHealth(req.query as unknown as PlatformSystemHealthQuery));
  } catch (error) {
    next(error);
  }
};

export const listSystemIncidents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.listPlatformSystemIncidents(req.query as unknown as PlatformIncidentListQuery));
  } catch (error) {
    next(error);
  }
};

export const getSystemIncident = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformSystemIncident(getParam(req.params.id)));
  } catch (error) {
    next(error);
  }
};

export const impersonateHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(
      res,
      await service.impersonateHotelOwner(getParam(req.params.id), req.body as ImpersonateInput, viewer(req), {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      }),
      'Impersonation started'
    );
  } catch (error) {
    next(error);
  }
};

export const endImpersonation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.endImpersonation(getParam(req.params.id), viewer(req));
    sendSuccess(res, undefined, 'Impersonation ended');
  } catch (error) {
    next(error);
  }
};

export const profile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformProfile(viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const settings = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, service.getPlatformSettings());
  } catch (error) {
    next(error);
  }
};

export const notifications = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getPlatformNotifications());
  } catch (error) {
    next(error);
  }
};
