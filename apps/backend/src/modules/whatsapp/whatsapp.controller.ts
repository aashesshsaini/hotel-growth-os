import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import { getParam } from '../../utils/params';
import * as service from './whatsapp.service';
import {
  BroadcastWhatsAppMessageInput,
  CreateWhatsAppAutomationRuleInput,
  CreateWhatsAppMessageInput,
  CreateWhatsAppTemplateInput,
  ListConversationsQuery,
  ListWhatsAppMessagesQuery,
  ScheduleWhatsAppMessageInput,
  SendWhatsAppMessageInput,
  UpdateWhatsAppAutomationRuleInput,
  UpdateWhatsAppMessageInput,
  UpdateWhatsAppTemplateInput,
} from './whatsapp.validation';

const viewer = (req: AuthRequest) => ({
  userId: req.user!.userId,
  role: req.user!.role,
  hotelId: req.hotelId,
});

export const verifyWebhook = (req: Request, res: Response): void => {
  const challenge = service.verifyWebhook(
    req.query['hub.mode'] as string | undefined,
    req.query['hub.verify_token'] as string | undefined,
    req.query['hub.challenge'] as string | undefined
  );
  if (challenge !== null) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
};

export const processWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotelId = req.query.hotelId as string | undefined;
    const result = await service.processWebhook(hotelId, req.body as Record<string, unknown>);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.list(req.query as unknown as ListWhatsAppMessagesQuery, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const stats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.stats(viewer(req), req.hotelId));
  } catch (error) {
    next(error);
  }
};

export const integrationStatus = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, service.getIntegrationStatus());
  } catch (error) {
    next(error);
  }
};

export const conversations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.conversations(req.query as unknown as ListConversationsQuery, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const conversationThread = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.conversationThread(getParam(req.params.phone), viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.getById(getParam(req.params.id), viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.create(req.body as CreateWhatsAppMessageInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.update(getParam(req.params.id), req.body as UpdateWhatsAppMessageInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await service.remove(getParam(req.params.id), viewer(req));
    sendSuccess(res, undefined, 'Deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.send(req.body as SendWhatsAppMessageInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const scheduleMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.schedule(req.body as ScheduleWhatsAppMessageInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const broadcastMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.broadcast(req.body as BroadcastWhatsAppMessageInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const retryMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.retry(getParam(req.params.id), viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const listTemplates = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.listTemplates(req.query as unknown as ListWhatsAppMessagesQuery, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.createTemplate(req.body as CreateWhatsAppTemplateInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.updateTemplate(getParam(req.params.id), req.body as UpdateWhatsAppTemplateInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const listAutomationRules = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.listAutomationRules(req.query as unknown as ListWhatsAppMessagesQuery, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const createAutomationRule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendCreated(res, await service.createAutomationRule(req.body as CreateWhatsAppAutomationRuleInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const updateAutomationRule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.updateAutomationRule(getParam(req.params.id), req.body as UpdateWhatsAppAutomationRuleInput, viewer(req)));
  } catch (error) {
    next(error);
  }
};

export const processScheduled = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await service.processDueScheduledMessages(req.hotelId!, viewer(req)));
  } catch (error) {
    next(error);
  }
};
