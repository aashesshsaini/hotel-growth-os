import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { getParam } from '../../utils/params';
import { sendSuccess } from '../../utils/response';
import * as service from './hotelIntegrations.service';
import { IntegrationType, IntegrationUpdateInput } from './hotelIntegrations.validation';

const viewer = (req: AuthRequest) => ({ userId: req.user!.userId, role: req.user!.role, hotelId: req.hotelId });

export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getIntegrationSettings(viewer(req))); } catch (e) { next(e); }
};

export const updateIntegration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.updateIntegration(getParam(req.params.type) as IntegrationType, req.body as IntegrationUpdateInput, viewer(req)), 'Integration updated'); } catch (e) { next(e); }
};

export const updateWhatsApp = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.updateIntegration('whatsapp', req.body as IntegrationUpdateInput, viewer(req)), 'WhatsApp integration updated'); } catch (e) { next(e); }
};

export const updateEmail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.updateIntegration('email', req.body as IntegrationUpdateInput, viewer(req)), 'Email integration updated'); } catch (e) { next(e); }
};

export const updateGoogleReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.updateIntegration('googleReview', req.body as IntegrationUpdateInput, viewer(req)), 'Google Review integration updated'); } catch (e) { next(e); }
};

export const testIntegration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.testIntegration(getParam(req.params.type) as IntegrationType, viewer(req)), 'Integration tested'); } catch (e) { next(e); }
};

export const disconnectIntegration = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.disconnectIntegration(getParam(req.params.type) as IntegrationType, viewer(req)), 'Integration disconnected'); } catch (e) { next(e); }
};

export const health = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { sendSuccess(res, await service.getIntegrationHealth(viewer(req))); } catch (e) { next(e); }
};
