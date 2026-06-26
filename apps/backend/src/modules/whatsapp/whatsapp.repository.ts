import { FilterQuery, PipelineStage, Types } from 'mongoose';
import {
  AuditLog,
  Guest,
  WhatsAppAutomationRule,
  WhatsAppMessage,
  WhatsAppTemplate,
} from '../../models';
import { IWhatsAppAutomationRule } from '../../models/WhatsAppAutomationRule';
import { IWhatsAppMessage } from '../../models/WhatsAppMessage';
import { IWhatsAppTemplate } from '../../models/WhatsAppTemplate';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { WhatsAppConversationSummary, WhatsAppStatsResult } from './whatsapp.types';

export const findWhatsAppMessagesRepository = async (
  baseFilter: FilterQuery<IWhatsAppMessage>,
  options: PaginationOptions
) => {
  const result = await paginate(WhatsAppMessage, options, baseFilter);
  await WhatsAppMessage.populate(result.data, [
    { path: 'guestId', select: 'fullName name phone email' },
    { path: 'assignedTo', select: 'name email role' },
    { path: 'leadId', select: 'fullName phone leadNumber' },
    { path: 'bookingId', select: 'bookingNumber status' },
  ]);
  return result;
};

export const findWhatsAppMessageByIdRepository = async (id: string) => {
  return WhatsAppMessage.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate('guestId', 'fullName name phone email')
    .populate('assignedTo', 'name email role')
    .populate('leadId', 'fullName phone leadNumber')
    .populate('enquiryId', 'guestName phone status')
    .populate('bookingId', 'bookingNumber status checkInDate checkOutDate')
    .populate('campaignId', 'name campaignNumber status');
};

export const createWhatsAppMessageRepository = async (data: Record<string, unknown>) =>
  WhatsAppMessage.create(data);

export const updateWhatsAppMessageRepository = async (message: IWhatsAppMessage) => {
  await message.save();
  return message;
};

export const softDeleteWhatsAppMessageRepository = async (id: string, deletedBy: string) => {
  await WhatsAppMessage.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy,
    updatedBy: deletedBy,
  });
};

export const findGuestByPhoneRepository = async (hotelId: string, phone: string) => {
  const normalized = phone.replace(/\D/g, '').slice(-10);
  return Guest.findOne({
    hotelId,
    isDeleted: { $ne: true },
    $or: [{ phone: { $regex: normalized } }, { alternatePhone: { $regex: normalized } }],
  }).select('_id fullName name phone email whatsappConsent');
};

export const findConversationMessagesRepository = async (
  hotelId: string,
  phone: string,
  limit = 100
) => {
  const normalized = phone.replace(/\D/g, '');
  return WhatsAppMessage.find({
    hotelId,
    isDeleted: { $ne: true },
    phone: { $regex: normalized.slice(-10) },
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('guestId', 'fullName name phone')
    .populate('assignedTo', 'name email');
};

export const findConversationsRepository = async (
  hotelId: string,
  options: PaginationOptions,
  filters: { status?: string; direction?: string; assignedTo?: string; from?: Date; to?: Date } = {}
) => {
  const match: Record<string, unknown> = { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } };
  if (filters.status) match.status = filters.status;
  if (filters.direction) match.direction = filters.direction;
  if (filters.assignedTo) match.assignedTo = new Types.ObjectId(filters.assignedTo);
  if (filters.from || filters.to) {
    match.createdAt = {};
    if (filters.from) (match.createdAt as Record<string, Date>).$gte = filters.from;
    if (filters.to) (match.createdAt as Record<string, Date>).$lte = filters.to;
  }

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { createdAt: -1 as const } },
    {
      $group: {
        _id: '$phone',
        phone: { $first: '$phone' },
        guestId: { $first: '$guestId' },
        assignedTo: { $first: '$assignedTo' },
        lastMessage: { $first: '$content' },
        lastMessageAt: { $first: '$createdAt' },
        lastDirection: { $first: '$direction' },
        lastStatus: { $first: '$status' },
        messageCount: { $sum: 1 },
        unreadCount: {
          $sum: {
            $cond: [{ $and: [{ $eq: ['$direction', 'incoming'] }, { $ne: ['$status', 'read'] }] }, 1, 0],
          },
        },
      },
    },
    { $sort: { lastMessageAt: -1 as const } },
  ];

  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const skip = (page - 1) * limit;

  const [rows, totalAgg] = await Promise.all([
    WhatsAppMessage.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
    WhatsAppMessage.aggregate([...pipeline, { $count: 'total' }]),
  ]);

  const guestIds = rows.filter((row) => row.guestId).map((row) => row.guestId);
  const guests = guestIds.length
    ? await Guest.find({ _id: { $in: guestIds } }).select('_id fullName name phone').lean()
    : [];
  const guestMap = new Map(guests.map((guest) => [String(guest._id), guest]));

  const data: WhatsAppConversationSummary[] = rows.map((row) => {
    const guest = row.guestId ? guestMap.get(String(row.guestId)) : undefined;
    return {
      phone: row.phone,
      guestId: row.guestId ? String(row.guestId) : undefined,
      guestName: guest?.fullName || guest?.name,
      lastMessage: row.lastMessage,
      lastMessageAt: row.lastMessageAt,
      lastDirection: row.lastDirection,
      lastStatus: row.lastStatus,
      unreadCount: row.unreadCount ?? 0,
      messageCount: row.messageCount ?? 0,
      assignedTo: row.assignedTo ? String(row.assignedTo) : undefined,
    };
  });

  const total = totalAgg[0]?.total ?? 0;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getWhatsAppStatsRepository = async (hotelId: string): Promise<WhatsAppStatsResult> => {
  const baseFilter = { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } };
  const [
    statusAgg,
    typeAgg,
    triggerAgg,
    incomingMessages,
    outgoingMessages,
    scheduledMessages,
    queuedMessages,
    activeConversationsAgg,
    activeTemplates,
    activeAutomationRules,
  ] = await Promise.all([
    WhatsAppMessage.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    WhatsAppMessage.aggregate([{ $match: baseFilter }, { $group: { _id: '$messageType', count: { $sum: 1 } } }]),
    WhatsAppMessage.aggregate([
      { $match: { ...baseFilter, automationTrigger: { $exists: true, $ne: null } } },
      { $group: { _id: '$automationTrigger', count: { $sum: 1 } } },
    ]),
    WhatsAppMessage.countDocuments({ ...baseFilter, direction: 'incoming' }),
    WhatsAppMessage.countDocuments({ ...baseFilter, direction: 'outgoing' }),
    WhatsAppMessage.countDocuments({ ...baseFilter, status: 'scheduled' }),
    WhatsAppMessage.countDocuments({ ...baseFilter, status: 'queued' }),
    WhatsAppMessage.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$phone' } },
      { $count: 'total' },
    ]),
    WhatsAppTemplate.countDocuments({ hotelId, isDeleted: { $ne: true }, isActive: true }),
    WhatsAppAutomationRule.countDocuments({ hotelId, isDeleted: { $ne: true }, isActive: true }),
  ]);

  const byStatus = statusAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});

  const totalMessages = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
  const sentMessages = (byStatus.sent ?? 0) + (byStatus.delivered ?? 0) + (byStatus.read ?? 0);
  const deliveredMessages = (byStatus.delivered ?? 0) + (byStatus.read ?? 0);
  const readMessages = byStatus.read ?? 0;
  const failedMessages = byStatus.failed ?? 0;
  const outgoingSentBase = sentMessages || outgoingMessages || 1;

  const phonesWithIncoming = await WhatsAppMessage.distinct('phone', { ...baseFilter, direction: 'incoming' });
  const phonesWithOutgoingReply = phonesWithIncoming.length
    ? await WhatsAppMessage.distinct('phone', {
        ...baseFilter,
        direction: 'outgoing',
        phone: { $in: phonesWithIncoming },
      })
    : [];

  return {
    totalMessages,
    incomingMessages,
    outgoingMessages,
    sentMessages,
    deliveredMessages,
    readMessages,
    failedMessages,
    scheduledMessages,
    queuedMessages,
    deliveryRate: sentMessages > 0 ? Math.round((deliveredMessages / sentMessages) * 100) : 0,
    readRate: deliveredMessages > 0 ? Math.round((readMessages / deliveredMessages) * 100) : 0,
    replyRate:
      phonesWithIncoming.length > 0
        ? Math.round((phonesWithOutgoingReply.length / phonesWithIncoming.length) * 100)
        : 0,
    automationSuccessRate:
      outgoingSentBase > 0 ? Math.round(((outgoingSentBase - failedMessages) / outgoingSentBase) * 100) : 0,
    activeConversations: activeConversationsAgg[0]?.total ?? 0,
    activeTemplates,
    activeAutomationRules,
    byStatus,
    byType: typeAgg.reduce<Record<string, number>>((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
    byTrigger: triggerAgg.reduce<Record<string, number>>((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
  };
};

export const findWhatsAppTemplatesRepository = async (
  hotelId: string,
  options: PaginationOptions
): Promise<PaginatedResponse<IWhatsAppTemplate>> => {
  return paginate(WhatsAppTemplate, { ...options, searchFields: options.searchFields ?? ['name', 'body', 'category'] }, { hotelId });
};

export const findWhatsAppTemplateByIdRepository = async (id: string) => {
  return WhatsAppTemplate.findOne({ _id: id, isDeleted: { $ne: true } });
};

export const createWhatsAppTemplateRepository = async (data: Record<string, unknown>) =>
  WhatsAppTemplate.create(data);

export const updateWhatsAppTemplateRepository = async (template: IWhatsAppTemplate) => {
  await template.save();
  return template;
};

export const findWhatsAppAutomationRulesRepository = async (
  hotelId: string,
  options: PaginationOptions
): Promise<PaginatedResponse<IWhatsAppAutomationRule>> => {
  const result = await paginate(
    WhatsAppAutomationRule,
    { ...options, searchFields: options.searchFields ?? ['name', 'description', 'trigger'] },
    { hotelId }
  );
  await WhatsAppAutomationRule.populate(result.data, [
    { path: 'templateId' },
    { path: 'assignedTo', select: 'name email role' },
  ]);
  return result;
};

export const findWhatsAppAutomationRuleByIdRepository = async (id: string) => {
  return WhatsAppAutomationRule.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate('templateId')
    .populate('assignedTo', 'name email role');
};

export const createWhatsAppAutomationRuleRepository = async (data: Record<string, unknown>) =>
  WhatsAppAutomationRule.create(data);

export const updateWhatsAppAutomationRuleRepository = async (rule: IWhatsAppAutomationRule) => {
  await rule.save();
  return rule;
};

export const findActiveAutomationRulesByTriggerRepository = async (
  hotelId: string,
  trigger: string
) => {
  return WhatsAppAutomationRule.find({
    hotelId,
    trigger,
    isActive: true,
    isDeleted: { $ne: true },
  }).populate('templateId');
};

export const createAuditLogRepository = async (payload: Record<string, unknown>) => AuditLog.create(payload);

export const markConversationReadRepository = async (hotelId: string, phone: string) => {
  const normalized = phone.replace(/\D/g, '').slice(-10);
  await WhatsAppMessage.updateMany(
    {
      hotelId,
      phone: { $regex: normalized },
      direction: 'incoming',
      status: { $ne: 'read' },
      isDeleted: { $ne: true },
    },
    { $set: { status: 'read', readAt: new Date() } }
  );
};

export const findScheduledMessagesRepository = async (hotelId: string, before = new Date()) => {
  return WhatsAppMessage.find({
    hotelId,
    status: 'scheduled',
    scheduledAt: { $lte: before },
    isDeleted: { $ne: true },
  }).limit(100);
};

export const seedDefaultTemplatesRepository = async (hotelId: string, userId: string) => {
  const count = await WhatsAppTemplate.countDocuments({ hotelId });
  if (count > 0) return;
  const defaults = [
    {
      name: 'booking_confirmation',
      category: 'UTILITY',
      body: 'Dear {{guestName}}, your booking {{bookingNumber}} is confirmed. Check-in: {{checkInDate}}. We look forward to hosting you!',
    },
    {
      name: 'booking_reminder',
      category: 'UTILITY',
      body: 'Reminder: Your stay at our hotel begins on {{checkInDate}}. Reply if you need early check-in or airport pickup.',
    },
    {
      name: 'payment_reminder',
      category: 'UTILITY',
      body: 'Hello {{guestName}}, this is a friendly reminder for pending payment of {{amount}} for booking {{bookingNumber}}.',
    },
    {
      name: 'review_request',
      category: 'MARKETING',
      body: 'Thank you for staying with us! We would love your feedback. Please share your experience: {{reviewLink}}',
    },
    {
      name: 'welcome_message',
      category: 'MARKETING',
      body: 'Welcome to our hotel! How can we assist you today?',
    },
  ];
  await WhatsAppTemplate.insertMany(
    defaults.map((item) => ({
      hotelId,
      ...item,
      status: 'approved',
      isActive: true,
      createdBy: userId,
      updatedBy: userId,
    }))
  );
};

export const seedDefaultAutomationRulesRepository = async (hotelId: string, userId: string) => {
  const count = await WhatsAppAutomationRule.countDocuments({ hotelId });
  if (count > 0) return;
  const templates = await WhatsAppTemplate.find({ hotelId }).lean();
  const templateByName = new Map(templates.map((template) => [template.name, template._id]));
  const defaults = [
    { name: 'Welcome Message', trigger: 'welcome_message', templateName: 'welcome_message' },
    { name: 'Booking Confirmation', trigger: 'booking_confirmation', templateName: 'booking_confirmation' },
    { name: 'Booking Reminder', trigger: 'booking_reminder', templateName: 'booking_reminder' },
    { name: 'Payment Reminder', trigger: 'payment_reminder', templateName: 'payment_reminder' },
    { name: 'Review Request', trigger: 'review_request', templateName: 'review_request' },
    { name: 'Lead Follow-up', trigger: 'lead_follow_up', messageContent: 'Thank you for your interest! Our team will assist you shortly.' },
    { name: 'Enquiry Auto Reply', trigger: 'enquiry_response', messageContent: 'We received your enquiry and will respond soon.' },
  ];
  await WhatsAppAutomationRule.insertMany(
    defaults.map((item) => ({
      hotelId,
      name: item.name,
      trigger: item.trigger,
      isActive: true,
      messageType: item.templateName ? 'template' : 'text',
      messageContent: item.messageContent,
      templateId: item.templateName ? templateByName.get(item.templateName) : undefined,
      delayMinutes: 0,
      createdBy: userId,
      updatedBy: userId,
    }))
  );
};
