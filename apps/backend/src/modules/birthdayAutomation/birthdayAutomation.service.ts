import { FilterQuery, Types } from 'mongoose';
import {
  AuditLog,
  AutomationJob,
  Guest,
  Hotel,
  HotelIntegrationSettings,
  OccasionAutomationSettings,
  OccasionCampaign,
  OccasionDeliveryLog,
  OccasionTemplate,
} from '../../models';
import { IOccasionAutomationSettings } from '../../models/OccasionAutomationSettings';
import { OccasionChannel, OccasionType } from '../../models/OccasionTemplate';
import { createAutomationJob } from '../automation/automation.service';
import { registerAutomationJobHandler } from '../automation/automation.registry';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import {
  AnalyticsQuery,
  CampaignCreateInput,
  CampaignListQuery,
  HistoryQuery,
  ManualSendInput,
  SettingsInput,
  TemplateCreateInput,
  TemplateListQuery,
  TemplateUpdateInput,
  TestMessageInput,
} from './birthdayAutomation.validation';

export const OCCASION_JOB_TYPE = 'SEND_OCCASION_MESSAGE';
export const OCCASION_CAMPAIGN_JOB_TYPE = 'PROCESS_OCCASION_CAMPAIGN';
const MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'];
const VIEW_ROLES = [...MANAGE_ROLES, 'reception_staff'];
const VARIABLES = ['Guest Name', 'Hotel Name', 'Birthday', 'Anniversary', 'Coupon Code', 'Manager Name', 'Review Link', 'WhatsApp Number'];

interface Viewer {
  userId: string;
  role: string;
  hotelId?: string;
}

const resolveHotelId = (viewer: Viewer) => {
  if (!VIEW_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to view occasion automation');
  if (!viewer.hotelId) throw new ValidationError('Hotel ID is required');
  return viewer.hotelId;
};

const assertCanManage = (viewer: Viewer) => {
  if (!MANAGE_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to manage occasion automation');
};

const audit = (viewer: Viewer, hotelId: string, action: string, entity: string, entityId: unknown, changes?: Record<string, unknown>) =>
  AuditLog.create({ hotelId, userId: viewer.userId, action, entity, entityId, changes });

const maskContact = (value?: string) => {
  if (!value) return 'Not available';
  const normalized = value.replace(/\s+/g, '');
  if (normalized.includes('@')) {
    const [user, domain] = normalized.split('@');
    return `${user.slice(0, 2)}***@${domain}`;
  }
  return normalized.length <= 4 ? '****' : `${normalized.slice(0, 2)}****${normalized.slice(-2)}`;
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const sameMonthDay = (source: Date | undefined, target: Date) =>
  Boolean(source && source.getUTCMonth() === target.getUTCMonth() && source.getUTCDate() === target.getUTCDate());

const renderTemplate = (body: string, data: Record<string, string>) =>
  Object.entries(data).reduce((text, [key, value]) => text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), value), body);

const templateVariables = (body: string) => Array.from(new Set(Array.from(body.matchAll(/{{\s*([^}]+)\s*}}/g)).map((match) => match[1].trim())));

const getOrCreateSettings = async (hotelId: string, viewer?: Viewer) => {
  const hotel = await Hotel.findOne({ _id: hotelId, isDeleted: { $ne: true } });
  if (!hotel) throw new NotFoundError('Hotel not found');
  const existing = await OccasionAutomationSettings.findOne({ hotelId, isDeleted: { $ne: true } });
  if (existing) return existing;
  return OccasionAutomationSettings.create({
    hotelId,
    signature: `Warm regards,\n${hotel.name || 'Hotel Team'}`,
    createdBy: viewer?.userId,
    updatedBy: viewer?.userId,
  });
};

const getDefaultTemplateBody = (occasion: OccasionType) =>
  occasion === 'birthday'
    ? 'Happy Birthday {{Guest Name}}! Wishing you a wonderful day from {{Hotel Name}}. {{Signature}}'
    : 'Happy Anniversary {{Guest Name}}! Best wishes from {{Hotel Name}}. {{Signature}}';

const getTemplate = async (hotelId: string, occasion: OccasionType, channel: OccasionChannel, templateId?: string) => {
  if (templateId) {
    const template = await OccasionTemplate.findOne({ _id: templateId, hotelId, isDeleted: { $ne: true } });
    if (!template) throw new NotFoundError('Template not found');
    return template;
  }
  return OccasionTemplate.findOne({ hotelId, occasion, channel, isActive: true, isDeleted: { $ne: true } }).sort({ updatedAt: -1 });
};

const getMessageData = async (hotelId: string, guest: any, settings: IOccasionAutomationSettings) => {
  const hotel = await Hotel.findById(hotelId).lean();
  const integrations = await HotelIntegrationSettings.findOne({ hotelId, isDeleted: { $ne: true } }).lean();
  return {
    'Guest Name': guest.fullName || guest.name || 'Guest',
    'Hotel Name': hotel?.name || 'Hotel',
    Birthday: guest.dateOfBirth ? dateKey(guest.dateOfBirth) : '',
    Anniversary: guest.anniversaryDate ? dateKey(guest.anniversaryDate) : '',
    'Coupon Code': 'SPECIAL10',
    'Manager Name': 'Hotel Manager',
    'Review Link': integrations?.googleReview?.googleReviewUrl || '',
    'WhatsApp Number': integrations?.whatsapp?.phoneNumber || hotel?.whatsappNumber || '',
    Signature: settings.signature || '',
  };
};

const guestFilter = (hotelId: string, channel: OccasionChannel, query: Record<string, unknown> = {}): FilterQuery<any> => {
  const filter: FilterQuery<any> = { hotelId, isDeleted: { $ne: true }, isBlacklisted: { $ne: true }, marketingConsent: true };
  if (channel === 'whatsapp') filter.whatsappConsent = true;
  if (channel === 'email') filter.emailConsent = true;
  if (query.search) filter.$or = [
    { fullName: new RegExp(String(query.search), 'i') },
    { phone: new RegExp(String(query.search), 'i') },
    { email: new RegExp(String(query.search), 'i') },
  ];
  if (query.guestType) filter.guestType = query.guestType;
  if (query.city) filter.city = new RegExp(String(query.city), 'i');
  if (query.isVip !== undefined) filter.isVip = query.isVip;
  return filter;
};

const eligibleGuests = async (
  hotelId: string,
  occasion: OccasionType,
  channel: OccasionChannel,
  occurrenceDate: Date,
  filters: Record<string, unknown> = {},
  guestIds?: string[]
) => {
  const filter = guestFilter(hotelId, channel, filters);
  if (guestIds?.length) filter._id = { $in: guestIds.map((id) => new Types.ObjectId(id)) };
  filter[occasion === 'birthday' ? 'dateOfBirth' : 'anniversaryDate'] = { $exists: true, $ne: null };
  const guests = await Guest.find(filter).select('fullName name phone email dateOfBirth anniversaryDate').lean();
  return guests.filter((guest) => sameMonthDay((guest as any)[occasion === 'birthday' ? 'dateOfBirth' : 'anniversaryDate'], occurrenceDate));
};

const createDeliveryAndJob = async ({
  hotelId,
  guest,
  occasion,
  channel,
  occurrenceDate,
  settings,
  templateId,
  campaignId,
  scheduledAt,
  createdBy,
}: {
  hotelId: string;
  guest: any;
  occasion: OccasionType;
  channel: OccasionChannel;
  occurrenceDate: Date;
  settings: IOccasionAutomationSettings;
  templateId?: string;
  campaignId?: string;
  scheduledAt?: Date;
  createdBy?: string;
}) => {
  const template = await getTemplate(hotelId, occasion, channel, templateId);
  const data = await getMessageData(hotelId, guest, settings);
  const body = renderTemplate(template?.body || getDefaultTemplateBody(occasion), data);
  const occurrence = dateKey(occurrenceDate);
  const deduplicationKey = `occasion:${hotelId}:${guest._id}:${occasion}:${channel}:${occurrence}`;
  let delivery = await OccasionDeliveryLog.findOne({ deduplicationKey, isDeleted: { $ne: true } });
  if (delivery) return { delivery, duplicate: true };
  if (!delivery) {
    delivery = await OccasionDeliveryLog.create({
      hotelId,
      guestId: guest._id,
      campaignId,
      templateId: template?._id,
      occasion,
      channel,
      status: scheduledAt && scheduledAt.getTime() > Date.now() ? 'pending' : 'queued',
      occurrenceDate: occurrence,
      recipientName: guest.fullName || guest.name,
      recipientMasked: maskContact(channel === 'email' ? guest.email : guest.phone),
      messagePreview: body.slice(0, 180),
      deduplicationKey,
      metadata: { simulated: true },
      createdBy,
      updatedBy: createdBy,
    });
  }
  const job = await createAutomationJob({
    jobType: OCCASION_JOB_TYPE,
    payload: { deliveryLogId: String(delivery._id), simulated: true, message: body },
    options: {
      hotelId,
      scheduledAt,
      deduplicationKey,
      maxAttempts: settings.retryEnabled ? 3 : 1,
      metadata: { occasion, channel, campaignId },
      createdBy,
    },
  });
  delivery.automationJobId = job._id as Types.ObjectId;
  delivery.status = job.scheduledAt && job.scheduledAt.getTime() > Date.now() ? 'pending' : 'queued';
  await delivery.save();
  return { delivery, duplicate: false };
};

export const getSettings = async (viewer: Viewer) => getOrCreateSettings(resolveHotelId(viewer), viewer);

export const updateSettings = async (input: SettingsInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  Object.assign(settings, input, { updatedBy: viewer.userId });
  await settings.save();
  await audit(viewer, hotelId, 'occasion.settings_updated', 'OccasionAutomationSettings', settings._id);
  return settings;
};

export const setPaused = async (paused: boolean, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  settings.isPaused = paused;
  settings.updatedBy = new Types.ObjectId(viewer.userId);
  await settings.save();
  await audit(viewer, hotelId, paused ? 'occasion.automation_paused' : 'occasion.automation_resumed', 'OccasionAutomationSettings', settings._id);
  return settings;
};

export const listTemplates = async (query: TemplateListQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const filter: FilterQuery<any> = { hotelId, isDeleted: { $ne: true } };
  if (query.search) filter.name = new RegExp(query.search, 'i');
  if (query.occasion) filter.occasion = query.occasion;
  if (query.channel) filter.channel = query.channel;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([
    OccasionTemplate.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(query.limit),
    OccasionTemplate.countDocuments(filter),
  ]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};

export const createTemplate = async (input: TemplateCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  if (input.isActive) await OccasionTemplate.updateMany({ hotelId, occasion: input.occasion, channel: input.channel }, { isActive: false });
  const template = await OccasionTemplate.create({ ...input, hotelId, variables: templateVariables(input.body), createdBy: viewer.userId, updatedBy: viewer.userId });
  await audit(viewer, hotelId, 'occasion.template_created', 'OccasionTemplate', template._id);
  return template;
};

export const updateTemplate = async (id: string, input: TemplateUpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const template = await OccasionTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!template) throw new NotFoundError('Template not found');
  if (input.isActive) await OccasionTemplate.updateMany({ hotelId, occasion: input.occasion || template.occasion, channel: input.channel || template.channel, _id: { $ne: template._id } }, { isActive: false });
  Object.assign(template, input, { variables: templateVariables(input.body || template.body), updatedBy: viewer.userId });
  await template.save();
  await audit(viewer, hotelId, 'occasion.template_updated', 'OccasionTemplate', template._id);
  return template;
};

export const duplicateTemplate = async (id: string, name: string | undefined, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const template = await OccasionTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } }).lean();
  if (!template) throw new NotFoundError('Template not found');
  return createTemplate({
    name: name || `${template.name} Copy`,
    occasion: template.occasion as OccasionType,
    channel: template.channel as OccasionChannel,
    subject: template.subject,
    body: template.body,
    isActive: false,
  }, viewer);
};

export const deleteTemplate = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const template = await OccasionTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!template) throw new NotFoundError('Template not found');
  await (template as any).softDelete(viewer.userId);
  await audit(viewer, hotelId, 'occasion.template_deleted', 'OccasionTemplate', template._id);
};

export const previewTemplate = async (id: string, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  const template = await OccasionTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!template) throw new NotFoundError('Template not found');
  const sample = await getMessageData(hotelId, { fullName: 'Aarav Sharma', phone: '+919876543210', dateOfBirth: new Date(), anniversaryDate: new Date() }, settings);
  return { subject: template.subject ? renderTemplate(template.subject, sample) : '', body: renderTemplate(template.body, sample), variables: VARIABLES };
};

export const previewRecipients = async (input: Partial<CampaignCreateInput> & { occasion: OccasionType; channel: OccasionChannel }, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const guests = await eligibleGuests(hotelId, input.occasion, input.channel, new Date(), input.filters || {});
  return {
    total: guests.length,
    sample: guests.slice(0, 10).map((guest: any) => ({ id: guest._id, name: guest.fullName || guest.name, contact: maskContact(input.channel === 'email' ? guest.email : guest.phone) })),
  };
};

export const listCampaigns = async (query: CampaignListQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const filter: FilterQuery<any> = { hotelId, isDeleted: { $ne: true } };
  if (query.search) filter.name = new RegExp(query.search, 'i');
  if (query.occasion) filter.occasion = query.occasion;
  if (query.channel) filter.channel = query.channel;
  if (query.status) filter.status = query.status;
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([
    OccasionCampaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    OccasionCampaign.countDocuments(filter),
  ]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};

export const createCampaign = async (input: CampaignCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  const occurrenceDate = new Date();
  const recipients = await eligibleGuests(hotelId, input.occasion, input.channel, occurrenceDate, input.filters || {});
  const campaign = await OccasionCampaign.create({
    hotelId,
    name: input.name,
    occasion: input.occasion,
    channel: input.channel,
    templateId: input.templateId,
    status: input.sendNow ? 'running' : (input.scheduledAt ? 'scheduled' : 'draft'),
    scheduledAt: input.scheduledAt,
    filters: input.filters || {},
    recipientCount: recipients.length,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  if (input.sendNow || input.scheduledAt) {
    await createAutomationJob({
      jobType: OCCASION_CAMPAIGN_JOB_TYPE,
      payload: { campaignId: String(campaign._id) },
      options: { hotelId, scheduledAt: input.scheduledAt, deduplicationKey: `occasion-campaign:${campaign._id}`, maxAttempts: settings.retryEnabled ? 3 : 1, createdBy: viewer.userId },
    });
  }
  await audit(viewer, hotelId, 'occasion.campaign_created', 'OccasionCampaign', campaign._id);
  return campaign;
};

export const cancelCampaign = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const campaign = await OccasionCampaign.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!campaign) throw new NotFoundError('Campaign not found');
  campaign.status = 'cancelled';
  campaign.cancelledAt = new Date();
  campaign.updatedBy = new Types.ObjectId(viewer.userId);
  await campaign.save();
  await OccasionDeliveryLog.updateMany({ campaignId: campaign._id, status: { $in: ['pending', 'queued'] } }, { status: 'cancelled' });
  await audit(viewer, hotelId, 'occasion.campaign_cancelled', 'OccasionCampaign', campaign._id);
  return campaign;
};

export const runCampaign = async (campaignId: string) => {
  const campaign = await OccasionCampaign.findById(campaignId);
  if (!campaign || campaign.status === 'cancelled') return { skipped: true };
  const settings = await getOrCreateSettings(String(campaign.hotelId));
  const recipients = await eligibleGuests(String(campaign.hotelId), campaign.occasion, campaign.channel, new Date(), campaign.filters || {});
  let sent = 0;
  let failed = 0;
  for (const guest of recipients) {
    try {
      await createDeliveryAndJob({
        hotelId: String(campaign.hotelId),
        guest,
        occasion: campaign.occasion,
        channel: campaign.channel,
        occurrenceDate: new Date(),
        settings,
        templateId: campaign.templateId ? String(campaign.templateId) : undefined,
        campaignId: String(campaign._id),
        createdBy: campaign.createdBy ? String(campaign.createdBy) : undefined,
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  campaign.status = failed > 0 && sent === 0 ? 'failed' : 'completed';
  campaign.sentCount = sent;
  campaign.failedCount = failed;
  campaign.lastRunAt = new Date();
  await campaign.save();
  return { recipients: recipients.length, sent, failed };
};

export const manualSend = async (input: ManualSendInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  const channel = input.channel || settings.preferredChannel;
  const guests = input.guestIds?.length
    ? await Guest.find({ _id: { $in: input.guestIds.map((id) => new Types.ObjectId(id)) }, hotelId, isDeleted: { $ne: true }, isBlacklisted: { $ne: true } }).lean()
    : await eligibleGuests(hotelId, input.occasion, channel, new Date());
  const results = await Promise.allSettled(guests.map((guest: any) => createDeliveryAndJob({
    hotelId,
    guest,
    occasion: input.occasion,
    channel,
    occurrenceDate: new Date(),
    settings,
    templateId: input.templateId,
    scheduledAt: input.scheduledAt,
    createdBy: viewer.userId,
  })));
  await audit(viewer, hotelId, 'occasion.manual_send', 'OccasionDeliveryLog', hotelId, { count: results.length });
  return { queued: results.filter((result) => result.status === 'fulfilled').length, failed: results.filter((result) => result.status === 'rejected').length };
};

export const scanAndEnqueue = async (viewerOrHotelId: Viewer | string, scanDate = new Date()) => {
  const hotelId = typeof viewerOrHotelId === 'string' ? viewerOrHotelId : resolveHotelId(viewerOrHotelId);
  const settings = await getOrCreateSettings(hotelId, typeof viewerOrHotelId === 'string' ? undefined : viewerOrHotelId);
  if (settings.isPaused) return { queued: 0, skipped: 'paused' };
  const occasions: Array<{ occasion: OccasionType; enabled: boolean; daysBefore: number }> = [
    { occasion: 'birthday', enabled: settings.birthdayEnabled, daysBefore: settings.daysBeforeBirthday },
    { occasion: 'anniversary', enabled: settings.anniversaryEnabled, daysBefore: settings.daysBeforeAnniversary },
  ];
  let queued = 0;
  for (const item of occasions) {
    if (!item.enabled) continue;
    const occurrenceDate = addDays(scanDate, item.daysBefore);
    const guests = await eligibleGuests(hotelId, item.occasion, settings.preferredChannel, occurrenceDate);
    for (const guest of guests) {
      const result = await createDeliveryAndJob({
        hotelId,
        guest,
        occasion: item.occasion,
        channel: settings.preferredChannel,
        occurrenceDate,
        settings,
        createdBy: typeof viewerOrHotelId === 'string' ? undefined : viewerOrHotelId.userId,
      });
      if (!result.duplicate) queued += 1;
    }
  }
  return { queued };
};

export const listHistory = async (query: HistoryQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const filter: FilterQuery<any> = { hotelId, isDeleted: { $ne: true } };
  if (query.search) filter.$or = [{ recipientName: new RegExp(query.search, 'i') }, { recipientMasked: new RegExp(query.search, 'i') }];
  if (query.occasion) filter.occasion = query.occasion;
  if (query.channel) filter.channel = query.channel;
  if (query.status) filter.status = query.status;
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([
    OccasionDeliveryLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate('guestId', 'fullName name'),
    OccasionDeliveryLog.countDocuments(filter),
  ]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};

export const getDashboard = async (viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  const today = new Date();
  const [birthdayGuests, anniversaryGuests, sent, failed, pending] = await Promise.all([
    eligibleGuests(hotelId, 'birthday', settings.preferredChannel, today),
    eligibleGuests(hotelId, 'anniversary', settings.preferredChannel, today),
    OccasionDeliveryLog.countDocuments({ hotelId, status: { $in: ['sent', 'delivered', 'opened'] }, isDeleted: { $ne: true } }),
    OccasionDeliveryLog.countDocuments({ hotelId, status: 'failed', isDeleted: { $ne: true } }),
    OccasionDeliveryLog.countDocuments({ hotelId, status: { $in: ['pending', 'queued'] }, isDeleted: { $ne: true } }),
  ]);
  return {
    todayBirthdays: birthdayGuests.length,
    todayAnniversaries: anniversaryGuests.length,
    upcomingEvents: birthdayGuests.length + anniversaryGuests.length,
    messagesSent: sent,
    failedMessages: failed,
    pendingMessages: pending,
    automationHealth: settings.isPaused ? 'paused' : (settings.birthdayEnabled || settings.anniversaryEnabled ? 'healthy' : 'disabled'),
    settings,
    todayGuests: [...birthdayGuests, ...anniversaryGuests].slice(0, 8).map((guest: any) => ({ id: guest._id, name: guest.fullName || guest.name, contact: maskContact(guest.phone) })),
  };
};

export const getAnalytics = async (query: AnalyticsQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const since = new Date();
  since.setMonth(since.getMonth() - query.months + 1);
  since.setDate(1);
  const [birthdaySent, anniversarySent, failed, total, trend, byCampaign] = await Promise.all([
    OccasionDeliveryLog.countDocuments({ hotelId, occasion: 'birthday', status: { $in: ['sent', 'delivered', 'opened'] }, isDeleted: { $ne: true } }),
    OccasionDeliveryLog.countDocuments({ hotelId, occasion: 'anniversary', status: { $in: ['sent', 'delivered', 'opened'] }, isDeleted: { $ne: true } }),
    OccasionDeliveryLog.countDocuments({ hotelId, status: 'failed', isDeleted: { $ne: true } }),
    OccasionDeliveryLog.countDocuments({ hotelId, isDeleted: { $ne: true } }),
    OccasionDeliveryLog.aggregate([
      { $match: { hotelId: new Types.ObjectId(hotelId), createdAt: { $gte: since }, isDeleted: { $ne: true } } },
      { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, occasion: '$occasion' }, count: { $sum: 1 } } },
      { $sort: { '_id.month': 1 } },
    ]),
    OccasionDeliveryLog.aggregate([
      { $match: { hotelId: new Types.ObjectId(hotelId), campaignId: { $exists: true }, isDeleted: { $ne: true } } },
      { $group: { _id: '$campaignId', total: { $sum: 1 }, sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened']] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } },
      { $limit: 10 },
    ]),
  ]);
  return {
    birthdayMessagesSent: birthdaySent,
    anniversaryMessagesSent: anniversarySent,
    deliveryRate: total ? Math.round(((total - failed) / total) * 100) : 0,
    failureRate: total ? Math.round((failed / total) * 100) : 0,
    monthlyTrend: trend.map((item) => ({ month: item._id.month, occasion: item._id.occasion, count: item.count })),
    campaignPerformance: byCampaign,
  };
};

export const retryFailed = async (viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  const failed = await OccasionDeliveryLog.find({ hotelId, status: 'failed', isDeleted: { $ne: true } }).limit(100);
  for (const log of failed) {
    const guest = await Guest.findById(log.guestId).lean();
    if (!guest) continue;
    log.retryCount += 1;
    log.status = 'queued';
    log.failedReason = undefined;
    await log.save();
    await createAutomationJob({
      jobType: OCCASION_JOB_TYPE,
      payload: { deliveryLogId: String(log._id), simulated: true, retry: true },
      options: { hotelId, deduplicationKey: `${log.deduplicationKey}:retry:${log.retryCount}`, maxAttempts: settings.retryEnabled ? 3 : 1, createdBy: viewer.userId },
    });
  }
  return { retried: failed.length };
};

export const sendTestMessage = async (input: TestMessageInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  return { success: true, simulated: true, recipient: maskContact(input.recipient), occasion: input.occasion, channel: input.channel || 'whatsapp' };
};

export const exportHistory = async (viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const rows = await OccasionDeliveryLog.find({ hotelId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(500).lean();
  return {
    generatedAt: new Date(),
    count: rows.length,
    rows: rows.map((row) => ({
      guest: row.recipientName,
      occasion: row.occasion,
      channel: row.channel,
      status: row.status,
      sentAt: row.sentAt,
      failedReason: row.failedReason,
      retryCount: row.retryCount,
    })),
  };
};

export const processOccasionDelivery = async (deliveryLogId: string) => {
  const log = await OccasionDeliveryLog.findById(deliveryLogId);
  if (!log || log.status === 'cancelled') return { skipped: true };
  log.status = 'sent';
  log.sentAt = new Date();
  log.metadata = { ...(log.metadata || {}), provider: 'simulated', openedFutureReady: true };
  await log.save();
  if (log.automationJobId) await AutomationJob.findByIdAndUpdate(log.automationJobId, { status: 'COMPLETED' });
  return { sent: true, deliveryLogId };
};

let registered = false;
export const registerOccasionAutomationHandlers = () => {
  if (registered) return;
  registered = true;
  registerAutomationJobHandler(OCCASION_JOB_TYPE, async ({ payload }) => processOccasionDelivery(String(payload?.deliveryLogId)));
  registerAutomationJobHandler(OCCASION_CAMPAIGN_JOB_TYPE, async ({ payload }) => runCampaign(String(payload?.campaignId)));
};
