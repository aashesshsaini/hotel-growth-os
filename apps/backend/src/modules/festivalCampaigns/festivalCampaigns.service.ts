import { FilterQuery, Types } from 'mongoose';
import {
  AuditLog,
  Festival,
  FestivalCampaign,
  FestivalDeliveryLog,
  FestivalSettings,
  FestivalTemplate,
  Guest,
  Hotel,
  HotelIntegrationSettings,
} from '../../models';
import { FestivalChannel } from '../../models/FestivalTemplate';
import { IFestivalCampaign } from '../../models/FestivalCampaign';
import { createAutomationJob } from '../automation/automation.service';
import { registerAutomationJobHandler } from '../automation/automation.registry';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
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

export const FESTIVAL_MESSAGE_JOB_TYPE = 'SEND_FESTIVAL_MESSAGE';
export const FESTIVAL_CAMPAIGN_JOB_TYPE = 'PROCESS_FESTIVAL_CAMPAIGN';

const MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'];
const VIEW_ROLES = [...MANAGE_ROLES, 'reception_staff'];
const VARIABLES = ['Guest Name', 'Hotel Name', 'Offer', 'Coupon', 'Booking Link', 'Expiry Date', 'Manager Name', 'Review Link', 'Festival Name', 'Signature'];

const BUILT_IN_FESTIVALS = [
  ['New Year', '2026-01-01', 'global_holiday', 'Start the year with a memorable stay at {{Hotel Name}}.', 'New Year staycation offer'],
  ['Christmas', '2026-12-25', 'global_holiday', 'Celebrate Christmas with comfort, food, and festive warmth.', 'Christmas special package'],
  ['Diwali', '2026-11-08', 'festival', 'Light up your Diwali with a premium getaway at {{Hotel Name}}.', 'Diwali festive discount'],
  ['Holi', '2026-03-04', 'festival', 'Celebrate Holi with colors, comfort, and exclusive savings.', 'Holi weekend offer'],
  ['Eid', '2026-03-20', 'festival', 'Make Eid celebrations special with a relaxing hotel stay.', 'Eid family package'],
  ['Republic Day', '2026-01-26', 'national_holiday', 'Plan a Republic Day escape with direct booking benefits.', 'Republic Day offer'],
  ['Independence Day', '2026-08-15', 'national_holiday', 'Celebrate freedom with a refreshing staycation.', 'Independence Day deal'],
  ["Valentine's Day", '2026-02-14', 'global_holiday', 'Create a romantic Valentine experience at {{Hotel Name}}.', 'Couple stay package'],
  ["Women's Day", '2026-03-08', 'global_holiday', 'Celebrate the women who inspire you with a special stay.', "Women's Day offer"],
  ["Mother's Day", '2026-05-10', 'global_holiday', 'Gift your mother a peaceful and memorable hotel experience.', "Mother's Day package"],
  ["Father's Day", '2026-06-21', 'global_holiday', 'Treat your father to a relaxing stay and great hospitality.', "Father's Day package"],
  ['Friendship Day', '2026-08-02', 'global_holiday', 'Plan a friends getaway with exclusive direct booking perks.', 'Friends group offer'],
  ['Summer Offer', '2026-05-01', 'seasonal_offer', 'Beat the heat with a summer stay at {{Hotel Name}}.', 'Summer discount'],
  ['Monsoon Offer', '2026-07-01', 'seasonal_offer', 'Enjoy monsoon views and cozy hospitality.', 'Monsoon package'],
  ['Weekend Offer', '2026-01-03', 'weekend_offer', 'Turn your weekend into a quick getaway.', 'Weekend special'],
  ['Custom Festival', '2026-01-01', 'custom', 'Create a custom festival campaign for your hotel audience.', 'Custom offer'],
] as const;

interface Viewer { userId: string; role: string; hotelId?: string }

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const templateVariables = (body: string) => Array.from(new Set(Array.from(body.matchAll(/{{\s*([^}]+)\s*}}/g)).map((match) => match[1].trim())));
const renderTemplate = (body: string, data: Record<string, string>) => Object.entries(data).reduce((text, [key, value]) => text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), value), body);

const resolveHotelId = (viewer: Viewer) => {
  if (!VIEW_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to view festival campaigns');
  if (!viewer.hotelId) throw new ValidationError('Hotel ID is required');
  return viewer.hotelId;
};

const assertCanManage = (viewer: Viewer) => {
  if (!MANAGE_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to manage festival campaigns');
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
  const existing = await FestivalSettings.findOne({ hotelId, isDeleted: { $ne: true } });
  if (existing) return existing;
  return FestivalSettings.create({ hotelId, signature: `Warm regards,\n${hotel.name || 'Hotel Team'}`, createdBy: viewer?.userId, updatedBy: viewer?.userId });
};

const seedFestivalLibrary = async (hotelId: string, viewer?: Viewer) => {
  const count = await Festival.countDocuments({ hotelId, isDeleted: { $ne: true } });
  if (count > 0) return;
  await Festival.insertMany(BUILT_IN_FESTIVALS.map(([name, date, category, defaultMessage, defaultOffer]) => ({
    hotelId,
    name,
    slug: slugify(name),
    date: new Date(date),
    category,
    defaultBanner: '',
    defaultMessage,
    defaultOffer,
    isBuiltIn: true,
    isRecurring: true,
    isActive: true,
    createdBy: viewer?.userId,
    updatedBy: viewer?.userId,
  })));
};

const getMessageData = async (hotelId: string, guest: any, campaign?: IFestivalCampaign) => {
  const [hotel, integrations, festival] = await Promise.all([
    Hotel.findById(hotelId).lean(),
    HotelIntegrationSettings.findOne({ hotelId, isDeleted: { $ne: true } }).lean(),
    campaign ? Festival.findById(campaign.festivalId).lean() : undefined,
  ]);
  return {
    'Guest Name': guest.fullName || guest.name || 'Guest',
    'Hotel Name': hotel?.name || 'Hotel',
    Offer: campaign?.offer?.title || festival?.defaultOffer || 'Special offer',
    Coupon: campaign?.offer?.couponCode || 'DIRECT',
    'Booking Link': campaign?.offer?.bookingLink || '',
    'Expiry Date': campaign?.offer?.expiryDate ? dateKey(campaign.offer.expiryDate) : '',
    'Manager Name': 'Hotel Manager',
    'Review Link': integrations?.googleReview?.googleReviewUrl || '',
    'Festival Name': festival?.name || 'Festival',
    Signature: '',
  };
};

const buildGuestFilter = (hotelId: string, channel: FestivalChannel, segment: string, filters: Record<string, unknown> = {}): FilterQuery<any> => {
  const query: FilterQuery<any> = { hotelId, isDeleted: { $ne: true }, isBlacklisted: { $ne: true }, marketingConsent: true };
  if (channel === 'whatsapp') query.whatsappConsent = true;
  if (channel === 'email') query.emailConsent = true;
  if (segment === 'repeat_guests') query.isRepeatGuest = true;
  if (segment === 'vip_guests') query.isVip = true;
  if (segment === 'inactive_guests') query.lastStayDate = { $lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
  if (segment === 'recent_guests') query.lastStayDate = { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) };
  if (segment === 'birthday_guests') query.dateOfBirth = { $exists: true, $ne: null };
  if (segment === 'anniversary_guests') query.anniversaryDate = { $exists: true, $ne: null };
  if (segment === 'referral_guests') query.source = 'referral';
  if (filters.city) query.city = new RegExp(String(filters.city), 'i');
  if (filters.country) query.country = new RegExp(String(filters.country), 'i');
  if (filters.minSpend !== undefined || filters.maxSpend !== undefined) {
    query.totalSpend = {};
    if (filters.minSpend !== undefined) query.totalSpend.$gte = Number(filters.minSpend);
    if (filters.maxSpend !== undefined) query.totalSpend.$lte = Number(filters.maxSpend);
  }
  if (filters.minBookings !== undefined) query.totalBookings = { $gte: Number(filters.minBookings) };
  if (filters.lastStayDays !== undefined) query.lastStayDate = { $gte: new Date(Date.now() - Number(filters.lastStayDays) * 24 * 60 * 60 * 1000) };
  if (Array.isArray(filters.tags) && filters.tags.length) query.tags = { $in: filters.tags };
  return query;
};

const resolveAudience = async (campaign: Pick<IFestivalCampaign, 'hotelId' | 'channel' | 'audienceSegment' | 'audienceFilters'>) =>
  Guest.find(buildGuestFilter(String(campaign.hotelId), campaign.channel, campaign.audienceSegment, campaign.audienceFilters || {}))
    .select('fullName name phone email totalSpend totalBookings city country tags')
    .limit(5000)
    .lean();

const getTemplateForCampaign = async (campaign: IFestivalCampaign) => {
  if (campaign.templateId) return FestivalTemplate.findOne({ _id: campaign.templateId, hotelId: campaign.hotelId, isDeleted: { $ne: true } });
  return FestivalTemplate.findOne({ hotelId: campaign.hotelId, festivalId: campaign.festivalId, channel: campaign.channel, isActive: true, isDeleted: { $ne: true } }).sort({ isDefault: -1, updatedAt: -1 });
};

const addTimeline = (campaign: IFestivalCampaign, action: string, viewer?: Viewer, message?: string, metadata?: Record<string, unknown>) => {
  campaign.timeline = campaign.timeline || [];
  campaign.timeline.unshift({ action, message, createdAt: new Date(), createdBy: viewer?.userId ? new Types.ObjectId(viewer.userId) : undefined, metadata });
  campaign.timeline = campaign.timeline.slice(0, 50);
};

const createDeliveryAndJob = async (campaign: IFestivalCampaign, guest: any, scheduledAt?: Date) => {
  const template = await getTemplateForCampaign(campaign);
  const data = await getMessageData(String(campaign.hotelId), guest, campaign);
  const fallback = `Hi {{Guest Name}}, {{Hotel Name}} has a {{Festival Name}} offer for you: {{Offer}}. Use {{Coupon}} before {{Expiry Date}}.`;
  const body = renderTemplate(template?.body || fallback, data);
  const deduplicationKey = `festival:${campaign.hotelId}:${campaign.festivalId}:${guest._id}:${campaign.channel}:${dateKey(scheduledAt || new Date())}`;
  const existing = await FestivalDeliveryLog.findOne({ deduplicationKey, isDeleted: { $ne: true } });
  if (existing) return { duplicate: true, delivery: existing };
  const delivery = await FestivalDeliveryLog.create({
    hotelId: campaign.hotelId,
    festivalId: campaign.festivalId,
    campaignId: campaign._id,
    guestId: guest._id,
    templateId: template?._id,
    channel: campaign.channel,
    status: scheduledAt && scheduledAt.getTime() > Date.now() ? 'pending' : 'queued',
    scheduledFor: scheduledAt,
    recipientName: guest.fullName || guest.name,
    recipientMasked: maskContact(campaign.channel === 'email' ? guest.email : guest.phone),
    messagePreview: body.slice(0, 180),
    deduplicationKey,
    metadata: { simulated: true, offer: campaign.offer },
    createdBy: campaign.createdBy,
    updatedBy: campaign.updatedBy,
  });
  const settings = await getOrCreateSettings(String(campaign.hotelId));
  const job = await createAutomationJob({
    jobType: FESTIVAL_MESSAGE_JOB_TYPE,
    payload: { deliveryLogId: String(delivery._id), simulated: true, message: body },
    options: {
      hotelId: String(campaign.hotelId),
      scheduledAt,
      deduplicationKey,
      maxAttempts: settings.retryEnabled ? 3 : 1,
      metadata: { campaignId: String(campaign._id), festivalId: String(campaign.festivalId), channel: campaign.channel },
      createdBy: campaign.createdBy ? String(campaign.createdBy) : undefined,
    },
  });
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
  await audit(viewer, hotelId, 'festival.settings_updated', 'FestivalSettings', settings._id);
  return settings;
};

export const setPaused = async (paused: boolean, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  settings.isPaused = paused;
  settings.updatedBy = new Types.ObjectId(viewer.userId);
  await settings.save();
  await audit(viewer, hotelId, paused ? 'festival.paused' : 'festival.resumed', 'FestivalSettings', settings._id);
  return settings;
};

export const listFestivals = async (query: ListQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  await seedFestivalLibrary(hotelId, viewer);
  const filter: FilterQuery<any> = { hotelId, isDeleted: { $ne: true } };
  if (query.search) filter.name = new RegExp(query.search, 'i');
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([Festival.find(filter).sort({ date: 1 }).skip(skip).limit(query.limit), Festival.countDocuments(filter)]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};

export const createFestival = async (input: FestivalCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const festival = await Festival.create({ ...input, hotelId, slug: `${slugify(input.name)}-${Date.now()}`, isBuiltIn: false, createdBy: viewer.userId, updatedBy: viewer.userId });
  await audit(viewer, hotelId, 'festival.created', 'Festival', festival._id);
  return festival;
};

export const updateFestival = async (id: string, input: FestivalUpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const festival = await Festival.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!festival) throw new NotFoundError('Festival not found');
  Object.assign(festival, input, { updatedBy: viewer.userId });
  if (input.name) festival.slug = slugify(input.name);
  await festival.save();
  await audit(viewer, hotelId, 'festival.updated', 'Festival', festival._id);
  return festival;
};

export const listTemplates = async (query: TemplateListQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const filter: FilterQuery<any> = { hotelId, isDeleted: { $ne: true } };
  if (query.search) filter.name = new RegExp(query.search, 'i');
  if (query.channel) filter.channel = query.channel;
  if (query.festivalId) filter.festivalId = query.festivalId;
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([FestivalTemplate.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(query.limit), FestivalTemplate.countDocuments(filter)]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};

export const createTemplate = async (input: TemplateCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const template = await FestivalTemplate.create({ ...input, hotelId, variables: templateVariables(input.body), createdBy: viewer.userId, updatedBy: viewer.userId });
  await audit(viewer, hotelId, 'festival.template_created', 'FestivalTemplate', template._id);
  return template;
};

export const updateTemplate = async (id: string, input: TemplateUpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const template = await FestivalTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!template) throw new NotFoundError('Template not found');
  Object.assign(template, input, { variables: templateVariables(input.body || template.body), updatedBy: viewer.userId });
  await template.save();
  await audit(viewer, hotelId, 'festival.template_updated', 'FestivalTemplate', template._id);
  return template;
};

export const duplicateTemplate = async (id: string, name: string | undefined, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const template = await FestivalTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } }).lean();
  if (!template) throw new NotFoundError('Template not found');
  return createTemplate({ festivalId: template.festivalId ? String(template.festivalId) : undefined, name: name || `${template.name} Copy`, channel: template.channel, subject: template.subject, body: template.body, isActive: false, isDefault: false }, viewer);
};

export const deleteTemplate = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const template = await FestivalTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!template) throw new NotFoundError('Template not found');
  await (template as any).softDelete(viewer.userId);
  await audit(viewer, hotelId, 'festival.template_deleted', 'FestivalTemplate', template._id);
};

export const previewTemplate = async (id: string, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const template = await FestivalTemplate.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!template) throw new NotFoundError('Template not found');
  const body = renderTemplate(template.body, { 'Guest Name': 'Aarav Sharma', 'Hotel Name': 'Grand Palace', Offer: '20% off', Coupon: 'FEST20', 'Booking Link': 'https://hotel.example/book', 'Expiry Date': dateKey(new Date()), 'Manager Name': 'Hotel Manager', 'Review Link': '', 'Festival Name': 'Diwali', Signature: 'Warm regards' });
  return { subject: template.subject || '', body, variables: VARIABLES };
};

export const previewRecipients = async (input: Partial<CampaignCreateInput> & Pick<CampaignCreateInput, 'channel' | 'audienceSegment'>, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const guests = await Guest.find(buildGuestFilter(hotelId, input.channel, input.audienceSegment, input.audienceFilters || {})).select('fullName name phone email').limit(5000).lean();
  return { total: guests.length, sample: guests.slice(0, 10).map((guest: any) => ({ id: guest._id, name: guest.fullName || guest.name, contact: maskContact(input.channel === 'email' ? guest.email : guest.phone) })) };
};

export const listCampaigns = async (query: CampaignListQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const filter: FilterQuery<any> = { hotelId, isDeleted: { $ne: true } };
  if (query.search) filter.name = new RegExp(query.search, 'i');
  if (query.status) filter.status = query.status;
  if (query.channel) filter.channel = query.channel;
  if (query.audienceSegment) filter.audienceSegment = query.audienceSegment;
  if (query.festivalId) filter.festivalId = query.festivalId;
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([FestivalCampaign.find(filter).populate('festivalId', 'name date category').sort({ createdAt: -1 }).skip(skip).limit(query.limit), FestivalCampaign.countDocuments(filter)]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};

export const createCampaign = async (input: CampaignCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  if (settings.isPaused || !settings.isEnabled) throw new ValidationError('Festival automation is paused or disabled');
  const festival = await Festival.findOne({ _id: input.festivalId, hotelId, isDeleted: { $ne: true } });
  if (!festival) throw new NotFoundError('Festival not found');
  const recipients = await Guest.countDocuments(buildGuestFilter(hotelId, input.channel, input.audienceSegment, input.audienceFilters || {}));
  const campaign = await FestivalCampaign.create({
    hotelId,
    festivalId: input.festivalId,
    templateId: input.templateId,
    name: input.name,
    channel: input.channel,
    status: input.sendNow ? 'running' : (input.scheduledAt ? 'scheduled' : 'draft'),
    audienceSegment: input.audienceSegment,
    audienceFilters: input.audienceFilters || {},
    offer: input.offer,
    scheduledAt: input.scheduledAt,
    recurring: input.recurring,
    timezone: settings.timezone,
    recipientCount: recipients,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  addTimeline(campaign, 'created', viewer, 'Campaign created');
  if (input.sendNow || input.scheduledAt) {
    await createAutomationJob({ jobType: FESTIVAL_CAMPAIGN_JOB_TYPE, payload: { campaignId: String(campaign._id) }, options: { hotelId, scheduledAt: input.scheduledAt, deduplicationKey: `festival-campaign:${campaign._id}`, maxAttempts: settings.retryEnabled ? 3 : 1, createdBy: viewer.userId } });
  }
  await campaign.save();
  await audit(viewer, hotelId, 'festival.campaign_created', 'FestivalCampaign', campaign._id);
  return campaign;
};

const getCampaignOrThrow = async (id: string, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const campaign = await FestivalCampaign.findOne({ _id: id, hotelId, isDeleted: { $ne: true } });
  if (!campaign) throw new NotFoundError('Campaign not found');
  return campaign;
};

export const updateCampaign = async (id: string, input: CampaignUpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);
  Object.assign(campaign, input, { updatedBy: viewer.userId });
  addTimeline(campaign, 'updated', viewer, 'Campaign updated');
  await campaign.save();
  await audit(viewer, String(campaign.hotelId), 'festival.campaign_updated', 'FestivalCampaign', campaign._id);
  return campaign;
};

export const duplicateCampaign = async (id: string, viewer: Viewer) => {
  const campaign = await getCampaignOrThrow(id, viewer);
  return createCampaign({
    festivalId: String(campaign.festivalId),
    templateId: campaign.templateId ? String(campaign.templateId) : undefined,
    name: `${campaign.name} Copy`,
    channel: campaign.channel,
    audienceSegment: campaign.audienceSegment,
    audienceFilters: campaign.audienceFilters as any,
    offer: campaign.offer as any,
    recurring: campaign.recurring,
  }, viewer);
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
  if (status === 'cancelled') await FestivalDeliveryLog.updateMany({ campaignId: campaign._id, status: { $in: ['pending', 'queued'] } }, { status: 'cancelled' });
  await audit(viewer, String(campaign.hotelId), `festival.campaign_${status}`, 'FestivalCampaign', campaign._id);
  return campaign;
};

export const deleteCampaign = async (id: string, viewer: Viewer) => {
  const campaign = await getCampaignOrThrow(id, viewer);
  await (campaign as any).softDelete(viewer.userId);
  await audit(viewer, String(campaign.hotelId), 'festival.campaign_deleted', 'FestivalCampaign', campaign._id);
};

export const runCampaign = async (campaignId: string) => {
  const campaign = await FestivalCampaign.findById(campaignId);
  if (!campaign || ['cancelled', 'archived', 'paused'].includes(campaign.status)) return { skipped: true };
  const guests = await resolveAudience(campaign);
  let sent = 0;
  let failed = 0;
  for (const guest of guests) {
    try {
      const result = await createDeliveryAndJob(campaign, guest, campaign.scheduledAt);
      if (!result.duplicate) sent += 1;
    } catch {
      failed += 1;
    }
  }
  campaign.status = failed > 0 && sent === 0 ? 'failed' : 'completed';
  campaign.sentCount = sent;
  campaign.failedCount = failed;
  campaign.completedAt = new Date();
  addTimeline(campaign, 'completed', undefined, 'Campaign processing completed', { sent, failed });
  await campaign.save();
  return { recipients: guests.length, sent, failed };
};

export const processDelivery = async (deliveryLogId: string) => {
  const log = await FestivalDeliveryLog.findById(deliveryLogId);
  if (!log || log.status === 'cancelled') return { skipped: true };
  log.status = 'sent';
  log.sentAt = new Date();
  log.deliveredAt = new Date();
  log.metadata = { ...(log.metadata || {}), provider: 'simulated', openFutureReady: true, bookingConversionFutureReady: true };
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
  const [data, total] = await Promise.all([FestivalDeliveryLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit), FestivalDeliveryLog.countDocuments(filter)]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};

export const getDashboard = async (viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  await seedFestivalLibrary(hotelId, viewer);
  const [upcomingCampaigns, runningCampaigns, completedCampaigns, sent, failed, pending, total] = await Promise.all([
    FestivalCampaign.countDocuments({ hotelId, status: 'scheduled', isDeleted: { $ne: true } }),
    FestivalCampaign.countDocuments({ hotelId, status: 'running', isDeleted: { $ne: true } }),
    FestivalCampaign.countDocuments({ hotelId, status: 'completed', isDeleted: { $ne: true } }),
    FestivalDeliveryLog.countDocuments({ hotelId, status: { $in: ['sent', 'delivered', 'opened'] }, isDeleted: { $ne: true } }),
    FestivalDeliveryLog.countDocuments({ hotelId, status: 'failed', isDeleted: { $ne: true } }),
    FestivalDeliveryLog.countDocuments({ hotelId, status: { $in: ['pending', 'queued'] }, isDeleted: { $ne: true } }),
    FestivalDeliveryLog.countDocuments({ hotelId, isDeleted: { $ne: true } }),
  ]);
  return {
    upcomingCampaigns,
    runningCampaigns,
    completedCampaigns,
    messagesSent: sent,
    pendingMessages: pending,
    failedMessages: failed,
    deliveryRate: total ? Math.round(((total - failed) / total) * 100) : 0,
    openRate: 0,
    bookingConversion: 0,
    revenueGenerated: 0,
    automationHealth: pending > 0 ? 'queued' : 'healthy',
  };
};

export const getAnalytics = async (query: AnalyticsQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const since = new Date();
  since.setMonth(since.getMonth() - query.months + 1);
  since.setDate(1);
  const [total, failed, campaignPerformance, topFestivals, offerPerformance, monthlyTrends] = await Promise.all([
    FestivalDeliveryLog.countDocuments({ hotelId, isDeleted: { $ne: true } }),
    FestivalDeliveryLog.countDocuments({ hotelId, status: 'failed', isDeleted: { $ne: true } }),
    FestivalDeliveryLog.aggregate([{ $match: { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } } }, { $group: { _id: '$campaignId', reach: { $sum: 1 }, sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened']] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } }, { $limit: 10 }]),
    FestivalDeliveryLog.aggregate([{ $match: { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } } }, { $group: { _id: '$festivalId', total: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 10 }]),
    FestivalCampaign.aggregate([{ $match: { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } } }, { $group: { _id: '$offer.type', campaigns: { $sum: 1 }, sent: { $sum: '$sentCount' } } }]),
    FestivalDeliveryLog.aggregate([{ $match: { hotelId: new Types.ObjectId(hotelId), createdAt: { $gte: since }, isDeleted: { $ne: true } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);
  return {
    deliverySuccess: total ? Math.round(((total - failed) / total) * 100) : 0,
    failedMessages: failed,
    audienceReach: total,
    campaignPerformance,
    topFestivals,
    offerPerformance,
    monthlyTrends: monthlyTrends.map((item) => ({ month: item._id, count: item.count })),
  };
};

export const retryFailed = async (viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const failed = await FestivalDeliveryLog.find({ hotelId, status: 'failed', isDeleted: { $ne: true } }).limit(100);
  for (const log of failed) {
    log.retryCount += 1;
    log.status = 'queued';
    log.failedReason = undefined;
    await log.save();
    await createAutomationJob({ jobType: FESTIVAL_MESSAGE_JOB_TYPE, payload: { deliveryLogId: String(log._id), simulated: true, retry: true }, options: { hotelId, deduplicationKey: `${log.deduplicationKey}:retry:${log.retryCount}` } });
  }
  return { retried: failed.length };
};

export const sendTestCampaign = async (input: TestCampaignInput, viewer: Viewer) => {
  assertCanManage(viewer);
  resolveHotelId(viewer);
  return { success: true, simulated: true, recipient: maskContact(input.recipient), channel: input.channel || 'whatsapp' };
};

export const exportCampaigns = async (viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const rows = await FestivalCampaign.find({ hotelId, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(500).lean();
  return { generatedAt: new Date(), count: rows.length, rows };
};

let registered = false;
export const registerFestivalAutomationHandlers = () => {
  if (registered) return;
  registered = true;
  registerAutomationJobHandler(FESTIVAL_MESSAGE_JOB_TYPE, async ({ payload }) => processDelivery(String(payload?.deliveryLogId)));
  registerAutomationJobHandler(FESTIVAL_CAMPAIGN_JOB_TYPE, async ({ payload }) => runCampaign(String(payload?.campaignId)));
};
