import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { platformOnly } from '../../middlewares/platformMiddleware';
import { validate } from '../../validations/validate';
import * as controller from './platform.controller';
import {
  idParamSchema,
  impersonateSchema,
  platformHotelBulkActionSchema,
  platformHotelCreateSchema,
  platformHotelListQuerySchema,
  platformHotelResetPasswordSchema,
  platformHotelSendEmailSchema,
  platformHotelStatusSchema,
  platformHotelUpdateSchema,
  platformPlanCreateSchema,
  platformPlanListQuerySchema,
  platformPlanStatusSchema,
  platformPlanUpdateSchema,
  platformSubscriptionActionSchema,
  platformSubscriptionAssignSchema,
  platformSubscriptionListQuerySchema,
  platformInvoiceActionSchema,
  platformInvoiceGenerateSchema,
  platformInvoiceListQuerySchema,
  platformAnalyticsQuerySchema,
  platformTicketActionSchema,
  platformTicketCreateSchema,
  platformTicketListQuerySchema,
  platformIncidentListQuerySchema,
  platformSystemHealthQuerySchema,
} from './platform.validation';

const router = Router();

router.use(authMiddleware, platformOnly);

router.get('/dashboard', controller.dashboard);
router.get('/analytics', validate(platformAnalyticsQuerySchema, 'query'), controller.platformAnalytics);
router.get('/profile', controller.profile);
router.get('/settings', controller.settings);
router.get('/notifications', controller.notifications);

router.get('/hotels', validate(platformHotelListQuerySchema, 'query'), controller.listHotels);
router.post('/hotels', validate(platformHotelCreateSchema), controller.createHotel);
router.post('/hotels/bulk', validate(platformHotelBulkActionSchema), controller.bulkHotelAction);
router.get('/hotels/:id', validate(idParamSchema, 'params'), controller.getHotel);
router.patch('/hotels/:id', validate(idParamSchema, 'params'), validate(platformHotelUpdateSchema), controller.updateHotel);
router.patch('/hotels/:id/status', validate(idParamSchema, 'params'), validate(platformHotelStatusSchema), controller.updateHotelStatus);
router.delete('/hotels/:id', validate(idParamSchema, 'params'), controller.deleteHotel);
router.post('/hotels/:id/impersonate', validate(idParamSchema, 'params'), validate(impersonateSchema), controller.impersonateHotel);
router.post('/hotels/:id/reset-password', validate(idParamSchema, 'params'), validate(platformHotelResetPasswordSchema), controller.resetHotelOwnerPassword);
router.post('/hotels/:id/send-email', validate(idParamSchema, 'params'), validate(platformHotelSendEmailSchema), controller.sendHotelOwnerEmail);
router.get('/hotels/:id/export', validate(idParamSchema, 'params'), controller.exportHotel);
router.post('/impersonation/:id/end', validate(idParamSchema, 'params'), controller.endImpersonation);

router.get('/plans', validate(platformPlanListQuerySchema, 'query'), controller.listPlans);
router.post('/plans', validate(platformPlanCreateSchema), controller.createPlan);
router.patch('/plans/:id', validate(idParamSchema, 'params'), validate(platformPlanUpdateSchema), controller.updatePlan);
router.post('/plans/:id/duplicate', validate(idParamSchema, 'params'), controller.duplicatePlan);
router.patch('/plans/:id/status', validate(idParamSchema, 'params'), validate(platformPlanStatusSchema), controller.updatePlanStatus);
router.delete('/plans/:id', validate(idParamSchema, 'params'), controller.deletePlan);

router.get('/subscriptions', validate(platformSubscriptionListQuerySchema, 'query'), controller.listSubscriptions);
router.post('/subscriptions', validate(platformSubscriptionAssignSchema), controller.assignSubscription);
router.post('/subscriptions/:id/action', validate(idParamSchema, 'params'), validate(platformSubscriptionActionSchema), controller.subscriptionAction);

router.get('/billing/summary', controller.billingSummary);
router.get('/invoices', validate(platformInvoiceListQuerySchema, 'query'), controller.listInvoices);
router.post('/invoices/generate', validate(platformInvoiceGenerateSchema), controller.generateInvoice);
router.get('/invoices/:id', validate(idParamSchema, 'params'), controller.getInvoice);
router.post('/invoices/:id/action', validate(idParamSchema, 'params'), validate(platformInvoiceActionSchema), controller.invoiceAction);

router.get('/support/summary', controller.supportSummary);
router.get('/support/tickets', validate(platformTicketListQuerySchema, 'query'), controller.listTickets);
router.post('/support/tickets', validate(platformTicketCreateSchema), controller.createTicket);
router.get('/support/tickets/:id', validate(idParamSchema, 'params'), controller.getTicket);
router.post('/support/tickets/:id/action', validate(idParamSchema, 'params'), validate(platformTicketActionSchema), controller.ticketAction);

router.get('/system-health', validate(platformSystemHealthQuerySchema, 'query'), controller.systemHealth);
router.get('/system-health/incidents', validate(platformIncidentListQuerySchema, 'query'), controller.listSystemIncidents);
router.get('/system-health/incidents/:id', validate(idParamSchema, 'params'), controller.getSystemIncident);

export default router;
