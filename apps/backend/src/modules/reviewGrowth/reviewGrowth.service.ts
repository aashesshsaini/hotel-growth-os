import { Types } from 'mongoose';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import {
  AnalyticsQuery,
  AutoSendToggleInput,
  DashboardQuery,
  DuplicateTemplateInput,
  ExportQuery,
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
import {
  assignInternalFeedbackRepository,
  clearDefaultReviewTemplatesRepository,
  createGuestReviewRepository,
  createInternalFeedbackRepository,
  createReviewCampaignRepository,
  createReviewGrowthAudit,
  createReviewGrowthNotificationsRepository,
  createReviewRequestRepository,
  createReviewTemplateRepository,
  findBookingForReviewGrowth,
  findGuestForReviewGrowth,
  findGuestReviewByIdRepository,
  findInternalFeedbackByIdRepository,
  findReviewCampaignByIdRepository,
  findReviewCampaignByNameRepository,
  findReviewExportRowsRepository,
  findReviewNotificationUsersRepository,
  findReviewRequestByIdRepository,
  findReviewRequestHistoryRepository,
  findReviewSettingsRepository,
  findReviewTemplateByIdRepository,
  generateReviewRequestToken,
  getReviewAnalyticsRepository,
  getReviewDashboardRepository,
  listGuestReviewsRepository,
  listInternalFeedbackRepository,
  listReviewCampaignsRepository,
  listReviewRequestsRepository,
  listReviewTemplatesRepository,
  softDeleteReviewCampaignRepository,
  softDeleteReviewTemplateRepository,
  updateInternalFeedbackStatusRepository,
  updateReviewCampaignRepository,
  updateReviewRequestStatusRepository,
  updateReviewTemplateRepository,
  upsertReviewSettingsRepository,
} from './reviewGrowth.repository';

interface Viewer { userId: string; role: string; hotelId?: string }

const VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];
const MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'];

const assertCanView = (viewer: Viewer) => {
  if (!VIEW_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to view review growth');
};

const assertCanManage = (viewer: Viewer) => {
  if (!MANAGE_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to manage review growth');
};

const resolveHotelId = (viewer: Viewer, inputHotelId?: string) => {
  const hotelId = viewer.role === 'super_admin' && inputHotelId ? inputHotelId : viewer.hotelId;
  if (!hotelId) throw new ValidationError('Hotel ID is required');
  return hotelId;
};

const assertHotelAccess = (viewer: Viewer, hotelId: string) => {
  if (viewer.role !== 'super_admin' && viewer.hotelId !== hotelId) throw new ForbiddenError('Access denied to this hotel');
};

const range = (query: { fromDate?: Date; toDate?: Date }) => {
  const to = query.toDate ?? new Date();
  const from = query.fromDate ?? new Date(to.getFullYear(), to.getMonth() - 5, 1);
  return { from, to };
};

const createdAtFilter = (query: { fromDate?: Date; toDate?: Date }) =>
  query.fromDate || query.toDate ? { createdAt: { ...(query.fromDate ? { $gte: query.fromDate } : {}), ...(query.toDate ? { $lte: query.toDate } : {}) } } : {};

const timeline = (action: string, viewer: Viewer, message?: string, metadata?: Record<string, unknown>) => ({
  action,
  message,
  createdAt: new Date(),
  createdBy: new Types.ObjectId(viewer.userId),
  metadata,
});

const statusTimestamp = (status: ReviewRequestStatusInput['status']) => {
  const now = new Date();
  return {
    PENDING: {},
    QUEUED: { queuedAt: now },
    PROCESSING: {},
    SENT: { sentAt: now },
    DELIVERED: { deliveredAt: now },
    OPENED: { openedAt: now },
    CLICKED: { clickedAt: now },
    REVIEWED: { reviewedAt: now },
    FAILED: { failedAt: now },
    EXPIRED: { expiredAt: now },
  }[status];
};

const validateTemplateVariables = (body: string, variables?: string[]) => {
  const tokens = Array.from(body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)).map((match) => match[1]);
  const unknown = variables?.length ? tokens.filter((token) => !variables.includes(token)) : [];
  if (unknown.length) throw new ValidationError(`Template variables not declared: ${unknown.join(', ')}`);
};

const notifyHotelReviewUsers = async (
  hotelId: string,
  payload: { title: string; message: string; type?: 'info' | 'warning' | 'success' | 'error'; metadata?: Record<string, unknown> }
) => {
  const users = await findReviewNotificationUsersRepository(hotelId);
  await createReviewGrowthNotificationsRepository({ hotelId, userIds: users.map((user) => user._id as Types.ObjectId), ...payload });
};

const ensureCampaignNameUnique = async (hotelId: string, name?: string, excludeId?: string) => {
  if (!name) return;
  if (await findReviewCampaignByNameRepository(hotelId, name, excludeId)) throw new ConflictError('Review campaign name already exists');
};

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map((row) => headers.map((key) => JSON.stringify(row[key] ?? '')).join(','))].join('\n');
};

export const getDashboard = async (query: DashboardQuery, viewer: Viewer) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer, query.hotelId);
  assertHotelAccess(viewer, hotelId);
  const data = await getReviewDashboardRepository(hotelId, range(query));
  const reviewed = data.ratingDistribution.reduce((sum: number, row: any) => sum + row.count, 0);
  return {
    averageRating: Number((data.ratingAgg[0]?.averageRating ?? 0).toFixed(1)),
    totalReviews: data.totalReviews,
    reviewsThisMonth: data.reviewsThisMonth,
    reviewRequestsSent: data.requestsSent,
    pendingRequests: data.pendingRequests,
    todaysRequests: data.todaysRequests,
    reviewConversion: data.requestsSent ? Math.round((reviewed / data.requestsSent) * 100) : 0,
    negativeFeedbackCount: data.negativeFeedbackCount,
    estimatedReviewGrowth: data.requestsSent ? Math.round(data.requestsSent * 0.18) : 0,
    monthlyTrend: data.monthlyTrend.map((row: any) => ({ month: row._id, count: row.count, averageRating: Number((row.averageRating ?? 0).toFixed(1)) })),
    ratingDistribution: data.ratingDistribution.reduce<Record<string, number>>((acc, row: any) => ({ ...acc, [String(row._id)]: row.count }), { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }),
    recentReviews: data.recentReviews,
  };
};

export const listReviewCampaigns = async (query: ReviewCampaignListQuery, viewer: Viewer) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer, query.hotelId);
  assertHotelAccess(viewer, hotelId);
  return listReviewCampaignsRepository({ hotelId, ...(query.trigger ? { trigger: query.trigger } : {}), ...(query.isActive !== undefined ? { isActive: query.isActive } : {}), ...createdAtFilter(query) }, query);
};

export const getReviewCampaign = async (id: string, viewer: Viewer) => {
  assertCanView(viewer);
  const campaign = await findReviewCampaignByIdRepository(id);
  if (!campaign) throw new NotFoundError('Review campaign not found');
  assertHotelAccess(viewer, String(campaign.hotelId));
  return campaign;
};

export const createReviewCampaign = async (input: ReviewCampaignCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer, input.hotelId);
  assertHotelAccess(viewer, hotelId);
  await ensureCampaignNameUnique(hotelId, input.name);
  const campaign = await createReviewCampaignRepository({ ...input, hotelId, timeline: [timeline('review_growth.campaign_created', viewer, 'Review growth campaign created')], createdBy: viewer.userId, updatedBy: viewer.userId });
  await createReviewGrowthAudit({ hotelId, userId: viewer.userId, action: 'review_growth.campaign_created', entity: 'ReviewCampaign', entityId: campaign._id, changes: { newValue: input } });
  return campaign;
};

export const updateReviewCampaign = async (id: string, input: ReviewCampaignUpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const campaign = await getReviewCampaign(id, viewer);
  await ensureCampaignNameUnique(String(campaign.hotelId), input.name, id);
  const oldValue = campaign.toObject();
  Object.assign(campaign, input, { updatedBy: viewer.userId });
  campaign.timeline.unshift(timeline('review_growth.campaign_updated', viewer, 'Review growth campaign updated', { fields: Object.keys(input) }));
  await updateReviewCampaignRepository(campaign);
  await createReviewGrowthAudit({ hotelId: campaign.hotelId, userId: viewer.userId, action: 'review_growth.campaign_updated', entity: 'ReviewCampaign', entityId: campaign._id, changes: { oldValue, newValue: input } });
  return campaign;
};

export const removeReviewCampaign = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const campaign = await getReviewCampaign(id, viewer);
  await softDeleteReviewCampaignRepository(id, viewer.userId);
  await createReviewGrowthAudit({ hotelId: campaign.hotelId, userId: viewer.userId, action: 'review_growth.campaign_deleted', entity: 'ReviewCampaign', entityId: campaign._id });
};

export const setReviewCampaignActive = async (id: string, isActive: boolean, viewer: Viewer) => {
  assertCanManage(viewer);
  const campaign = await getReviewCampaign(id, viewer);
  campaign.isActive = isActive;
  campaign.updatedBy = new Types.ObjectId(viewer.userId);
  campaign.timeline.unshift(timeline(isActive ? 'review_growth.campaign_enabled' : 'review_growth.campaign_disabled', viewer));
  await updateReviewCampaignRepository(campaign);
  await createReviewGrowthAudit({ hotelId: campaign.hotelId, userId: viewer.userId, action: isActive ? 'review_growth.campaign_enabled' : 'review_growth.campaign_disabled', entity: 'ReviewCampaign', entityId: campaign._id, changes: { isActive } });
  return campaign;
};

export const markReviewCampaignOutcome = async (id: string, outcome: 'completed' | 'failed', viewer: Viewer) => {
  assertCanManage(viewer);
  const campaign = await getReviewCampaign(id, viewer);
  if (outcome === 'failed') campaign.isActive = false;
  campaign.updatedBy = new Types.ObjectId(viewer.userId);
  campaign.timeline.unshift(timeline(`review_growth.campaign_${outcome}`, viewer, `Review campaign ${outcome}`));
  await updateReviewCampaignRepository(campaign);
  await createReviewGrowthAudit({
    hotelId: campaign.hotelId,
    userId: viewer.userId,
    action: `review_growth.campaign_${outcome}`,
    entity: 'ReviewCampaign',
    entityId: campaign._id,
  });
  await notifyHotelReviewUsers(String(campaign.hotelId), {
    title: outcome === 'completed' ? 'Review Campaign Completed' : 'Review Campaign Failed',
    message: `${campaign.name} has been marked ${outcome}.`,
    type: outcome === 'completed' ? 'success' : 'error',
    metadata: { campaignId: campaign._id, outcome },
  });
  return campaign;
};

export const listReviewRequests = async (query: ReviewRequestListQuery, viewer: Viewer) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer, query.hotelId);
  assertHotelAccess(viewer, hotelId);
  return listReviewRequestsRepository({ hotelId, ...(query.status ? { status: query.status } : {}), ...(query.guestId ? { guestId: query.guestId } : {}), ...(query.bookingId ? { bookingId: query.bookingId } : {}), ...(query.campaignId ? { campaignId: query.campaignId } : {}), ...createdAtFilter(query) }, query);
};

export const getReviewRequest = async (id: string, viewer: Viewer) => {
  assertCanView(viewer);
  const request = await findReviewRequestByIdRepository(id);
  if (!request) throw new NotFoundError('Review request not found');
  assertHotelAccess(viewer, String(request.hotelId));
  return request;
};

export const getReviewRequestHistory = async (id: string, viewer: Viewer) => {
  await getReviewRequest(id, viewer);
  return findReviewRequestHistoryRepository(id);
};

export const createReviewRequest = async (input: ReviewRequestCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer, input.hotelId);
  assertHotelAccess(viewer, hotelId);
  const [booking, guest] = await Promise.all([findBookingForReviewGrowth(hotelId, input.bookingId), findGuestForReviewGrowth(hotelId, input.guestId)]);
  if (!booking) throw new NotFoundError('Booking not found for this hotel');
  if (!guest) throw new NotFoundError('Guest not found for this hotel');
  if (String(booking.guestId) !== input.guestId) throw new ValidationError('Guest does not belong to this booking');
  const request = await createReviewRequestRepository({ ...input, hotelId, publicToken: generateReviewRequestToken(), recipientPhone: input.recipientPhone ?? guest.phone, recipientEmail: input.recipientEmail ?? guest.email, status: input.scheduledAt ? 'QUEUED' : 'PENDING', queuedAt: input.scheduledAt ? new Date() : undefined, timeline: [timeline('review_growth.request_created', viewer, 'Review request created')], createdBy: viewer.userId, updatedBy: viewer.userId });
  await createReviewGrowthAudit({ hotelId, userId: viewer.userId, action: 'review_growth.request_created', entity: 'ReviewRequest', entityId: request._id, changes: { bookingId: input.bookingId, guestId: input.guestId } });
  return request;
};

export const updateReviewRequestStatus = async (id: string, input: ReviewRequestStatusInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const existing = await getReviewRequest(id, viewer);
  const request = await updateReviewRequestStatusRepository(id, { status: input.status, failureReason: input.failureReason, ...statusTimestamp(input.status), updatedBy: viewer.userId, $push: { timeline: timeline(`review_growth.request_${input.status.toLowerCase()}`, viewer, `Review request marked ${input.status}`) } });
  await createReviewGrowthAudit({ hotelId: existing.hotelId, userId: viewer.userId, action: input.status === 'SENT' ? 'review_growth.review_sent' : `review_growth.request_${input.status.toLowerCase()}`, entity: 'ReviewRequest', entityId: existing._id, changes: { newValue: input } });
  return request;
};

export const sendReviewRequest = async (id: string, input: ReviewRequestSendInput, viewer: Viewer) => {
  if (input.channel || input.recipientEmail || input.recipientPhone) await updateReviewRequestStatusRepository(id, { ...input, updatedBy: viewer.userId });
  return updateReviewRequestStatus(id, { status: 'SENT' }, viewer);
};

export const resendReviewRequest = async (id: string, input: ReviewRequestSendInput, viewer: Viewer) => {
  const existing = await getReviewRequest(id, viewer);
  const request = await updateReviewRequestStatusRepository(id, { ...input, status: 'SENT', sentAt: new Date(), updatedBy: viewer.userId, $push: { timeline: timeline('review_growth.request_resent', viewer, 'Review request resent') } });
  await createReviewGrowthAudit({ hotelId: existing.hotelId, userId: viewer.userId, action: 'review_growth.request_resent', entity: 'ReviewRequest', entityId: existing._id });
  return request;
};

export const cancelReviewRequest = async (id: string, input: ReviewRequestCancelInput, viewer: Viewer) => {
  const existing = await getReviewRequest(id, viewer);
  const request = await updateReviewRequestStatusRepository(id, { status: 'EXPIRED', expiredAt: new Date(), failureReason: input.reason, updatedBy: viewer.userId, $push: { timeline: timeline('review_growth.request_cancelled', viewer, 'Review request cancelled', { reason: input.reason }) } });
  await createReviewGrowthAudit({ hotelId: existing.hotelId, userId: viewer.userId, action: 'review_growth.request_cancelled', entity: 'ReviewRequest', entityId: existing._id, changes: { reason: input.reason } });
  return request;
};

export const listGuestReviews = async (query: GuestReviewListQuery, viewer: Viewer) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer, query.hotelId);
  assertHotelAccess(viewer, hotelId);
  return listGuestReviewsRepository({ hotelId, ...(query.guestId ? { guestId: query.guestId } : {}), ...(query.bookingId ? { bookingId: query.bookingId } : {}), ...(query.platform ? { platform: query.platform } : {}), ...(query.rating ? { rating: query.rating } : {}), ...(query.ratingMin || query.ratingMax ? { rating: { ...(query.ratingMin ? { $gte: query.ratingMin } : {}), ...(query.ratingMax ? { $lte: query.ratingMax } : {}) } } : {}), ...(query.fromDate || query.toDate ? { reviewedAt: { ...(query.fromDate ? { $gte: query.fromDate } : {}), ...(query.toDate ? { $lte: query.toDate } : {}) } } : {}) }, query);
};

export const getGuestReview = async (id: string, viewer: Viewer) => {
  assertCanView(viewer);
  const review = await findGuestReviewByIdRepository(id);
  if (!review) throw new NotFoundError('Guest review not found');
  assertHotelAccess(viewer, String(review.hotelId));
  return review;
};

export const createGuestReview = async (input: GuestReviewCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer, input.hotelId);
  assertHotelAccess(viewer, hotelId);
  const guest = await findGuestForReviewGrowth(hotelId, input.guestId);
  if (!guest) throw new NotFoundError('Guest not found for this hotel');
  const review = await createGuestReviewRepository({ ...input, hotelId, reviewedAt: input.reviewedAt ?? new Date(), timeline: [timeline('review_growth.review_completed', viewer, 'Guest review completed')], createdBy: viewer.userId, updatedBy: viewer.userId });
  await createReviewGrowthAudit({ hotelId, userId: viewer.userId, action: 'review_growth.review_submitted', entity: 'GuestReview', entityId: review._id, changes: { rating: input.rating, platform: input.platform } });
  await notifyHotelReviewUsers(hotelId, { title: 'New Review Submitted', message: `${guest.fullName || guest.name} submitted a ${input.rating}-star review.`, type: input.rating <= 3 ? 'warning' : 'success', metadata: { reviewId: review._id } });
  return review;
};

export const listInternalFeedback = async (query: InternalFeedbackListQuery, viewer: Viewer) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer, query.hotelId);
  assertHotelAccess(viewer, hotelId);
  return listInternalFeedbackRepository({ hotelId, ...(query.priority ? { priority: query.priority } : {}), ...(query.status ? { status: query.status } : {}), ...(query.category ? { category: query.category } : {}), ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}), ...createdAtFilter(query) }, query);
};

export const getInternalFeedback = async (id: string, viewer: Viewer) => {
  assertCanView(viewer);
  const feedback = await findInternalFeedbackByIdRepository(id);
  if (!feedback) throw new NotFoundError('Internal feedback not found');
  assertHotelAccess(viewer, String(feedback.hotelId));
  return feedback;
};

export const createInternalFeedback = async (input: InternalFeedbackCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer, input.hotelId);
  assertHotelAccess(viewer, hotelId);
  const guest = await findGuestForReviewGrowth(hotelId, input.guestId);
  if (!guest) throw new NotFoundError('Guest not found for this hotel');
  const feedback = await createInternalFeedbackRepository({ ...input, hotelId, status: 'OPEN', timeline: [timeline('review_growth.feedback_submitted', viewer, 'Internal feedback submitted')], createdBy: viewer.userId, updatedBy: viewer.userId });
  await createReviewGrowthAudit({ hotelId, userId: viewer.userId, action: 'review_growth.feedback_submitted', entity: 'InternalFeedback', entityId: feedback._id, changes: { rating: input.rating, priority: input.priority } });
  if ((input.rating ?? 5) <= 3 || ['high', 'urgent'].includes(input.priority)) await notifyHotelReviewUsers(hotelId, { title: 'Negative Feedback Received', message: `${guest.fullName || guest.name} submitted feedback requiring attention.`, type: 'warning', metadata: { feedbackId: feedback._id } });
  return feedback;
};

export const assignInternalFeedback = async (id: string, input: InternalFeedbackAssignInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const existing = await getInternalFeedback(id, viewer);
  const feedback = await assignInternalFeedbackRepository(id, input.assignedTo, viewer.userId);
  await createReviewGrowthAudit({ hotelId: existing.hotelId, userId: viewer.userId, action: 'review_growth.feedback_assigned', entity: 'InternalFeedback', entityId: existing._id, changes: { assignedTo: input.assignedTo } });
  await createReviewGrowthNotificationsRepository({ hotelId: existing.hotelId, userIds: [input.assignedTo], title: 'Feedback Assigned', message: 'A review feedback item has been assigned to you.', type: 'info', metadata: { feedbackId: existing._id } });
  return feedback;
};

export const updateInternalFeedbackStatus = async (id: string, input: InternalFeedbackStatusInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const existing = await getInternalFeedback(id, viewer);
  const now = new Date();
  const feedback = await updateInternalFeedbackStatusRepository(id, { status: input.status, resolutionNotes: input.resolutionNotes, resolvedAt: input.status === 'RESOLVED' ? now : undefined, closedAt: input.status === 'CLOSED' ? now : undefined, updatedBy: viewer.userId, $push: { timeline: timeline(`review_growth.feedback_${input.status.toLowerCase()}`, viewer, `Feedback marked ${input.status}`) } });
  await createReviewGrowthAudit({ hotelId: existing.hotelId, userId: viewer.userId, action: input.status === 'RESOLVED' ? 'review_growth.feedback_resolved' : `review_growth.feedback_${input.status.toLowerCase()}`, entity: 'InternalFeedback', entityId: existing._id, changes: { newValue: input } });
  return feedback;
};

export const resolveInternalFeedback = (id: string, input: InternalFeedbackStatusInput, viewer: Viewer) =>
  updateInternalFeedbackStatus(id, { ...input, status: 'RESOLVED' }, viewer);

export const listReviewTemplates = async (query: ReviewTemplateListQuery, viewer: Viewer) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer, query.hotelId);
  assertHotelAccess(viewer, hotelId);
  return listReviewTemplatesRepository({ hotelId, ...(query.platform ? { platform: query.platform } : {}), ...(query.channel ? { channel: query.channel } : {}), ...(query.isActive !== undefined ? { isActive: query.isActive } : {}) }, query);
};

export const getReviewTemplate = async (id: string, viewer: Viewer) => {
  assertCanView(viewer);
  const template = await findReviewTemplateByIdRepository(id);
  if (!template) throw new NotFoundError('Review template not found');
  assertHotelAccess(viewer, String(template.hotelId));
  return template;
};

export const createReviewTemplate = async (input: ReviewTemplateCreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer, input.hotelId);
  assertHotelAccess(viewer, hotelId);
  validateTemplateVariables(input.body, input.variables);
  if (input.isDefault) await clearDefaultReviewTemplatesRepository(hotelId, input.channel, input.platform);
  return createReviewTemplateRepository({ ...input, hotelId, createdBy: viewer.userId, updatedBy: viewer.userId });
};

export const updateReviewTemplate = async (id: string, input: ReviewTemplateUpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const existing = await getReviewTemplate(id, viewer);
  if (input.body) validateTemplateVariables(input.body, input.variables ?? existing.variables);
  if (input.isDefault) await clearDefaultReviewTemplatesRepository(String(existing.hotelId), input.channel ?? existing.channel, input.platform ?? existing.platform);
  return updateReviewTemplateRepository(id, { ...input, updatedBy: viewer.userId });
};

export const removeReviewTemplate = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const existing = await getReviewTemplate(id, viewer);
  return softDeleteReviewTemplateRepository(String(existing._id), viewer.userId);
};

export const duplicateReviewTemplate = async (id: string, input: DuplicateTemplateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const existing = await getReviewTemplate(id, viewer);
  return createReviewTemplateRepository({ hotelId: existing.hotelId, name: input.name ?? `${existing.name} Copy`, platform: existing.platform, channel: existing.channel, subject: existing.subject, body: existing.body, variables: existing.variables, isActive: true, isDefault: false, createdBy: viewer.userId, updatedBy: viewer.userId });
};

export const setDefaultReviewTemplate = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const existing = await getReviewTemplate(id, viewer);
  await clearDefaultReviewTemplatesRepository(String(existing.hotelId), existing.channel, existing.platform);
  return updateReviewTemplateRepository(id, { isDefault: true, updatedBy: viewer.userId });
};

export const getReviewSettings = async (query: { hotelId?: string }, viewer: Viewer) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer, query.hotelId);
  assertHotelAccess(viewer, hotelId);
  return findReviewSettingsRepository(hotelId);
};

export const upsertReviewSettings = async (input: ReviewSettingsInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer, input.hotelId);
  assertHotelAccess(viewer, hotelId);
  const settings = await upsertReviewSettingsRepository(hotelId, { ...input, updatedBy: viewer.userId });
  await createReviewGrowthAudit({ hotelId, userId: viewer.userId, action: 'review_growth.settings_updated', entity: 'ReviewSettings', entityId: settings._id, changes: { newValue: input } });
  return settings;
};

export const validateGoogleReviewUrl = async (url: string) => ({ valid: true, url });

export const toggleAutoSend = async (input: AutoSendToggleInput & { hotelId?: string }, viewer: Viewer) =>
  upsertReviewSettings({ hotelId: input.hotelId, autoSendOnCheckout: input.enabled, autoSendOnBookingCompleted: input.enabled } as ReviewSettingsInput, viewer);

export const configureReminders = async (input: ReminderConfigurationInput & { hotelId?: string }, viewer: Viewer) =>
  upsertReviewSettings(input as ReviewSettingsInput, viewer);

export const getAnalytics = async (query: AnalyticsQuery, viewer: Viewer) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer, query.hotelId);
  assertHotelAccess(viewer, hotelId);
  return getReviewAnalyticsRepository(hotelId, range(query), query.campaignId);
};

export const exportReviews = async (query: ExportQuery, viewer: Viewer) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer, query.hotelId);
  assertHotelAccess(viewer, hotelId);
  const filter = {
    hotelId: new Types.ObjectId(hotelId),
    isDeleted: { $ne: true },
    ...(query.guestId ? { guestId: new Types.ObjectId(query.guestId) } : {}),
    ...(query.rating ? { rating: query.rating } : {}),
    ...(query.fromDate || query.toDate ? { reviewedAt: { ...(query.fromDate ? { $gte: query.fromDate } : {}), ...(query.toDate ? { $lte: query.toDate } : {}) } } : {}),
  };
  const rows = (await findReviewExportRowsRepository(filter)).map((row: any) => ({
    reviewId: String(row._id),
    guest: row.guestId?.fullName ?? row.guestId?.name ?? '',
    booking: row.bookingId?.bookingNumber ?? '',
    platform: row.platform,
    rating: row.rating,
    sentiment: row.sentiment,
    reviewedAt: row.reviewedAt,
    comment: row.comment ?? '',
  }));
  return {
    filename: `review-growth-${Date.now()}.${query.format === 'excel' ? 'xlsx' : query.format}`,
    contentType: query.format === 'csv' ? 'text/csv' : query.format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf',
    format: query.format,
    data: query.format === 'csv' ? csv(rows) : rows,
  };
};
