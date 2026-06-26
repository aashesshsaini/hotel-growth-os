import { FilterQuery, Types } from 'mongoose';
import { IHousekeepingTask } from '../../models/HousekeepingTask';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import {
  AssignHousekeepingTaskInput,
  CreateHousekeepingTaskInput,
  ListHousekeepingTasksQuery,
  UpdateHousekeepingTaskInput,
  UpdateHousekeepingTaskStatusInput,
} from './validation';
import {
  createAuditLogRepository,
  createHousekeepingTaskRepository,
  findAuditLogsByTaskIdRepository,
  findDailyScheduleRepository,
  findHousekeepingStaffRepository,
  findHousekeepingTaskByIdRepository,
  findHousekeepingTasksRepository,
  findRoomByIdRepository,
  findUserByIdRepository,
  generateHousekeepingTaskNumberRepository,
  getHousekeepingStatsRepository,
  softDeleteHousekeepingTaskRepository,
  updateHousekeepingTaskRepository,
  updateRoomHousekeepingRepository,
} from './housekeeping.repository';
import { HousekeepingStatsResult, SanitizedHousekeepingTask, ViewerContext } from './housekeeping.types';

const HOUSEKEEPING_VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'housekeeping'];
const HOUSEKEEPING_MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'housekeeping'];

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
  if (!HOUSEKEEPING_VIEW_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to view housekeeping');
  }
};

const assertCanManage = (viewer: ViewerContext): void => {
  if (!HOUSEKEEPING_MANAGE_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to manage housekeeping');
  }
};

const sanitizeTask = (task: IHousekeepingTask, auditLogs?: unknown[]): SanitizedHousekeepingTask => {
  const doc = task.toObject ? task.toObject() : task;
  return {
    ...doc,
    id: doc._id?.toString(),
    auditLogs,
  };
};

const addTimeline = (
  task: IHousekeepingTask,
  action: string,
  viewer: ViewerContext,
  message?: string,
  metadata?: Record<string, unknown>
) => {
  task.timeline = task.timeline ?? [];
  task.timeline.unshift({
    action,
    message,
    createdAt: new Date(),
    createdBy: new Types.ObjectId(viewer.userId),
    metadata,
  });
  task.timeline = task.timeline.slice(0, 50);
};

const logAudit = async (
  action: string,
  task: IHousekeepingTask,
  viewer: ViewerContext,
  changes?: Record<string, unknown>
) => {
  await createAuditLogRepository({
    hotelId: task.hotelId,
    userId: viewer.userId,
    action,
    entity: 'HousekeepingTask',
    entityId: task._id,
    changes,
  });
};

const buildFilter = (query: ListHousekeepingTasksQuery, hotelId: string): FilterQuery<IHousekeepingTask> => {
  const filter: FilterQuery<IHousekeepingTask> = { hotelId };
  if (query.roomId) filter.roomId = query.roomId;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.taskType) filter.taskType = query.taskType;
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.includeCompleted === false) {
    filter.status = { $ne: 'completed' };
  }
  if (query.scheduledFrom || query.scheduledTo) {
    filter.scheduledFor = {};
    if (query.scheduledFrom) filter.scheduledFor.$gte = query.scheduledFrom;
    if (query.scheduledTo) filter.scheduledFor.$lte = query.scheduledTo;
  }
  return filter;
};

const getTaskOrThrow = async (id: string, viewer: ViewerContext): Promise<IHousekeepingTask> => {
  const task = await findHousekeepingTaskByIdRepository(id);
  if (!task) throw new NotFoundError('Housekeeping task not found');
  assertHotelAccess(viewer, task.hotelId.toString());
  return task;
};

const ensureRoomAccess = async (roomId: string, hotelId: string) => {
  const room = await findRoomByIdRepository(roomId);
  if (!room) throw new NotFoundError('Room not found');
  if (room.hotelId.toString() !== hotelId) throw new ForbiddenError('Room does not belong to this hotel');
  return room;
};

const ensureAssignableStaff = async (hotelId: string, assignedTo?: string) => {
  if (!assignedTo) return;
  const user = await findUserByIdRepository(assignedTo);
  if (!user) throw new NotFoundError('Assigned staff user not found');
  const staff = await findHousekeepingStaffRepository(hotelId, assignedTo);
  if (!staff) throw new ValidationError('Assigned user must be an active housekeeping staff member');
};

const syncRoomForStatus = async (task: IHousekeepingTask, notes?: string) => {
  const updates: Record<string, unknown> = {
    cleaningNotes: notes ?? task.notes,
    housekeepingSchedule: task.scheduledFor,
    assignedHousekeeperId: task.assignedTo,
  };
  if (task.status === 'assigned' || task.status === 'pending') updates.housekeepingStatus = 'dirty';
  if (task.status === 'in_progress') updates.housekeepingStatus = 'cleaning_in_progress';
  if (task.status === 'inspection_pending') updates.housekeepingStatus = 'needs_attention';
  if (task.status === 'rejected' || task.status === 'reclean_required') updates.housekeepingStatus = 'needs_attention';
  if (task.status === 'completed') {
    updates.housekeepingStatus = task.taskType === 'inspection' ? 'inspected' : 'clean';
    updates.lastCleanedAt = task.completedAt ?? new Date();
    if (task.taskType === 'inspection') updates.lastInspectedAt = task.inspectedAt ?? new Date();
  }
  await updateRoomHousekeepingRepository(task.roomId, updates);
};

export const listHousekeepingTasksService = async (
  query: ListHousekeepingTasksQuery,
  viewer: ViewerContext
): Promise<PaginatedResponse<SanitizedHousekeepingTask>> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const result = await findHousekeepingTasksRepository(buildFilter(query, hotelId), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['title', 'description', 'taskNumber'],
    sortBy: query.sortBy ?? 'scheduledFor',
    sortOrder: query.sortOrder,
  });
  return { ...result, data: result.data.map((task) => sanitizeTask(task)) };
};

export const getHousekeepingStatsService = async (
  viewer: ViewerContext,
  hotelIdParam?: string
): Promise<HousekeepingStatsResult> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(hotelIdParam, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const stats = await getHousekeepingStatsRepository(hotelId);
  const statusMap = stats.statusAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});
  return {
    totalTasks: Object.values(statusMap).reduce((sum, count) => sum + count, 0),
    pending: statusMap.pending ?? 0,
    assigned: statusMap.assigned ?? 0,
    inProgress: statusMap.in_progress ?? 0,
    completed: statusMap.completed ?? 0,
    inspectionPending: statusMap.inspection_pending ?? 0,
    rejected: statusMap.rejected ?? 0,
    recleanRequired: statusMap.reclean_required ?? 0,
    dirtyRooms: stats.dirtyRooms,
    cleanRooms: stats.cleanRooms,
    cleaningInProgressRooms: stats.cleaningInProgressRooms,
    inspectionRooms: stats.inspectionRooms,
    tasksByType: stats.typeAgg.reduce<Record<string, number>>((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
    workloadByStaff: stats.workloadByStaff,
  };
};

export const getDailyHousekeepingScheduleService = async (
  query: { hotelId?: string; date?: Date },
  viewer: ViewerContext
) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const tasks = await findDailyScheduleRepository(hotelId, query.date ?? new Date());
  return tasks.map((task) => sanitizeTask(task));
};

export const getHousekeepingTaskByIdService = async (id: string, viewer: ViewerContext) => {
  assertCanView(viewer);
  const task = await getTaskOrThrow(id, viewer);
  const auditLogs = HOUSEKEEPING_MANAGE_ROLES.includes(viewer.role)
    ? await findAuditLogsByTaskIdRepository(task._id)
    : undefined;
  return sanitizeTask(task, auditLogs);
};

export const createHousekeepingTaskService = async (
  input: CreateHousekeepingTaskInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const room = await ensureRoomAccess(input.roomId, hotelId);
  await ensureAssignableStaff(hotelId, input.assignedTo);
  const taskNumber = await generateHousekeepingTaskNumberRepository(hotelId);
  const task = await createHousekeepingTaskRepository({
    hotelId,
    roomId: room._id,
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : undefined,
    taskNumber,
    taskType: input.taskType,
    status: input.status ?? (input.assignedTo ? 'assigned' : 'pending'),
    priority: input.priority ?? 'medium',
    scheduledFor: input.scheduledFor ?? new Date(),
    estimatedMinutes: input.estimatedMinutes,
    actualMinutes: input.actualMinutes,
    title: input.title,
    description: input.description,
    checklist: input.checklist ?? [],
    rejectionReason: input.rejectionReason,
    notes: input.notes,
    timeline: [
      {
        action: 'housekeeping.created',
        message: 'Housekeeping task created',
        createdAt: new Date(),
        createdBy: new Types.ObjectId(viewer.userId),
      },
    ],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  await syncRoomForStatus(task, input.notes);
  await logAudit('housekeeping.created', task, viewer, { taskNumber, roomId: input.roomId });
  return sanitizeTask(await findHousekeepingTaskByIdRepository(task._id.toString()) ?? task);
};

export const updateHousekeepingTaskService = async (
  id: string,
  input: UpdateHousekeepingTaskInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const task = await getTaskOrThrow(id, viewer);
  const changes: Record<string, unknown> = {};
  if (input.roomId) {
    await ensureRoomAccess(input.roomId, task.hotelId.toString());
    task.roomId = new Types.ObjectId(input.roomId);
    changes.roomId = input.roomId;
  }
  if (input.assignedTo !== undefined) {
    await ensureAssignableStaff(task.hotelId.toString(), input.assignedTo);
    task.assignedTo = input.assignedTo ? new Types.ObjectId(input.assignedTo) : undefined;
    if (task.status === 'pending' && input.assignedTo) task.status = 'assigned';
    changes.assignedTo = input.assignedTo;
  }
  if (input.taskType !== undefined) { task.taskType = input.taskType; changes.taskType = input.taskType; }
  if (input.status !== undefined) { task.status = input.status; changes.status = input.status; }
  if (input.priority !== undefined) { task.priority = input.priority; changes.priority = input.priority; }
  if (input.scheduledFor !== undefined) { task.scheduledFor = input.scheduledFor; changes.scheduledFor = input.scheduledFor; }
  if (input.estimatedMinutes !== undefined) { task.estimatedMinutes = input.estimatedMinutes; changes.estimatedMinutes = input.estimatedMinutes; }
  if (input.actualMinutes !== undefined) { task.actualMinutes = input.actualMinutes; changes.actualMinutes = input.actualMinutes; }
  if (input.title !== undefined) { task.title = input.title; changes.title = input.title; }
  if (input.description !== undefined) { task.description = input.description; changes.description = input.description; }
  if (input.checklist !== undefined) { task.checklist = input.checklist.map((item) => ({ item: item.item, isDone: item.isDone ?? false, notes: item.notes })); changes.checklist = input.checklist; }
  if (input.rejectionReason !== undefined) { task.rejectionReason = input.rejectionReason; changes.rejectionReason = input.rejectionReason; }
  if (input.notes !== undefined) { task.notes = input.notes; changes.notes = input.notes; }
  task.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(task, 'housekeeping.updated', viewer, 'Housekeeping task updated', changes);
  await updateHousekeepingTaskRepository(task);
  await syncRoomForStatus(task, input.notes);
  await logAudit('housekeeping.updated', task, viewer, changes);
  return getHousekeepingTaskByIdService(id, viewer);
};

export const assignHousekeepingTaskService = async (
  id: string,
  input: AssignHousekeepingTaskInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const task = await getTaskOrThrow(id, viewer);
  await ensureAssignableStaff(task.hotelId.toString(), input.assignedTo);
  task.assignedTo = new Types.ObjectId(input.assignedTo);
  if (task.status === 'pending') task.status = 'assigned';
  task.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(task, 'housekeeping.assigned', viewer, input.notes || 'Housekeeping task assigned', { assignedTo: input.assignedTo });
  await updateHousekeepingTaskRepository(task);
  await syncRoomForStatus(task, input.notes);
  await logAudit('housekeeping.assigned', task, viewer, { assignedTo: input.assignedTo });
  return getHousekeepingTaskByIdService(id, viewer);
};

export const updateHousekeepingTaskStatusService = async (
  id: string,
  input: UpdateHousekeepingTaskStatusInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const task = await getTaskOrThrow(id, viewer);
  const previous = task.status;
  task.status = input.status;
  if (input.status === 'in_progress' && !task.startedAt) task.startedAt = new Date();
  if (input.status === 'completed') task.completedAt = new Date();
  if (input.status === 'inspection_pending') task.inspectedAt = undefined;
  if (input.status === 'rejected' || input.status === 'reclean_required') task.rejectionReason = input.rejectionReason;
  if (input.checklist) task.checklist = input.checklist.map((item) => ({ item: item.item, isDone: item.isDone ?? false, notes: item.notes }));
  if (input.actualMinutes !== undefined) task.actualMinutes = input.actualMinutes;
  if (input.notes !== undefined) task.notes = input.notes;
  task.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(task, 'housekeeping.status_changed', viewer, input.notes || `Status changed to ${input.status}`, {
    previous,
    status: input.status,
  });
  await updateHousekeepingTaskRepository(task);
  await syncRoomForStatus(task, input.notes);
  await logAudit('housekeeping.status_changed', task, viewer, { previous, status: input.status });
  return getHousekeepingTaskByIdService(id, viewer);
};

export const deleteHousekeepingTaskService = async (id: string, viewer: ViewerContext): Promise<void> => {
  assertCanManage(viewer);
  const task = await getTaskOrThrow(id, viewer);
  await softDeleteHousekeepingTaskRepository(id, viewer.userId);
  await logAudit('housekeeping.deleted', task, viewer, { taskNumber: task.taskNumber });
};
