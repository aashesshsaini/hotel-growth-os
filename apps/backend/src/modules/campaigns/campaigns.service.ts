import { FilterQuery, Types } from 'mongoose';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { ICampaign } from '../../models/Campaign';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { addCampaignJob } from '../../services/queue.service';
import {
  AddCampaignNoteInput,
  CreateCampaignInput,
  LaunchCampaignInput,
  ListCampaignLogsQuery,
  ListCampaignsQuery,
  UpdateCampaignInput,
  UpdateCampaignStatusInput,
} from './campaigns.validation';
import {
  AudiencePreviewResult,
  CampaignStatsResult,
  SanitizedCampaign,
  SanitizedCampaignLog,
  ViewerContext,
} from './campaign.types';
import {
  createAuditLogRepository,
  createCampaignLogsBulkRepository,
  createCampaignRepository,
  findAuditLogsByCampaignIdRepository,
  findCampaignByIdRepository,
  findCampaignLogsRepository,
  findCampaignsRepository,
  findMarketingStaffRepository,
  findUserByIdRepository,
  getCampaignStatsRepository,
  previewCampaignAudienceRepository,
  processPendingCampaignLogsRepository,
  resolveCampaignAudienceRepository,
  softDeleteCampaignRepository,
  syncCampaignStatsFromLogsRepository,
  updateCampaignRepository,
} from './campaign.repository';

const CAMPAIGN_VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];
const CAMPAIGN_MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'];

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
  if (!CAMPAIGN_VIEW_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to view campaigns');
  }
};

const assertCanManage = (viewer: ViewerContext): void => {
  if (!CAMPAIGN_MANAGE_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to manage campaigns');
  }
};

const inferChannelFromType = (type: string): ICampaign['channel'] => {
  if (type === 'sms_campaign') return 'sms';
  if (type === 'email_campaign') return 'email';
  return 'whatsapp';
};

const inferAudienceFromType = (type: string): ICampaign['audienceSegment'] => {
  switch (type) {
    case 'old_guests':
    case 'repeat_guest_offer':
      return 'past_guests';
    case 'birthday_offer':
      return 'all_guests';
    case 'corporate_offer':
      return 'corporate_guests';
    case 'wedding_event_promotion':
      return 'leads';
    case 'ota_to_direct':
      return 'inactive_guests';
    default:
      return 'all_guests';
  }
};

const sanitizeCampaign = (campaign: ICampaign, auditLogs?: unknown[]): SanitizedCampaign => {
  const doc = campaign.toObject ? campaign.toObject() : campaign;
  return { ...doc, id: doc._id?.toString(), auditLogs };
};

const sanitizeCampaignLog = (log: Record<string, unknown>): SanitizedCampaignLog => {
  const campaign = log.campaignId as Record<string, unknown> | undefined;
  return {
    ...(log as SanitizedCampaignLog),
    id: String(log._id),
    campaign: campaign && typeof campaign === 'object' && campaign._id
      ? {
          id: String(campaign._id),
          name: String(campaign.name ?? ''),
          type: String(campaign.type ?? ''),
          status: String(campaign.status ?? ''),
          campaignNumber: campaign.campaignNumber ? String(campaign.campaignNumber) : undefined,
        }
      : undefined,
  };
};

const addTimeline = (
  campaign: ICampaign,
  action: string,
  viewer: ViewerContext,
  message?: string,
  metadata?: Record<string, unknown>
) => {
  campaign.timeline = campaign.timeline ?? [];
  campaign.timeline.unshift({
    action,
    message,
    createdAt: new Date(),
    createdBy: new Types.ObjectId(viewer.userId),
    metadata,
  });
  campaign.timeline = campaign.timeline.slice(0, 50);
};

const logAudit = async (
  action: string,
  campaign: ICampaign,
  viewer: ViewerContext,
  changes?: Record<string, unknown>
) => {
  await createAuditLogRepository({
    hotelId: campaign.hotelId,
    userId: viewer.userId,
    action,
    entity: 'Campaign',
    entityId: campaign._id,
    changes,
  });
};

const buildFilter = (query: ListCampaignsQuery, hotelId: string): FilterQuery<ICampaign> => {
  const filter: FilterQuery<ICampaign> = { hotelId, isDeleted: { $ne: true } };
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.channel) filter.channel = query.channel;
  if (query.audienceSegment) filter.audienceSegment = query.audienceSegment;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.scheduledFrom || query.scheduledTo) {
    filter.scheduledAt = {};
    if (query.scheduledFrom) filter.scheduledAt.$gte = query.scheduledFrom;
    if (query.scheduledTo) filter.scheduledAt.$lte = query.scheduledTo;
  }
  if (query.createdFrom || query.createdTo) {
    filter.createdAt = {};
    if (query.createdFrom) filter.createdAt.$gte = query.createdFrom;
    if (query.createdTo) filter.createdAt.$lte = query.createdTo;
  }
  return filter;
};

const getCampaignOrThrow = async (id: string, viewer: ViewerContext): Promise<ICampaign> => {
  const campaign = await findCampaignByIdRepository(id);
  if (!campaign) throw new NotFoundError('Campaign not found');
  assertHotelAccess(viewer, campaign.hotelId.toString());
  return campaign;
};

const ensureAssignableStaff = async (hotelId: string, assignedTo?: string) => {
  if (!assignedTo) return;
  const user = await findUserByIdRepository(assignedTo);
  if (!user) throw new NotFoundError('Assigned user not found');
  const staff = await findMarketingStaffRepository(hotelId, assignedTo);
  if (!staff) throw new ValidationError('Assigned user must be active marketing staff');
};

const refreshCampaignStats = async (campaign: ICampaign) => {
  const stats = await syncCampaignStatsFromLogsRepository(campaign._id.toString());
  campaign.stats = {
    total: stats.total,
    sent: stats.sent,
    delivered: stats.delivered,
    failed: stats.failed,
    responded: stats.responded,
    leadsGenerated: stats.leadsGenerated,
    bookingsGenerated: stats.bookingsGenerated,
    revenueGenerated: stats.revenueGenerated,
  };
};

export const list = async (
  query: ListCampaignsQuery,
  viewer: ViewerContext
): Promise<PaginatedResponse<SanitizedCampaign>> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const result = await findCampaignsRepository(buildFilter(query, hotelId), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['name', 'message', 'description', 'campaignNumber', 'targetAudience'],
    sortBy: query.sortBy ?? 'createdAt',
    sortOrder: query.sortOrder ?? 'desc',
  });
  return {
    ...result,
    data: result.data.map((campaign) => sanitizeCampaign(campaign)),
  };
};

export const stats = async (viewer: ViewerContext, hotelIdInput?: string): Promise<CampaignStatsResult> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(hotelIdInput, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  return getCampaignStatsRepository(hotelId);
};

export const getById = async (id: string, viewer: ViewerContext): Promise<SanitizedCampaign> => {
  assertCanView(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);
  const auditLogs = CAMPAIGN_MANAGE_ROLES.includes(viewer.role)
    ? await findAuditLogsByCampaignIdRepository(campaign._id)
    : undefined;
  return sanitizeCampaign(campaign, auditLogs);
};

export const create = async (input: CreateCampaignInput, viewer: ViewerContext): Promise<SanitizedCampaign> => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  await ensureAssignableStaff(hotelId, input.assignedTo);

  const channel = input.channel ?? inferChannelFromType(input.type);
  const audienceSegment = input.audienceSegment ?? inferAudienceFromType(input.type);
  const status = input.status ?? (input.scheduledAt ? 'scheduled' : 'draft');

  const campaign = await createCampaignRepository({
    hotelId,
    name: input.name,
    type: input.type,
    channel,
    message: input.message,
    subject: input.subject,
    description: input.description,
    targetAudience: input.targetAudience,
    audienceSegment,
    audienceFilters: input.audienceFilters,
    scheduledAt: input.scheduledAt,
    status,
    assignedTo: input.assignedTo,
    internalNotes: input.internalNotes,
    tags: input.tags ?? [],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
    timeline: [
      {
        action: 'created',
        message: 'Campaign created',
        createdAt: new Date(),
        createdBy: new Types.ObjectId(viewer.userId),
      },
    ],
  });

  await logAudit('campaign.created', campaign, viewer, { status: campaign.status, type: campaign.type });
  return sanitizeCampaign(campaign);
};

export const update = async (
  id: string,
  input: UpdateCampaignInput,
  viewer: ViewerContext
): Promise<SanitizedCampaign> => {
  assertCanManage(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);

  if (['running', 'completed', 'cancelled'].includes(campaign.status) && input.message) {
    throw new ValidationError('Cannot edit message content after campaign has launched');
  }

  await ensureAssignableStaff(campaign.hotelId.toString(), input.assignedTo);

  const previousStatus = campaign.status;
  Object.assign(campaign, input, { updatedBy: viewer.userId });

  if (input.type && !input.channel) campaign.channel = inferChannelFromType(input.type);
  if (input.scheduledAt && campaign.status === 'draft') campaign.status = 'scheduled';

  addTimeline(campaign, 'updated', viewer, 'Campaign details updated');
  await updateCampaignRepository(campaign);
  await logAudit('campaign.updated', campaign, viewer, { previousStatus, nextStatus: campaign.status });
  return sanitizeCampaign(campaign);
};

export const remove = async (id: string, viewer: ViewerContext): Promise<void> => {
  assertCanManage(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);
  if (campaign.status === 'running') {
    throw new ValidationError('Pause or complete a running campaign before deleting');
  }
  await softDeleteCampaignRepository(id, viewer.userId);
  await logAudit('campaign.deleted', campaign, viewer);
};

export const updateStatus = async (
  id: string,
  input: UpdateCampaignStatusInput,
  viewer: ViewerContext
): Promise<SanitizedCampaign> => {
  assertCanManage(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);
  const previousStatus = campaign.status;

  if (input.status === 'running' && !['draft', 'scheduled', 'paused'].includes(previousStatus)) {
    throw new ValidationError('Only draft, scheduled, or paused campaigns can be set to running');
  }

  campaign.status = input.status;
  campaign.updatedBy = new Types.ObjectId(viewer.userId);

  if (input.status === 'paused') campaign.pausedAt = new Date();
  if (input.status === 'completed') campaign.completedAt = new Date();
  if (input.status === 'cancelled') campaign.cancelledAt = new Date();
  if (input.status === 'failed') campaign.completedAt = new Date();

  addTimeline(campaign, 'status_changed', viewer, input.notes || `Status changed to ${input.status}`, {
    previousStatus,
    nextStatus: input.status,
  });

  await updateCampaignRepository(campaign);
  await logAudit('campaign.status_changed', campaign, viewer, { previousStatus, nextStatus: input.status });
  return sanitizeCampaign(campaign);
};

export const addNote = async (
  id: string,
  input: AddCampaignNoteInput,
  viewer: ViewerContext
): Promise<SanitizedCampaign> => {
  assertCanManage(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);
  campaign.notes = campaign.notes ?? [];
  campaign.notes.unshift({
    text: input.text,
    createdAt: new Date(),
    createdBy: new Types.ObjectId(viewer.userId),
  });
  campaign.notes = campaign.notes.slice(0, 30);
  addTimeline(campaign, 'note_added', viewer, input.text.slice(0, 120));
  campaign.updatedBy = new Types.ObjectId(viewer.userId);
  await updateCampaignRepository(campaign);
  return sanitizeCampaign(campaign);
};

export const previewAudience = async (id: string, viewer: ViewerContext): Promise<AudiencePreviewResult> => {
  assertCanView(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);
  return previewCampaignAudienceRepository(
    campaign.hotelId.toString(),
    campaign.audienceSegment,
    campaign.audienceFilters
  );
};

export const getLogs = async (
  id: string,
  query: ListCampaignLogsQuery,
  viewer: ViewerContext
) => {
  assertCanView(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);
  const result = await findCampaignLogsRepository(campaign._id.toString(), {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy ?? 'createdAt',
    sortOrder: query.sortOrder ?? 'desc',
  }, query.status);
  return {
    ...result,
    data: result.data.map((log) => sanitizeCampaignLog(log.toObject())),
  };
};

export const launch = async (
  id: string,
  input: LaunchCampaignInput,
  viewer: ViewerContext
): Promise<SanitizedCampaign> => {
  assertCanManage(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);

  if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
    throw new ValidationError('Only draft, scheduled, or paused campaigns can be launched');
  }

  const audience = await resolveCampaignAudienceRepository(
    campaign.hotelId.toString(),
    campaign.audienceSegment,
    campaign.audienceFilters
  );

  if (audience.length === 0) {
    throw new ValidationError('No recipients found for the selected audience segment');
  }

  if (input.dryRun) {
    return sanitizeCampaign(campaign);
  }

  const logs = audience.map((recipient) => ({
    campaignId: campaign._id,
    hotelId: campaign.hotelId,
    guestId: recipient.guestId,
    leadId: recipient.leadId,
    enquiryId: recipient.enquiryId,
    recipientName: recipient.name,
    recipientEmail: recipient.email,
    phone: recipient.phone,
    channel: campaign.channel,
    status: 'pending',
  }));

  await createCampaignLogsBulkRepository(logs);

  campaign.status = 'running';
  campaign.launchedAt = new Date();
  campaign.stats.total = audience.length;
  campaign.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(campaign, 'launched', viewer, `Campaign launched to ${audience.length} recipients`, {
    audienceSegment: campaign.audienceSegment,
    totalRecipients: audience.length,
  });

  await updateCampaignRepository(campaign);
  await processPendingCampaignLogsRepository(
    campaign._id.toString(),
    campaign.hotelId.toString(),
    campaign.channel
  );
  await refreshCampaignStats(campaign);
  await updateCampaignRepository(campaign);

  await addCampaignJob('process-campaign', {
    campaignId: campaign._id.toString(),
    hotelId: campaign.hotelId.toString(),
  });

  await logAudit('campaign.launched', campaign, viewer, { totalRecipients: audience.length });
  return sanitizeCampaign(campaign);
};

export const pause = async (id: string, viewer: ViewerContext): Promise<SanitizedCampaign> => {
  return updateStatus(id, { status: 'paused', notes: 'Campaign paused' }, viewer);
};

export const cancel = async (id: string, viewer: ViewerContext): Promise<SanitizedCampaign> => {
  return updateStatus(id, { status: 'cancelled', notes: 'Campaign cancelled' }, viewer);
};

export const complete = async (id: string, viewer: ViewerContext): Promise<SanitizedCampaign> => {
  assertCanManage(viewer);
  const campaign = await getCampaignOrThrow(id, viewer);
  await refreshCampaignStats(campaign);
  campaign.status = 'completed';
  campaign.completedAt = new Date();
  campaign.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(campaign, 'completed', viewer, 'Campaign marked as completed');
  await updateCampaignRepository(campaign);
  return sanitizeCampaign(campaign);
};
