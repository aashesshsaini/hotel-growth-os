import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { getParam } from '../../utils/params';
import { sendCreated, sendSuccess } from '../../utils/response';
import * as service from './reviewGrowth.service';
import {
  AnalyticsQuery,
  AutoSendToggleInput,
  DashboardQuery,
  DuplicateTemplateInput,
  ExportQuery,
  GoogleReviewUrlValidationInput,
  GuestReviewCreateInput,
  GuestReviewListQuery,
  InternalFeedbackAssignInput,
  InternalFeedbackCreateInput,
  InternalFeedbackListQuery,
  InternalFeedbackStatusInput,
  ReminderConfigurationInput,
  ReviewCampaignCreateInput,
  ReviewCampaignListQuery,
  ReviewCampaignUpdateInput,
  ReviewRequestCancelInput,
  ReviewRequestCreateInput,
  ReviewRequestListQuery,
  ReviewRequestSendInput,
  ReviewRequestStatusInput,
  ReviewSettingsInput,
  ReviewTemplateCreateInput,
  ReviewTemplateListQuery,
  ReviewTemplateUpdateInput,
} from './reviewGrowth.validation';

const viewer = (req: AuthRequest) => ({ userId: req.user!.userId, role: req.user!.role, hotelId: req.hotelId });

export const dashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getDashboard(req.query as unknown as DashboardQuery, viewer(req))); } catch (e) { next(e); }
};

export const analytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getAnalytics(req.query as unknown as AnalyticsQuery, viewer(req))); } catch (e) { next(e); }
};

export const exportReviews = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.exportReviews(req.query as unknown as ExportQuery, viewer(req)), 'Export ready'); } catch (e) { next(e); }
};

export const listCampaigns = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.listReviewCampaigns(req.query as unknown as ReviewCampaignListQuery, viewer(req))); } catch (e) { next(e); }
};

export const getCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getReviewCampaign(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};

export const createCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendCreated(res, await service.createReviewCampaign(req.body as ReviewCampaignCreateInput, viewer(req)), 'Campaign created'); } catch (e) { next(e); }
};

export const updateCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.updateReviewCampaign(getParam(req.params.id), req.body as ReviewCampaignUpdateInput, viewer(req))); } catch (e) { next(e); }
};

export const deleteCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await service.removeReviewCampaign(getParam(req.params.id), viewer(req)); sendSuccess(res, undefined, 'Campaign deleted'); } catch (e) { next(e); }
};

export const enableCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.setReviewCampaignActive(getParam(req.params.id), true, viewer(req)), 'Campaign enabled'); } catch (e) { next(e); }
};

export const disableCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.setReviewCampaignActive(getParam(req.params.id), false, viewer(req)), 'Campaign disabled'); } catch (e) { next(e); }
};

export const completeCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.markReviewCampaignOutcome(getParam(req.params.id), 'completed', viewer(req)), 'Campaign completed'); } catch (e) { next(e); }
};

export const failCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.markReviewCampaignOutcome(getParam(req.params.id), 'failed', viewer(req)), 'Campaign failed'); } catch (e) { next(e); }
};

export const listRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.listReviewRequests(req.query as unknown as ReviewRequestListQuery, viewer(req))); } catch (e) { next(e); }
};

export const getRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getReviewRequest(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};

export const requestHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getReviewRequestHistory(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};

export const createRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendCreated(res, await service.createReviewRequest(req.body as ReviewRequestCreateInput, viewer(req)), 'Review request created'); } catch (e) { next(e); }
};

export const sendRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.sendReviewRequest(getParam(req.params.id), req.body as ReviewRequestSendInput, viewer(req)), 'Review request sent'); } catch (e) { next(e); }
};

export const resendRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.resendReviewRequest(getParam(req.params.id), req.body as ReviewRequestSendInput, viewer(req)), 'Review request resent'); } catch (e) { next(e); }
};

export const cancelRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.cancelReviewRequest(getParam(req.params.id), req.body as ReviewRequestCancelInput, viewer(req)), 'Review request cancelled'); } catch (e) { next(e); }
};

export const updateRequestStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.updateReviewRequestStatus(getParam(req.params.id), req.body as ReviewRequestStatusInput, viewer(req))); } catch (e) { next(e); }
};

export const listTemplates = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.listReviewTemplates(req.query as unknown as ReviewTemplateListQuery, viewer(req))); } catch (e) { next(e); }
};

export const getTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getReviewTemplate(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendCreated(res, await service.createReviewTemplate(req.body as ReviewTemplateCreateInput, viewer(req)), 'Template created'); } catch (e) { next(e); }
};

export const updateTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.updateReviewTemplate(getParam(req.params.id), req.body as ReviewTemplateUpdateInput, viewer(req))); } catch (e) { next(e); }
};

export const deleteTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await service.removeReviewTemplate(getParam(req.params.id), viewer(req)); sendSuccess(res, undefined, 'Template deleted'); } catch (e) { next(e); }
};

export const duplicateTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendCreated(res, await service.duplicateReviewTemplate(getParam(req.params.id), req.body as DuplicateTemplateInput, viewer(req)), 'Template duplicated'); } catch (e) { next(e); }
};

export const setDefaultTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.setDefaultReviewTemplate(getParam(req.params.id), viewer(req)), 'Default template updated'); } catch (e) { next(e); }
};

export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getReviewSettings(req.query as { hotelId?: string }, viewer(req))); } catch (e) { next(e); }
};

export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.upsertReviewSettings(req.body as ReviewSettingsInput, viewer(req)), 'Settings updated'); } catch (e) { next(e); }
};

export const validateGoogleUrl = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.validateGoogleReviewUrl((req.body as GoogleReviewUrlValidationInput).url)); } catch (e) { next(e); }
};

export const toggleAutoSend = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.toggleAutoSend(req.body as AutoSendToggleInput, viewer(req)), 'Auto send updated'); } catch (e) { next(e); }
};

export const configureReminders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.configureReminders(req.body as ReminderConfigurationInput, viewer(req)), 'Reminder configuration updated'); } catch (e) { next(e); }
};

export const listFeedback = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.listInternalFeedback(req.query as unknown as InternalFeedbackListQuery, viewer(req))); } catch (e) { next(e); }
};

export const getFeedback = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getInternalFeedback(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};

export const submitFeedback = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendCreated(res, await service.createInternalFeedback(req.body as InternalFeedbackCreateInput, viewer(req)), 'Feedback submitted'); } catch (e) { next(e); }
};

export const assignFeedback = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.assignInternalFeedback(getParam(req.params.id), req.body as InternalFeedbackAssignInput, viewer(req)), 'Feedback assigned'); } catch (e) { next(e); }
};

export const updateFeedbackStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.updateInternalFeedbackStatus(getParam(req.params.id), req.body as InternalFeedbackStatusInput, viewer(req))); } catch (e) { next(e); }
};

export const resolveFeedback = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.resolveInternalFeedback(getParam(req.params.id), req.body as InternalFeedbackStatusInput, viewer(req)), 'Feedback resolved'); } catch (e) { next(e); }
};

export const listGuestReviews = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.listGuestReviews(req.query as unknown as GuestReviewListQuery, viewer(req))); } catch (e) { next(e); }
};

export const getGuestReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getGuestReview(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};

export const submitGuestReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendCreated(res, await service.createGuestReview(req.body as GuestReviewCreateInput, viewer(req)), 'Review submitted'); } catch (e) { next(e); }
};
