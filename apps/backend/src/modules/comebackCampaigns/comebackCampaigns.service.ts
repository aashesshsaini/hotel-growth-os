import { FilterQuery, Types } from 'mongoose';
import { AuditLog, ComebackCampaign, ComebackDeliveryLog, ComebackSettings, ComebackTemplate, Guest, Hotel, HotelIntegrationSettings } from '../../models';
import { ComebackChannel } from '../../models/ComebackTemplate';
import { IComebackCampaign } from '../../models/ComebackCampaign';
import { createAutomationJob } from '../automation/automation.service';
import { registerAutomationJobHandler } from '../automation/automation.registry';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { AnalyticsQuery, AudienceInput, CampaignCreateInput, CampaignListQuery, CampaignUpdateInput, HistoryQuery, SettingsInput, TemplateCreateInput, TemplateListQuery, TemplateUpdateInput, TestMessageInput } from './comebackCampaigns.validation';

export const COMEBACK_MESSAGE_JOB_TYPE = 'SEND_COMEBACK_MESSAGE';
export const COMEBACK_CAMPAIGN_JOB_TYPE = 'PROCESS_COMEBACK_CAMPAIGN';
const MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'];
const VIEW_ROLES = [...MANAGE_ROLES, 'reception_staff'];
const VARIABLES = ['Guest Name', 'Hotel Name', 'Offer', 'Coupon Code', 'Booking Link', 'Expiry Date', 'Manager Name', 'Signature'];

interface Viewer { userId: string; role: string; hotelId?: string }

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const cutoffDate = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const templateVariables = (body: string) => Array.from(new Set(Array.from(body.matchAll(/{{\s*([^}]+)\s*}}/g)).map((match) => match[1].trim())));
const renderTemplate = (body: string, data: Record<string, string>) => Object.entries(data).reduce((text, [key, value]) => text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), value), body);

const resolveHotelId = (viewer: Viewer) => {
  if (!VIEW_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to view win-back campaigns');
  if (!viewer.hotelId) throw new ValidationError('Hotel ID is required');
  return viewer.hotelId;
};
const assertCanManage = (viewer: Viewer) => {
  if (!MANAGE_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to manage win-back campaigns');
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

const getOrCreateSettings = async (hotelId: string, viewer?: Viewer) => {
  const hotel = await Hotel.findOne({ _id: hotelId, isDeleted: { $ne: true } });
  if (!hotel) throw new NotFoundError('Hotel not found');
  const existing = await ComebackSettings.findOne({ hotelId, isDeleted: { $ne: true } });
  if (existing) return existing;
  return ComebackSettings.create({ hotelId, inactiveAfterDays: [30, 60, 90, 180, 365], signature: `Warm regards,\n${hotel.name || 'Hotel Team'}`, createdBy: viewer?.userId, updatedBy: viewer?.userId });
};

const buildGuestFilter = (hotelId: string, channel: ComebackChannel, inactiveAfterDays: number, filters: Record<string, unknown> = {}): FilterQuery<any> => {
  const query: FilterQuery<any> = { hotelId, isDeleted: { $ne: true }, isBlacklisted: { $ne: true }, marketingConsent: true, $or: [{ lastStayDate: { $lte: cutoffDate(inactiveAfterDays) } }, { lastStayDate: { $exists: false }, lastBookingDate: { $lte: cutoffDate(inactiveAfterDays) } }] };
  if (channel === 'whatsapp') query.whatsappConsent = true;
  if (channel === 'email') query.emailConsent = true;
  if (filters.lastStayFrom || filters.lastStayTo) {
    query.lastStayDate = {};
    if (filters.lastStayFrom) query.lastStayDate.$gte = filters.lastStayFrom;
    if (filters.lastStayTo) query.lastStayDate.$lte = filters.lastStayTo;
    delete query.$or;
  }
  if (filters.minBookings !== undefined) query.totalBookings = { $gte: Number(filters.minBookings) };
  if (filters.minSpend !== undefined || filters.maxSpend !== undefined) {
    query.totalSpend = {};
    if (filters.minSpend !== undefined) query.totalSpend.$gte = Number(filters.minSpend);
    if (filters.maxSpend !== undefined) query.totalSpend.$lte = Number(filters.maxSpend);
  }
  if (filters.roomTypeId) query.roomPreference = String(filters.roomTypeId);
  if (filters.city) query.city = new RegExp(String(filters.city), 'i');
  if (filters.country) query.country = new RegExp(String(filters.country), 'i');
  if (Array.isArray(filters.tags) && filters.tags.length) query.tags = { $in: filters.tags };
  if (filters.guestType) query.guestType = filters.guestType;
  if (filters.isVip !== undefined) query.isVip = filters.isVip;
  return query;
};

const resolveAudience = (campaign: Pick<IComebackCampaign, 'hotelId' | 'channel' | 'inactiveAfterDays' | 'audienceFilters'>) =>
  Guest.find(buildGuestFilter(String(campaign.hotelId), campaign.channel, campaign.inactiveAfterDays, campaign.audienceFilters || {}))
    .select('fullName name phone email lastStayDate lastBookingDate totalSpend totalBookings city country tags guestType isVip')
    .limit(5000)
    .lean();

const getMessageData = async (hotelId: string, guest: any, campaign?: IComebackCampaign) => {
  const [hotel, integrations, settings] = await Promise.all([
    Hotel.findById(hotelId).lean(),
    HotelIntegrationSettings.findOne({ hotelId, isDeleted: { $ne: true } }).lean(),
    getOrCreateSettings(hotelId),
  ]);
  return {
    'Guest Name': guest.fullName || guest.name || 'Guest',
    'Hotel Name': hotel?.name || 'Hotel',
    Offer: campaign?.offer?.title || 'Special comeback offer',
    'Coupon Code': campaign?.offer?.couponCode || 'COMEBACK',
    'Booking Link': campaign?.offer?.bookingLink || '',
    'Expiry Date': campaign?.offer?.expiryDate ? dateKey(campaign.offer.expiryDate) : '',
    'Manager Name': 'Hotel Manager',
    'Review Link': integrations?.googleReview?.googleReviewUrl || '',
    Signature: settings.signature || '',
  };
};

const getTemplateForCampaign = (campaign: IComebackCampaign) =>
  campaign.templateId
    ? ComebackTemplate.findOne({ _id: campaign.templateId, hotelId: campaign.hotelId, isDeleted: { $ne: true } })
    : ComebackTemplate.findOne({ hotelId: campaign.hotelId, channel: campaign.channel, isActive: true, isDeleted: { $ne: true } }).sort({ isDefault: -1, updatedAt: -1 });

const addTimeline = (campaign: IComebackCampaign, action: string, viewer?: Viewer, message?: string, metadata?: Record<string, unknown>) => {
  campaign.timeline = campaign.timeline || [];
  campaign.timeline.unshift({ action, message, createdAt: new Date(), createdBy: viewer?.userId ? new Types.ObjectId(viewer.userId) : undefined, metadata });
  campaign.timeline = campaign.timeline.slice(0, 50);
};

const createDeliveryAndJob = async (campaign: IComebackCampaign, guest: any, scheduledAt?: Date) => {
  const template = await getTemplateForCampaign(campaign);
  const data = await getMessageData(String(campaign.hotelId), guest, campaign);
  const fallback = 'Hi {{Guest Name}}, we miss hosting you at {{Hotel Name}}. Here is {{Offer}} with coupon {{Coupon Code}}. Book here: {{Booking Link}}';
  const body = renderTemplate(template?.body || fallback, data);
  const lastStay = guest.lastStayDate || guest.lastBookingDate || new Date(0);
  const deduplicationKey = `comeback:${campaign.hotelId}:${campaign._id}:${guest._id}:${campaign.channel}:${campaign.inactiveAfterDays}:${dateKey(lastStay)}`;
  const existing = await ComebackDeliveryLog.findOne({ deduplicationKey, isDeleted: { $ne: true } });
  if (existing) return { duplicate: true, delivery: existing };
  const delivery = await ComebackDeliveryLog.create({
    hotelId: campaign.hotelId,
    campaignId: campaign._id,
    guestId: guest._id,
    templateId: template?._id,
    channel: campaign.channel,
    status: scheduledAt && scheduledAt.getTime() > Date.now() ? 'pending' : 'queued',
    inactiveSince: cutoffDate(campaign.inactiveAfterDays),
    lastStayDate: lastStay,
    recipientName: guest.fullName || guest.name,
    recipientMasked: maskContact(campaign.channel === 'email' ? guest.email : guest.phone),
    messagePreview: body.slice(0, 180),
    deduplicationKey,
    metadata: { simulated: true, offer: campaign.offer, inactiveAfterDays: campaign.inactiveAfterDays },
    createdBy: campaign.createdBy,
    updatedBy: campaign.updatedBy,
  });
  const settings = await getOrCreateSettings(String(campaign.hotelId));
  const job = await createAutomationJob({ jobType: COMEBACK_MESSAGE_JOB_TYPE, payload: { deliveryLogId: String(delivery._id), simulated: true, message: body }, options: { hotelId: String(campaign.hotelId), scheduledAt, deduplicationKey, maxAttempts: settings.retryEnabled ? 3 : 1, metadata: { campaignId: String(campaign._id), channel: campaign.channel }, createdBy: campaign.createdBy ? String(campaign.createdBy) : undefined } });
  delivery.automationJobId = job._id as Types.ObjectId;
  await delivery.save();
  return { duplicate: false, delivery };
};

export const getSettings = async (viewer: Viewer) => getOrCreateSettings(resolveHotelId(viewer), viewer);
export const updateSettings = async (input: SettingsInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  Object.assign(settings, input, { updatedBy: viewer.userId });
  await settings.save();
  await audit(viewer, hotelId, 'comeback.settings_updated', 'ComebackSettings', settings._id);
  return settings;
};
export const setPaused = async (paused: boolean, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  settings.isPaused = paused;
  settings.updatedBy = new Types.ObjectId(viewer.userId);
  await settings.save();
  return settings;
};
export const previewAudience = async (input: AudienceInput, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const guests = await Guest.find(buildGuestFilter(hotelId, input.channel, input.inactiveAfterDays, input.filters || {})).select('fullName name phone email lastStayDate totalSpend totalBookings').limit(5000).lean();
  return { total: guests.length, sample: guests.slice(0, 10).map((guest: any) => ({ id: guest._id, name: guest.fullName || guest.name, contact: maskContact(input.channel === 'email' ? guest.email : guest.phone), lastStayDate: guest.lastStayDate, totalSpend: guest.totalSpend, totalBookings: guest.totalBookings })) };
};

export const listTemplates = async (query: TemplateListQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const filter: FilterQuery<any> = { hotelId, isDeleted: { $ne: true } };
  if (query.search) filter.name = new RegExp(query.search, 'i');
  if (query.channel) filter.channel = query.channel;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([ComebackTemplate.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(query.limit), ComebackTemplate.countDocuments(filter)]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};
export const createTemplate = async (input: TemplateCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const template = await ComebackTemplate.create({ ...input, hotelId, variables: templateVariables(input.body), createdBy: viewer.userId, updatedBy: viewer.userId });
  await audit(viewer, hotelId, 'comeback.template_created', 'ComebackTemplate', template._id);
  return template;
};
export const updateTemplate = async (id: string, input: TemplateUpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const template = await ComebackTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!template) throw new NotFoundError('Template not found');
  Object.assign(template, input, { variables: templateVariables(input.body || template.body), updatedBy: viewer.userId });
  await template.save();
  return template;
};
export const duplicateTemplate = async (id: string, name: string | undefined, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const template = await ComebackTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } }).lean();
  if (!template) throw new NotFoundError('Template not found');
  return createTemplate({ name: name || `${template.name} Copy`, channel: template.channel, subject: template.subject, body: template.body, isActive: false, isDefault: false }, viewer);
};
export const archiveTemplate = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const template = await ComebackTemplate.findOne({ _id: id, hotelId: resolveHotelId(viewer), isDeleted: { $ne: true } });
  if (!template) throw new NotFoundError('Template not found');
  template.isActive = false;
  template.archivedAt = new Date();
  await template.save();
  return template;
};
export const previewTemplate = async (id: string, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const template = await ComebackTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!template) throw new NotFoundError('Template not found');
  return { subject: template.subject || '', body: renderTemplate(template.body, { 'Guest Name': 'Aarav Sharma', 'Hotel Name': 'Grand Palace', Offer: '20% off your next stay', 'Coupon Code': 'COMEBACK20', 'Booking Link': 'https://hotel.example/book', 'Expiry Date': dateKey(new Date()), 'Manager Name': 'Hotel Manager', Signature: 'Warm regards' }), variables: VARIABLES };
};

export const listCampaigns = async (query: CampaignListQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const filter: FilterQuery<any> = { hotelId, isDeleted: { $ne: true } };
  if (query.search) filter.name = new RegExp(query.search, 'i');
  if (query.status) filter.status = query.status;
  if (query.channel) filter.channel = query.channel;
  if (query.inactiveAfterDays) filter.inactiveAfterDays = query.inactiveAfterDays;
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([ComebackCampaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit), ComebackCampaign.countDocuments(filter)]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};
export const createCampaign = async (input: CampaignCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  if (!settings.isEnabled || settings.isPaused) throw new ValidationError('Win-back automation is paused or disabled');
  const recipientCount = await Guest.countDocuments(buildGuestFilter(hotelId, input.channel, input.inactiveAfterDays, input.audienceFilters || {}));
  const campaign = await ComebackCampaign.create({ ...input, hotelId, status: input.sendNow ? 'running' : (input.scheduledAt ? 'scheduled' : 'draft'), audienceFilters: input.audienceFilters || {}, recipientCount, createdBy: viewer.userId, updatedBy: viewer.userId });
  addTimeline(campaign, 'created', viewer, 'Campaign created');
  if (input.sendNow || input.scheduledAt) await createAutomationJob({ jobType: COMEBACK_CAMPAIGN_JOB_TYPE, payload: { campaignId: String(campaign._id) }, options: { hotelId, scheduledAt: input.scheduledAt, deduplicationKey: `comeback-campaign:${campaign._id}`, maxAttempts: settings.retryEnabled ? 3 : 1, createdBy: viewer.userId } });
  await campaign.save();
  await audit(viewer, hotelId, 'comeback.campaign_created', 'ComebackCampaign', campaign._id);
  return campaign;
};
const getCampaignOrThrow = async (id: string, viewer: Viewer) => {
  const campaign = await ComebackCampaign.findOne({ _id: id, hotelId: resolveHotelId(viewer), isDeleted: { $ne: true } });
  if (!campaign) throw new NotFoundError('Campaign not found');
  return campaign;
};
export const updateCampaign = async (id: string, input: CampaignUpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);
  Object.assign(campaign, input, { updatedBy: viewer.userId });
  addTimeline(campaign, 'updated', viewer, 'Campaign updated');
  await campaign.save();
  return campaign;
};
export const duplicateCampaign = async (id: string, viewer: Viewer) => {
  const campaign = await getCampaignOrThrow(id, viewer);
  return createCampaign({ templateId: campaign.templateId ? String(campaign.templateId) : undefined, name: `${campaign.name} Copy`, channel: campaign.channel, inactiveAfterDays: campaign.inactiveAfterDays, audienceFilters: campaign.audienceFilters as any, offer: campaign.offer as any }, viewer);
};
export const setCampaignStatus = async (id: string, status: 'paused' | 'running' | 'archived' | 'cancelled', viewer: Viewer) => {
  assertCanManage(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);
  campaign.status = status;
  if (status === 'paused') campaign.pausedAt = new Date();
  if (status === 'running') campaign.resumedAt = new Date();
  if (status === 'archived') campaign.archivedAt = new Date();
  if (status === 'cancelled') campaign.cancelledAt = new Date();
  addTimeline(campaign, status, viewer, `Campaign ${status}`);
  await campaign.save();
  if (status === 'cancelled') await ComebackDeliveryLog.updateMany({ campaignId: campaign._id, status: { $in: ['pending', 'queued'] } }, { status: 'cancelled' });
  return campaign;
};
export const runCampaign = async (campaignId: string) => {
  const campaign = await ComebackCampaign.findById(campaignId);
  if (!campaign || ['cancelled', 'archived', 'paused'].includes(campaign.status)) return { skipped: true };
  const guests = await resolveAudience(campaign);
  let sent = 0; let failed = 0;
  for (const guest of guests) {
    try { const result = await createDeliveryAndJob(campaign, guest, campaign.scheduledAt); if (!result.duplicate) sent += 1; } catch { failed += 1; }
  }
  campaign.status = failed > 0 && sent === 0 ? 'failed' : 'completed';
  campaign.sentCount = sent; campaign.failedCount = failed; campaign.completedAt = new Date();
  addTimeline(campaign, 'completed', undefined, 'Campaign processing completed', { sent, failed });
  await campaign.save();
  return { recipients: guests.length, sent, failed };
};
export const scanAndEnqueue = async (viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  if (!settings.isEnabled || settings.isPaused) return { queued: 0, skipped: 'paused' };
  let queued = 0;
  for (const days of settings.inactiveAfterDays) {
    const campaign = await ComebackCampaign.create({ hotelId, name: `${days}-day inactive guest automation`, channel: settings.defaultChannel, status: 'running', inactiveAfterDays: days, audienceFilters: {}, offer: { type: 'percentage_discount', title: 'Comeback special offer', couponCode: `BACK${days}` }, createdBy: viewer.userId, updatedBy: viewer.userId });
    const guests = await resolveAudience(campaign);
    campaign.recipientCount = guests.length;
    await campaign.save();
    await createAutomationJob({ jobType: COMEBACK_CAMPAIGN_JOB_TYPE, payload: { campaignId: String(campaign._id) }, options: { hotelId, deduplicationKey: `comeback-scan:${hotelId}:${days}:${dateKey(new Date())}`, maxAttempts: settings.retryEnabled ? 3 : 1, createdBy: viewer.userId } });
    queued += guests.length;
  }
  return { queued };
};
export const processDelivery = async (deliveryLogId: string) => {
  const log = await ComebackDeliveryLog.findById(deliveryLogId);
  if (!log || log.status === 'cancelled') return { skipped: true };
  log.status = 'sent'; log.sentAt = new Date(); log.deliveredAt = new Date(); log.metadata = { ...(log.metadata || {}), provider: 'simulated', returnRateFutureReady: true };
  await log.save();
  return { sent: true, deliveryLogId };
};
export const listHistory = async (query: HistoryQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const filter: FilterQuery<any> = { hotelId, isDeleted: { $ne: true } };
  if (query.search) filter.$or = [{ recipientName: new RegExp(query.search, 'i') }, { recipientMasked: new RegExp(query.search, 'i') }];
  if (query.status) filter.status = query.status;
  if (query.channel) filter.channel = query.channel;
  if (query.campaignId) filter.campaignId = query.campaignId;
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([ComebackDeliveryLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit), ComebackDeliveryLog.countDocuments(filter)]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};
export const getDashboard = async (viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const inactiveGuests = await Guest.countDocuments(buildGuestFilter(hotelId, 'whatsapp', 90));
  const [running, reengaged, sent, pending, failed, upcoming] = await Promise.all([
    ComebackCampaign.countDocuments({ hotelId, status: 'running', isDeleted: { $ne: true } }),
    ComebackCampaign.countDocuments({ hotelId, bookingsGenerated: { $gt: 0 }, isDeleted: { $ne: true } }),
    ComebackDeliveryLog.countDocuments({ hotelId, status: { $in: ['sent', 'delivered', 'opened'] }, isDeleted: { $ne: true } }),
    ComebackDeliveryLog.countDocuments({ hotelId, status: { $in: ['pending', 'queued'] }, isDeleted: { $ne: true } }),
    ComebackDeliveryLog.countDocuments({ hotelId, status: 'failed', isDeleted: { $ne: true } }),
    ComebackCampaign.countDocuments({ hotelId, status: 'scheduled', isDeleted: { $ne: true } }),
  ]);
  return { inactiveGuests, campaignsRunning: running, guestsReengaged: reengaged, messagesSent: sent, pendingMessages: pending, failedMessages: failed, upcomingCampaigns: upcoming };
};
export const getAnalytics = async (query: AnalyticsQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const since = new Date(); since.setMonth(since.getMonth() - query.months + 1); since.setDate(1);
  const [total, failed, campaignPerformance, monthlyTrends] = await Promise.all([
    ComebackDeliveryLog.countDocuments({ hotelId, isDeleted: { $ne: true } }),
    ComebackDeliveryLog.countDocuments({ hotelId, status: 'failed', isDeleted: { $ne: true } }),
    ComebackDeliveryLog.aggregate([{ $match: { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } } }, { $group: { _id: '$campaignId', reach: { $sum: 1 }, sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened']] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } }, { $limit: 10 }]),
    ComebackDeliveryLog.aggregate([{ $match: { hotelId: new Types.ObjectId(hotelId), createdAt: { $gte: since }, isDeleted: { $ne: true } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);
  return { deliveryRate: total ? Math.round(((total - failed) / total) * 100) : 0, failureRate: total ? Math.round((failed / total) * 100) : 0, guestReturnRate: 0, repeatBookingRate: 0, campaignPerformance, monthlyTrends: monthlyTrends.map((item) => ({ month: item._id, count: item.count })) };
};
export const retryFailed = async (viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const failed = await ComebackDeliveryLog.find({ hotelId, status: 'failed', isDeleted: { $ne: true } }).limit(100);
  for (const log of failed) {
    log.retryCount += 1; log.status = 'queued'; log.failedReason = undefined; await log.save();
    await createAutomationJob({ jobType: COMEBACK_MESSAGE_JOB_TYPE, payload: { deliveryLogId: String(log._id), simulated: true, retry: true }, options: { hotelId, deduplicationKey: `${log.deduplicationKey}:retry:${log.retryCount}` } });
  }
  return { retried: failed.length };
};
export const sendTestMessage = async (input: TestMessageInput, viewer: Viewer) => {
  assertCanManage(viewer); resolveHotelId(viewer);
  return { success: true, simulated: true, recipient: maskContact(input.recipient), channel: input.channel || 'whatsapp' };
};
export const exportHistory = async (viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const rows = await ComebackDeliveryLog.find({ hotelId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(500).lean();
  return { generatedAt: new Date(), count: rows.length, rows };
};
let registered = false;
export const registerComebackAutomationHandlers = () => {
  if (registered) return;
  registered = true;
  registerAutomationJobHandler(COMEBACK_MESSAGE_JOB_TYPE, async ({ payload }) => processDelivery(String(payload?.deliveryLogId)));
  registerAutomationJobHandler(COMEBACK_CAMPAIGN_JOB_TYPE, async ({ payload }) => runCampaign(String(payload?.campaignId)));
};
