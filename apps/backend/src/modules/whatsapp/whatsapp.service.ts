import { FilterQuery, Types } from 'mongoose';
import { IWhatsAppAutomationRule } from '../../models/WhatsAppAutomationRule';
import { WhatsAppMessage } from '../../models';
import { IWhatsAppMessage } from '../../models/WhatsAppMessage';
import { IWhatsAppTemplate } from '../../models/WhatsAppTemplate';
import { whatsappProvider } from '../../services/whatsapp.service';
import { addWhatsAppJob } from '../../services/queue.service';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
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
import {
  SanitizedWhatsAppAutomationRule,
  SanitizedWhatsAppMessage,
  SanitizedWhatsAppTemplate,
  ViewerContext,
  WhatsAppStatsResult,
} from './whatsapp.types';
import {
  createAuditLogRepository,
  createWhatsAppAutomationRuleRepository,
  createWhatsAppMessageRepository,
  createWhatsAppTemplateRepository,
  findActiveAutomationRulesByTriggerRepository,
  findConversationMessagesRepository,
  findConversationsRepository,
  findGuestByPhoneRepository,
  findScheduledMessagesRepository,
  findWhatsAppAutomationRuleByIdRepository,
  findWhatsAppAutomationRulesRepository,
  findWhatsAppMessageByIdRepository,
  findWhatsAppMessagesRepository,
  findWhatsAppTemplateByIdRepository,
  findWhatsAppTemplatesRepository,
  getWhatsAppStatsRepository,
  markConversationReadRepository,
  seedDefaultAutomationRulesRepository,
  seedDefaultTemplatesRepository,
  softDeleteWhatsAppMessageRepository,
  updateWhatsAppAutomationRuleRepository,
  updateWhatsAppMessageRepository,
  updateWhatsAppTemplateRepository,
} from './whatsapp.repository';

const WHATSAPP_VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];
const WHATSAPP_MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) throw new ValidationError('Hotel ID is required');
  return resolved;
};

const assertHotelAccess = (viewer: ViewerContext, hotelId: string): void => {
  if (viewer.role !== 'super_admin' && viewer.hotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const assertCanView = (viewer: ViewerContext): void => {
  if (!WHATSAPP_VIEW_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to view WhatsApp messages');
  }
};

const assertCanManage = (viewer: ViewerContext): void => {
  if (!WHATSAPP_MANAGE_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to manage WhatsApp messages');
  }
};

const sanitizeMessage = (message: IWhatsAppMessage): SanitizedWhatsAppMessage => {
  const doc = message.toObject ? message.toObject() : message;
  const guest = doc.guestId as Record<string, unknown> | undefined;
  return {
    ...doc,
    id: doc._id?.toString(),
    guest:
      guest && typeof guest === 'object' && guest._id
        ? {
            id: String(guest._id),
            fullName: String(guest.fullName || guest.name || ''),
            phone: guest.phone ? String(guest.phone) : undefined,
          }
        : undefined,
  };
};

const sanitizeTemplate = (template: IWhatsAppTemplate): SanitizedWhatsAppTemplate => {
  const doc = template.toObject ? template.toObject() : template;
  return { ...doc, id: doc._id?.toString() };
};

const sanitizeRule = (rule: IWhatsAppAutomationRule): SanitizedWhatsAppAutomationRule => {
  const doc = rule.toObject ? rule.toObject() : rule;
  const template = doc.templateId as IWhatsAppTemplate | undefined;
  return {
    ...doc,
    id: doc._id?.toString(),
    template: template && template._id ? sanitizeTemplate(template) : undefined,
  };
};

const buildMessageFilter = (query: ListWhatsAppMessagesQuery, hotelId: string): FilterQuery<IWhatsAppMessage> => {
  const filter: FilterQuery<IWhatsAppMessage> = { hotelId };
  if (query.status) filter.status = query.status;
  if (query.direction) filter.direction = query.direction;
  if (query.messageType) filter.messageType = query.messageType;
  if (query.phone) filter.phone = { $regex: query.phone.replace(/\D/g, '').slice(-10) };
  if (query.guestId) filter.guestId = query.guestId;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.automationTrigger) filter.automationTrigger = query.automationTrigger;
  if (query.scheduled) filter.status = 'scheduled';
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }
  return filter;
};

const getMessageOrThrow = async (id: string, viewer: ViewerContext): Promise<IWhatsAppMessage> => {
  const message = await findWhatsAppMessageByIdRepository(id);
  if (!message) throw new NotFoundError('WhatsApp message not found');
  assertHotelAccess(viewer, message.hotelId.toString());
  return message;
};

const resolveGuestLink = async (hotelId: string, phone: string, guestId?: string) => {
  if (guestId) return guestId;
  const guest = await findGuestByPhoneRepository(hotelId, phone);
  return guest?._id?.toString();
};

const deliverMessage = async (message: IWhatsAppMessage): Promise<IWhatsAppMessage> => {
  const result = await whatsappProvider.sendMessage({
    phone: message.phone,
    content: message.content,
    messageType: message.messageType,
    templateName: message.templateName,
    templateLanguage: message.templateLanguage,
    mediaUrl: message.mediaUrl,
  });

  if (!result.success) {
    message.status = 'failed';
    message.failedAt = new Date();
    message.failureReason = result.error || 'Delivery failed';
    message.retryCount = (message.retryCount ?? 0) + 1;
    await updateWhatsAppMessageRepository(message);
    return message;
  }

  const now = new Date();
  message.whatsappMessageId = result.whatsappMessageId;
  message.status = 'sent';
  message.sentAt = now;
  message.metadata = { ...(message.metadata ?? {}), simulated: result.simulated };
  await updateWhatsAppMessageRepository(message);

  message.status = 'delivered';
  message.deliveredAt = new Date();
  await updateWhatsAppMessageRepository(message);
  return message;
};

const createOutgoingMessage = async (
  hotelId: string,
  viewer: ViewerContext,
  input: SendWhatsAppMessageInput & { scheduledAt?: Date; status?: IWhatsAppMessage['status'] }
): Promise<IWhatsAppMessage> => {
  const guestId = await resolveGuestLink(hotelId, input.phone, input.guestId);
  const message = await createWhatsAppMessageRepository({
    hotelId,
    phone: input.phone,
    content: input.content,
    direction: 'outgoing',
    messageType: input.messageType ?? (input.templateName ? 'template' : 'text'),
    status: input.scheduledAt ? 'scheduled' : input.status ?? 'queued',
    guestId,
    leadId: input.leadId,
    enquiryId: input.enquiryId,
    bookingId: input.bookingId,
    campaignId: input.campaignId,
    taskId: input.taskId,
    assignedTo: input.assignedTo,
    mediaUrl: input.mediaUrl,
    templateName: input.templateName,
    templateLanguage: input.templateLanguage,
    automationTrigger: input.automationTrigger,
    scheduledAt: input.scheduledAt,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });

  if (!input.scheduledAt) {
    await addWhatsAppJob('send-message', { messageId: message._id.toString(), hotelId });
    return deliverMessage(message);
  }

  return message;
};

export const list = async (query: ListWhatsAppMessagesQuery, viewer: ViewerContext) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const result = await findWhatsAppMessagesRepository(buildMessageFilter(query, hotelId), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['phone', 'content', 'templateName'],
    sortBy: query.sortBy ?? 'createdAt',
    sortOrder: query.sortOrder ?? 'desc',
  });
  return { ...result, data: result.data.map(sanitizeMessage) };
};

export const stats = async (viewer: ViewerContext, hotelIdInput?: string): Promise<WhatsAppStatsResult> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(hotelIdInput, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  await seedDefaultTemplatesRepository(hotelId, viewer.userId);
  await seedDefaultAutomationRulesRepository(hotelId, viewer.userId);
  return getWhatsAppStatsRepository(hotelId);
};

export const getById = async (id: string, viewer: ViewerContext): Promise<SanitizedWhatsAppMessage> => {
  assertCanView(viewer);
  const message = await getMessageOrThrow(id, viewer);
  return sanitizeMessage(message);
};

export const create = async (input: CreateWhatsAppMessageInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const guestId = await resolveGuestLink(hotelId, input.phone, input.guestId);
  const message = await createWhatsAppMessageRepository({
    hotelId,
    ...input,
    guestId,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  return sanitizeMessage(message);
};

export const update = async (id: string, input: UpdateWhatsAppMessageInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const message = await getMessageOrThrow(id, viewer);
  Object.assign(message, input, { updatedBy: viewer.userId });
  await updateWhatsAppMessageRepository(message);
  return sanitizeMessage(message);
};

export const remove = async (id: string, viewer: ViewerContext): Promise<void> => {
  assertCanManage(viewer);
  await getMessageOrThrow(id, viewer);
  await softDeleteWhatsAppMessageRepository(id, viewer.userId);
};

export const conversations = async (query: ListConversationsQuery, viewer: ViewerContext) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(undefined, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  return findConversationsRepository(hotelId, {
    page: query.page,
    limit: query.limit,
    search: query.search,
  }, {
    status: query.status,
    direction: query.direction,
    assignedTo: query.assignedTo,
    from: query.from,
    to: query.to,
  });
};

export const conversationThread = async (phone: string, viewer: ViewerContext) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(undefined, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  await markConversationReadRepository(hotelId, phone);
  const messages = await findConversationMessagesRepository(hotelId, phone);
  return messages.map(sanitizeMessage);
};

export const send = async (input: SendWhatsAppMessageInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(undefined, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const message = await createOutgoingMessage(hotelId, viewer, input);
  await createAuditLogRepository({
    hotelId,
    userId: viewer.userId,
    action: 'whatsapp.sent',
    entity: 'WhatsAppMessage',
    entityId: message._id,
  });
  return sanitizeMessage(message);
};

export const schedule = async (input: ScheduleWhatsAppMessageInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(undefined, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  if (input.scheduledAt <= new Date()) {
    throw new ValidationError('Scheduled time must be in the future');
  }
  const message = await createOutgoingMessage(hotelId, viewer, input);
  return sanitizeMessage(message);
};

export const broadcast = async (input: BroadcastWhatsAppMessageInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(undefined, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const results = [];
  for (const phone of input.phones) {
    const message = await createOutgoingMessage(hotelId, viewer, {
      phone,
      content: input.content,
      messageType: input.messageType,
      templateName: input.templateName,
      templateLanguage: input.templateLanguage,
      automationTrigger: input.automationTrigger ?? 'campaign_broadcast',
      campaignId: input.campaignId,
    });
    results.push(sanitizeMessage(message));
  }
  return { sent: results.length, messages: results };
};

export const retry = async (id: string, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const message = await getMessageOrThrow(id, viewer);
  if (message.status !== 'failed') {
    throw new ValidationError('Only failed messages can be retried');
  }
  message.status = 'queued';
  message.failureReason = undefined;
  message.updatedBy = new Types.ObjectId(viewer.userId);
  await updateWhatsAppMessageRepository(message);
  const delivered = await deliverMessage(message);
  return sanitizeMessage(delivered);
};

export const listTemplates = async (query: ListWhatsAppMessagesQuery, viewer: ViewerContext) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(undefined, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  await seedDefaultTemplatesRepository(hotelId, viewer.userId);
  const result = await findWhatsAppTemplatesRepository(hotelId, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    sortBy: query.sortBy ?? 'createdAt',
    sortOrder: query.sortOrder ?? 'desc',
  });
  return { ...result, data: result.data.map(sanitizeTemplate) };
};

export const createTemplate = async (input: CreateWhatsAppTemplateInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(undefined, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const template = await createWhatsAppTemplateRepository({
    hotelId,
    ...input,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  return sanitizeTemplate(template);
};

export const updateTemplate = async (id: string, input: UpdateWhatsAppTemplateInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const template = await findWhatsAppTemplateByIdRepository(id);
  if (!template) throw new NotFoundError('WhatsApp template not found');
  assertHotelAccess(viewer, template.hotelId.toString());
  Object.assign(template, input, { updatedBy: viewer.userId });
  await updateWhatsAppTemplateRepository(template);
  return sanitizeTemplate(template);
};

export const listAutomationRules = async (query: ListWhatsAppMessagesQuery, viewer: ViewerContext) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(undefined, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  await seedDefaultAutomationRulesRepository(hotelId, viewer.userId);
  const result = await findWhatsAppAutomationRulesRepository(hotelId, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    sortBy: query.sortBy ?? 'createdAt',
    sortOrder: query.sortOrder ?? 'desc',
  });
  return { ...result, data: result.data.map(sanitizeRule) };
};

export const createAutomationRule = async (
  input: CreateWhatsAppAutomationRuleInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(undefined, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const rule = await createWhatsAppAutomationRuleRepository({
    hotelId,
    ...input,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  return sanitizeRule(rule);
};

export const updateAutomationRule = async (
  id: string,
  input: UpdateWhatsAppAutomationRuleInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const rule = await findWhatsAppAutomationRuleByIdRepository(id);
  if (!rule) throw new NotFoundError('WhatsApp automation rule not found');
  assertHotelAccess(viewer, rule.hotelId.toString());
  Object.assign(rule, input, { updatedBy: viewer.userId });
  await updateWhatsAppAutomationRuleRepository(rule);
  return sanitizeRule(rule);
};

export const processWebhook = async (
  hotelId: string | undefined,
  payload: Record<string, unknown>
): Promise<{ processed: number }> => {
  if (!hotelId) return { processed: 0 };
  const entry = (payload.entry as Array<Record<string, unknown>> | undefined)?.[0];
  const changes = (entry?.changes as Array<Record<string, unknown>> | undefined)?.[0];
  const value = (changes?.value as Record<string, unknown> | undefined) ?? {};
  const messages = (value.messages as Array<Record<string, unknown>> | undefined) ?? [];
  const statuses = (value.statuses as Array<Record<string, unknown>> | undefined) ?? [];

  let processed = 0;

  for (const incoming of messages) {
    const phone = String(incoming.from ?? '');
    const text = ((incoming.text as Record<string, unknown> | undefined)?.body as string) ?? '[Media message]';
    const guestId = (await findGuestByPhoneRepository(hotelId, phone))?._id;
    await createWhatsAppMessageRepository({
      hotelId,
      phone,
      content: text,
      direction: 'incoming',
      messageType: 'text',
      status: 'received',
      guestId,
      whatsappMessageId: incoming.id ? String(incoming.id) : undefined,
    });
    processed += 1;

    const rules = await findActiveAutomationRulesByTriggerRepository(hotelId, 'auto_reply');
    for (const rule of rules) {
      const populatedTemplate =
        rule.templateId && typeof rule.templateId === 'object' && 'body' in rule.templateId
          ? (rule.templateId as unknown as IWhatsAppTemplate)
          : undefined;
      const content =
        rule.messageType === 'template' && populatedTemplate
          ? populatedTemplate.body ?? rule.messageContent ?? 'Thank you for contacting us.'
          : rule.messageContent ?? 'Thank you for contacting us.';
      await createWhatsAppMessageRepository({
        hotelId,
        phone,
        content,
        direction: 'outgoing',
        messageType: rule.messageType === 'template' ? 'template' : 'text',
        status: 'queued',
        guestId,
        automationTrigger: rule.trigger,
        templateName: populatedTemplate?.name,
        createdBy: rule.createdBy,
        updatedBy: rule.updatedBy,
      });
      rule.stats.triggered += 1;
      rule.stats.sent += 1;
      await updateWhatsAppAutomationRuleRepository(rule);
    }
  }

  for (const statusUpdate of statuses) {
    const whatsappMessageId = statusUpdate.id ? String(statusUpdate.id) : undefined;
    if (!whatsappMessageId) continue;
    const existing = await WhatsAppMessage.findOne({ hotelId, whatsappMessageId, isDeleted: { $ne: true } });
    if (!existing) continue;
    const status = String(statusUpdate.status ?? '');
    if (status === 'sent') existing.status = 'sent';
    if (status === 'delivered') {
      existing.status = 'delivered';
      existing.deliveredAt = new Date();
    }
    if (status === 'read') {
      existing.status = 'read';
      existing.readAt = new Date();
    }
    if (status === 'failed') {
      existing.status = 'failed';
      existing.failedAt = new Date();
      existing.failureReason = String(
        (statusUpdate.errors as Array<Record<string, unknown>> | undefined)?.[0]?.title ?? 'Delivery failed'
      );
    }
    await updateWhatsAppMessageRepository(existing);
    processed += 1;
  }

  return { processed };
};

export const verifyWebhook = (mode?: string, token?: string, challenge?: string): string | null =>
  whatsappProvider.verifyWebhook(mode, token, challenge);

export const getIntegrationStatus = () => ({
  configured: whatsappProvider.isConfigured(),
  provider: 'meta_whatsapp_cloud_api',
});

export const processDueScheduledMessages = async (hotelId: string, viewer: ViewerContext) => {
  assertCanManage(viewer);
  assertHotelAccess(viewer, hotelId);
  const due = await findScheduledMessagesRepository(hotelId);
  const results = [];
  for (const message of due) {
    message.status = 'queued';
    await updateWhatsAppMessageRepository(message);
    const delivered = await deliverMessage(message);
    results.push(sanitizeMessage(delivered));
  }
  return results;
};
