import { FilterQuery, Types } from 'mongoose';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { IMaintenanceIssue } from '../../models/MaintenanceIssue';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import {
  AssignMaintenanceIssueInput,
  CreateMaintenanceIssueInput,
  ListMaintenanceIssuesQuery,
  RoomMaintenanceHistoryQuery,
  UpdateMaintenanceIssueInput,
  UpdateMaintenanceIssueStatusInput,
} from './validation';
import {
  countOpenIssuesForRoomRepository,
  createAuditLogRepository,
  createMaintenanceIssueRepository,
  findAuditLogsByIssueIdRepository,
  findHousekeepingTaskByIdRepository,
  findMaintenanceIssueByIdRepository,
  findMaintenanceIssuesRepository,
  findMaintenanceStaffRepository,
  findRoomByIdRepository,
  findRoomMaintenanceHistoryRepository,
  findUserByIdRepository,
  generateMaintenanceIssueNumberRepository,
  getMaintenanceStatsRepository,
  softDeleteMaintenanceIssueRepository,
  updateMaintenanceIssueRepository,
  updateRoomMaintenanceRepository,
} from './maintenance.repository';
import { MaintenanceStatsResult, SanitizedMaintenanceIssue, ViewerContext } from './maintenance.types';

const MAINTENANCE_VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'maintenance', 'housekeeping'];
const MAINTENANCE_MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'maintenance'];

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
  if (!MAINTENANCE_VIEW_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to view maintenance');
  }
};

const assertCanManage = (viewer: ViewerContext): void => {
  if (!MAINTENANCE_MANAGE_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to manage maintenance');
  }
};

const sanitizeIssue = (issue: IMaintenanceIssue, auditLogs?: unknown[]): SanitizedMaintenanceIssue => {
  const doc = issue.toObject ? issue.toObject() : issue;
  return {
    ...doc,
    id: doc._id?.toString(),
    auditLogs,
  };
};

const addTimeline = (
  issue: IMaintenanceIssue,
  action: string,
  viewer: ViewerContext,
  message?: string,
  metadata?: Record<string, unknown>
) => {
  issue.timeline = issue.timeline ?? [];
  issue.timeline.unshift({
    action,
    message,
    createdAt: new Date(),
    createdBy: new Types.ObjectId(viewer.userId),
    metadata,
  });
  issue.timeline = issue.timeline.slice(0, 50);
};

const logAudit = async (
  action: string,
  issue: IMaintenanceIssue,
  viewer: ViewerContext,
  changes?: Record<string, unknown>
) => {
  await createAuditLogRepository({
    hotelId: issue.hotelId,
    userId: viewer.userId,
    action,
    entity: 'MaintenanceIssue',
    entityId: issue._id,
    changes,
  });
};

const buildFilter = (query: ListMaintenanceIssuesQuery, hotelId: string): FilterQuery<IMaintenanceIssue> => {
  const filter: FilterQuery<IMaintenanceIssue> = { hotelId };
  if (query.roomId) filter.roomId = query.roomId;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.sourceHousekeepingTaskId) filter.sourceHousekeepingTaskId = query.sourceHousekeepingTaskId;
  if (query.issueType) filter.issueType = query.issueType;
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.includeClosed === false) filter.status = { $nin: ['resolved', 'closed'] };
  if (query.reportedFrom || query.reportedTo) {
    filter.reportedAt = {};
    if (query.reportedFrom) filter.reportedAt.$gte = query.reportedFrom;
    if (query.reportedTo) filter.reportedAt.$lte = query.reportedTo;
  }
  return filter;
};

const getIssueOrThrow = async (id: string, viewer: ViewerContext): Promise<IMaintenanceIssue> => {
  const issue = await findMaintenanceIssueByIdRepository(id);
  if (!issue) throw new NotFoundError('Maintenance issue not found');
  assertHotelAccess(viewer, issue.hotelId.toString());
  return issue;
};

const ensureRoomAccess = async (roomId: string, hotelId: string) => {
  const room = await findRoomByIdRepository(roomId);
  if (!room) throw new NotFoundError('Room not found');
  if (room.hotelId.toString() !== hotelId) throw new ForbiddenError('Room does not belong to this hotel');
  return room;
};

const ensureHousekeepingTaskAccess = async (taskId: string | undefined, hotelId: string) => {
  if (!taskId) return;
  const task = await findHousekeepingTaskByIdRepository(taskId);
  if (!task) throw new NotFoundError('Housekeeping task not found');
  if (task.hotelId.toString() !== hotelId) throw new ForbiddenError('Housekeeping task does not belong to this hotel');
};

const ensureAssignableStaff = async (hotelId: string, assignedTo?: string) => {
  if (!assignedTo) return;
  const user = await findUserByIdRepository(assignedTo);
  if (!user) throw new NotFoundError('Assigned staff user not found');
  const staff = await findMaintenanceStaffRepository(hotelId, assignedTo);
  if (!staff) throw new ValidationError('Assigned user must be an active maintenance staff member');
};

const roomStatusForIssue = (issue: IMaintenanceIssue) => {
  if (['resolved', 'closed'].includes(issue.status)) return 'resolved';
  if (['in_progress', 'on_hold'].includes(issue.status)) return 'under_repair';
  if (['urgent', 'high'].includes(issue.priority)) return 'major_issue';
  return 'minor_issue';
};

const syncRoomForIssue = async (issue: IMaintenanceIssue, notes?: string) => {
  const openIssues = await countOpenIssuesForRoomRepository(issue.hotelId.toString(), issue.roomId);
  const resolved = ['resolved', 'closed'].includes(issue.status);
  const maintenanceStatus = resolved && openIssues <= 1 ? 'resolved' : roomStatusForIssue(issue);
  const updates: Record<string, unknown> = {
    maintenanceStatus,
    maintenanceNotes: notes ?? issue.resolutionNotes ?? issue.description,
    maintenanceSchedule: issue.scheduledFor,
    assignedMaintenanceStaffId: issue.assignedTo,
    isBookable: !['major_issue', 'under_repair'].includes(maintenanceStatus),
  };

  if (maintenanceStatus === 'under_repair' || maintenanceStatus === 'major_issue') {
    updates.status = 'maintenance';
    updates.isBookable = false;
  } else if (maintenanceStatus === 'resolved') {
    updates.isBookable = true;
  }

  await updateRoomMaintenanceRepository(issue.roomId, updates);
};

export const listMaintenanceIssuesService = async (
  query: ListMaintenanceIssuesQuery,
  viewer: ViewerContext
): Promise<PaginatedResponse<SanitizedMaintenanceIssue>> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const result = await findMaintenanceIssuesRepository(buildFilter(query, hotelId), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['title', 'description', 'issueNumber'],
    sortBy: query.sortBy ?? 'reportedAt',
    sortOrder: query.sortOrder,
  });
  return { ...result, data: result.data.map((issue) => sanitizeIssue(issue)) };
};

export const getMaintenanceStatsService = async (
  viewer: ViewerContext,
  hotelIdParam?: string
): Promise<MaintenanceStatsResult> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(hotelIdParam, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const stats = await getMaintenanceStatsRepository(hotelId);
  const statusMap = stats.statusAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});
  const typeMap = stats.typeAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});
  const priorityMap = stats.priorityAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});
  return {
    totalIssues: Object.values(statusMap).reduce((sum, count) => sum + count, 0),
    open: statusMap.open ?? 0,
    assigned: statusMap.assigned ?? 0,
    inProgress: statusMap.in_progress ?? 0,
    onHold: statusMap.on_hold ?? 0,
    resolved: statusMap.resolved ?? 0,
    closed: statusMap.closed ?? 0,
    reopened: statusMap.reopened ?? 0,
    urgentIssues: priorityMap.urgent ?? 0,
    highPriorityIssues: priorityMap.high ?? 0,
    maintenanceRooms: stats.maintenanceRooms,
    outOfServiceRooms: stats.outOfServiceRooms,
    totalEstimatedCost: stats.totalEstimatedCost,
    totalActualCost: stats.totalActualCost,
    issuesByType: typeMap,
    workloadByStaff: stats.workloadByStaff,
  };
};

export const getMaintenanceIssueByIdService = async (id: string, viewer: ViewerContext) => {
  assertCanView(viewer);
  const issue = await getIssueOrThrow(id, viewer);
  const auditLogs = MAINTENANCE_MANAGE_ROLES.includes(viewer.role)
    ? await findAuditLogsByIssueIdRepository(issue._id)
    : undefined;
  return sanitizeIssue(issue, auditLogs);
};

export const getRoomMaintenanceHistoryService = async (
  query: RoomMaintenanceHistoryQuery,
  viewer: ViewerContext
) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  await ensureRoomAccess(query.roomId, hotelId);
  const issues = await findRoomMaintenanceHistoryRepository(hotelId, query.roomId);
  return issues.map((issue) => sanitizeIssue(issue));
};

export const createMaintenanceIssueService = async (
  input: CreateMaintenanceIssueInput,
  viewer: ViewerContext
) => {
  if (viewer.role === 'housekeeping') {
    // Housekeeping can report issues found during cleaning, but assignment and closure stay with maintenance roles.
  } else {
    assertCanManage(viewer);
  }
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const room = await ensureRoomAccess(input.roomId, hotelId);
  await ensureHousekeepingTaskAccess(input.sourceHousekeepingTaskId, hotelId);
  await ensureAssignableStaff(hotelId, input.assignedTo);
  const issueNumber = await generateMaintenanceIssueNumberRepository(hotelId);
  const issue = await createMaintenanceIssueRepository({
    hotelId,
    roomId: room._id,
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : undefined,
    sourceHousekeepingTaskId: input.sourceHousekeepingTaskId ? new Types.ObjectId(input.sourceHousekeepingTaskId) : undefined,
    issueNumber,
    title: input.title,
    description: input.description,
    issueType: input.issueType,
    status: input.status ?? (input.assignedTo ? 'assigned' : 'open'),
    priority: input.priority ?? 'medium',
    scheduledFor: input.scheduledFor,
    estimatedCost: input.estimatedCost,
    actualCost: input.actualCost,
    vendorName: input.vendorName,
    vendorPhone: input.vendorPhone,
    resolutionNotes: input.resolutionNotes,
    holdReason: input.holdReason,
    images: input.images ?? [],
    timeline: [
      {
        action: 'maintenance.created',
        message: 'Maintenance issue created',
        createdAt: new Date(),
        createdBy: new Types.ObjectId(viewer.userId),
      },
    ],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  await syncRoomForIssue(issue, input.description);
  await logAudit('maintenance.created', issue, viewer, { issueNumber, roomId: input.roomId });
  return sanitizeIssue(await findMaintenanceIssueByIdRepository(issue._id.toString()) ?? issue);
};

export const updateMaintenanceIssueService = async (
  id: string,
  input: UpdateMaintenanceIssueInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const issue = await getIssueOrThrow(id, viewer);
  const changes: Record<string, unknown> = {};
  if (input.roomId) {
    await ensureRoomAccess(input.roomId, issue.hotelId.toString());
    issue.roomId = new Types.ObjectId(input.roomId);
    changes.roomId = input.roomId;
  }
  if (input.assignedTo !== undefined) {
    await ensureAssignableStaff(issue.hotelId.toString(), input.assignedTo);
    issue.assignedTo = input.assignedTo ? new Types.ObjectId(input.assignedTo) : undefined;
    if (issue.status === 'open' && input.assignedTo) issue.status = 'assigned';
    changes.assignedTo = input.assignedTo;
  }
  if (input.sourceHousekeepingTaskId !== undefined) {
    await ensureHousekeepingTaskAccess(input.sourceHousekeepingTaskId, issue.hotelId.toString());
    issue.sourceHousekeepingTaskId = input.sourceHousekeepingTaskId ? new Types.ObjectId(input.sourceHousekeepingTaskId) : undefined;
    changes.sourceHousekeepingTaskId = input.sourceHousekeepingTaskId;
  }
  if (input.title !== undefined) { issue.title = input.title; changes.title = input.title; }
  if (input.description !== undefined) { issue.description = input.description; changes.description = input.description; }
  if (input.issueType !== undefined) { issue.issueType = input.issueType; changes.issueType = input.issueType; }
  if (input.status !== undefined) { issue.status = input.status; changes.status = input.status; }
  if (input.priority !== undefined) { issue.priority = input.priority; changes.priority = input.priority; }
  if (input.scheduledFor !== undefined) { issue.scheduledFor = input.scheduledFor; changes.scheduledFor = input.scheduledFor; }
  if (input.estimatedCost !== undefined) { issue.estimatedCost = input.estimatedCost; changes.estimatedCost = input.estimatedCost; }
  if (input.actualCost !== undefined) { issue.actualCost = input.actualCost; changes.actualCost = input.actualCost; }
  if (input.vendorName !== undefined) { issue.vendorName = input.vendorName; changes.vendorName = input.vendorName; }
  if (input.vendorPhone !== undefined) { issue.vendorPhone = input.vendorPhone; changes.vendorPhone = input.vendorPhone; }
  if (input.resolutionNotes !== undefined) { issue.resolutionNotes = input.resolutionNotes; changes.resolutionNotes = input.resolutionNotes; }
  if (input.holdReason !== undefined) { issue.holdReason = input.holdReason; changes.holdReason = input.holdReason; }
  if (input.images !== undefined) { issue.images = input.images; changes.images = input.images; }
  issue.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(issue, 'maintenance.updated', viewer, 'Maintenance issue updated', changes);
  await updateMaintenanceIssueRepository(issue);
  await syncRoomForIssue(issue, input.description);
  await logAudit('maintenance.updated', issue, viewer, changes);
  return getMaintenanceIssueByIdService(id, viewer);
};

export const assignMaintenanceIssueService = async (
  id: string,
  input: AssignMaintenanceIssueInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const issue = await getIssueOrThrow(id, viewer);
  await ensureAssignableStaff(issue.hotelId.toString(), input.assignedTo);
  issue.assignedTo = new Types.ObjectId(input.assignedTo);
  if (issue.status === 'open') issue.status = 'assigned';
  issue.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(issue, 'maintenance.assigned', viewer, input.notes || 'Maintenance issue assigned', { assignedTo: input.assignedTo });
  await updateMaintenanceIssueRepository(issue);
  await syncRoomForIssue(issue, input.notes);
  await logAudit('maintenance.assigned', issue, viewer, { assignedTo: input.assignedTo });
  return getMaintenanceIssueByIdService(id, viewer);
};

export const updateMaintenanceIssueStatusService = async (
  id: string,
  input: UpdateMaintenanceIssueStatusInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const issue = await getIssueOrThrow(id, viewer);
  const previous = issue.status;
  issue.status = input.status;
  if (input.status === 'in_progress' && !issue.startedAt) issue.startedAt = new Date();
  if (input.status === 'resolved') issue.resolvedAt = new Date();
  if (input.status === 'closed') {
    issue.closedAt = new Date();
    if (!issue.resolvedAt) issue.resolvedAt = new Date();
  }
  if (input.resolutionNotes !== undefined) issue.resolutionNotes = input.resolutionNotes;
  if (input.holdReason !== undefined) issue.holdReason = input.holdReason;
  if (input.actualCost !== undefined) issue.actualCost = input.actualCost;
  issue.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(issue, 'maintenance.status_changed', viewer, input.notes || `Status changed to ${input.status}`, {
    previous,
    status: input.status,
  });
  await updateMaintenanceIssueRepository(issue);
  await syncRoomForIssue(issue, input.notes);
  await logAudit('maintenance.status_changed', issue, viewer, { previous, status: input.status });
  return getMaintenanceIssueByIdService(id, viewer);
};

export const deleteMaintenanceIssueService = async (id: string, viewer: ViewerContext): Promise<void> => {
  assertCanManage(viewer);
  const issue = await getIssueOrThrow(id, viewer);
  await softDeleteMaintenanceIssueRepository(id, viewer.userId);
  await logAudit('maintenance.deleted', issue, viewer, { issueNumber: issue.issueNumber });
};
