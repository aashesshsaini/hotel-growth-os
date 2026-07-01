import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { getParam } from '../../utils/params';
import { sendCreated, sendSuccess } from '../../utils/response';
import * as service from './festivalCampaigns.service';
import {
  AnalyticsQuery,
  CampaignCreateInput,
  CampaignListQuery,
  CampaignUpdateInput,
  FestivalCreateInput,
  FestivalUpdateInput,
  HistoryQuery,
  ListQuery,
  SettingsInput,
  TemplateCreateInput,
  TemplateListQuery,
  TemplateUpdateInput,
  TestCampaignInput,
} from './festivalCampaigns.validation';

const viewer = (req: AuthRequest) => ({ userId: req.user!.userId, role: req.user!.role, hotelId: req.hotelId });

export const dashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.getDashboard(viewer(req))); } catch (e) { next(e); }
};
export const analytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.getAnalytics(req.query as unknown as AnalyticsQuery, viewer(req))); } catch (e) { next(e); }
};
export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.getSettings(viewer(req))); } catch (e) { next(e); }
};
export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.updateSettings(req.body as SettingsInput, viewer(req)), 'Festival settings saved'); } catch (e) { next(e); }
};
export const pause = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.setPaused(true, viewer(req)), 'Festival automation paused'); } catch (e) { next(e); }
};
export const resume = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.setPaused(false, viewer(req)), 'Festival automation resumed'); } catch (e) { next(e); }
};
export const listFestivals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.listFestivals(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); }
};
export const createFestival = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendCreated(res, await service.createFestival(req.body as FestivalCreateInput, viewer(req)), 'Festival created'); } catch (e) { next(e); }
};
export const updateFestival = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.updateFestival(getParam(req.params.id), req.body as FestivalUpdateInput, viewer(req)), 'Festival updated'); } catch (e) { next(e); }
};
export const listTemplates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.listTemplates(req.query as unknown as TemplateListQuery, viewer(req))); } catch (e) { next(e); }
};
export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendCreated(res, await service.createTemplate(req.body as TemplateCreateInput, viewer(req)), 'Template created'); } catch (e) { next(e); }
};
export const updateTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.updateTemplate(getParam(req.params.id), req.body as TemplateUpdateInput, viewer(req)), 'Template updated'); } catch (e) { next(e); }
};
export const duplicateTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendCreated(res, await service.duplicateTemplate(getParam(req.params.id), req.body?.name, viewer(req)), 'Template duplicated'); } catch (e) { next(e); }
};
export const deleteTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await service.deleteTemplate(getParam(req.params.id), viewer(req)); sendSuccess(res, undefined, 'Template deleted'); } catch (e) { next(e); }
};
export const previewTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.previewTemplate(getParam(req.params.id), viewer(req))); } catch (e) { next(e); }
};
export const listCampaigns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.listCampaigns(req.query as unknown as CampaignListQuery, viewer(req))); } catch (e) { next(e); }
};
export const createCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendCreated(res, await service.createCampaign(req.body as CampaignCreateInput, viewer(req)), 'Campaign created'); } catch (e) { next(e); }
};
export const updateCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.updateCampaign(getParam(req.params.id), req.body as CampaignUpdateInput, viewer(req)), 'Campaign updated'); } catch (e) { next(e); }
};
export const deleteCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await service.deleteCampaign(getParam(req.params.id), viewer(req)); sendSuccess(res, undefined, 'Campaign deleted'); } catch (e) { next(e); }
};
export const duplicateCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendCreated(res, await service.duplicateCampaign(getParam(req.params.id), viewer(req)), 'Campaign duplicated'); } catch (e) { next(e); }
};
export const previewRecipients = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.previewRecipients(req.body, viewer(req))); } catch (e) { next(e); }
};
export const pauseCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.setCampaignStatus(getParam(req.params.id), 'paused', viewer(req)), 'Campaign paused'); } catch (e) { next(e); }
};
export const resumeCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.setCampaignStatus(getParam(req.params.id), 'running', viewer(req)), 'Campaign resumed'); } catch (e) { next(e); }
};
export const archiveCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.setCampaignStatus(getParam(req.params.id), 'archived', viewer(req)), 'Campaign archived'); } catch (e) { next(e); }
};
export const cancelCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.setCampaignStatus(getParam(req.params.id), 'cancelled', viewer(req)), 'Campaign cancelled'); } catch (e) { next(e); }
};
export const history = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.listHistory(req.query as unknown as HistoryQuery, viewer(req))); } catch (e) { next(e); }
};
export const retryFailed = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.retryFailed(viewer(req)), 'Failed messages queued for retry'); } catch (e) { next(e); }
};
export const testCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.sendTestCampaign(req.body as TestCampaignInput, viewer(req)), 'Test campaign simulated'); } catch (e) { next(e); }
};
export const exportCampaigns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { sendSuccess(res, await service.exportCampaigns(viewer(req)), 'Festival export ready'); } catch (e) { next(e); }
};
