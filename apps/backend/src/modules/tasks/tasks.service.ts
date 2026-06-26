import { FilterQuery, Types } from 'mongoose';
import { AuditLog, HotelStaff, Task, User } from '../../models';
import { ITask } from '../../models/Task';
import { paginate } from '../../utils/pagination';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { AssignInput, CreateInput, ListQuery, NoteInput, RescheduleInput, StatusInput, UpdateInput } from './tasks.validation';

interface Viewer { userId: string; role: string; hotelId?: string }

const assertAccess = (doc: unknown, viewer: Viewer): void => {
  if (viewer.role !== 'super_admin' && String((doc as { hotelId?: unknown }).hotelId) !== viewer.hotelId) throw new ForbiddenError('Access denied to this hotel');
};

const roles = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];
const assertCanManage = (viewer: Viewer) => {
  if (!roles.includes(viewer.role)) throw new ForbiddenError('You do not have permission to manage follow-ups');
};

const getHotelId = (viewer: Viewer, hotelIdInput?: string): string => {
  const hotelId = viewer.role === 'super_admin' && hotelIdInput ? hotelIdInput : viewer.hotelId;
  if (!hotelId) throw new ValidationError('Hotel ID is required');
  return hotelId;
};

const sanitize = (doc: ITask, auditLogs?: unknown[]) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id?.toString(), auditLogs };
};

const addTimeline = (
  doc: ITask,
  action: string,
  viewer: Viewer,
  message?: string,
  metadata?: Record<string, unknown>
) => {
  doc.timeline = doc.timeline ?? [];
  doc.timeline.unshift({
    action,
    message,
    createdAt: new Date(),
    createdBy: new Types.ObjectId(viewer.userId),
    metadata,
  });
  doc.timeline = doc.timeline.slice(0, 50);
};

const logAudit = async (action: string, doc: ITask, viewer: Viewer, changes?: Record<string, unknown>) => {
  await AuditLog.create({
    hotelId: doc.hotelId,
    userId: viewer.userId,
    action,
    entity: 'Task',
    entityId: doc._id,
    changes,
  });
};

const ensureAssignableStaff = async (hotelId: string, assignedTo?: string) => {
  if (!assignedTo) return;
  const user = await User.findOne({ _id: assignedTo, isDeleted: { $ne: true } });
  if (!user) throw new NotFoundError('Assigned user not found');
  const staff = await HotelStaff.findOne({
    hotelId,
    userId: assignedTo,
    isDeleted: { $ne: true },
    status: { $nin: ['inactive', 'suspended', 'resigned'] },
  });
  if (!staff) throw new ValidationError('Assigned user must be an active staff member');
};

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const populateTask = async <T>(doc: T) => Task.populate(doc as never, [
  { path: 'assignedTo', select: 'name email role' },
  { path: 'timeline.createdBy', select: 'name email' },
]);

export const list = async (query: ListQuery, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = getHotelId(viewer, query.hotelId);
  const filter: Record<string, unknown> = { hotelId };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.followUpType) filter.followUpType = query.followUpType;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.relatedType) filter['relatedTo.type'] = query.relatedType;
  if (query.relatedId) filter['relatedTo.id'] = query.relatedId;
  if (query.today) {
    const { start, end } = todayRange();
    filter.dueDate = { $gte: start, $lt: end };
  }
  if (query.overdue) {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $nin: ['completed', 'cancelled'] };
  }
  if (query.dueFrom || query.dueTo) {
    filter.dueDate = {};
    if (query.dueFrom) (filter.dueDate as Record<string, Date>).$gte = query.dueFrom;
    if (query.dueTo) (filter.dueDate as Record<string, Date>).$lte = query.dueTo;
  }
  const result = await paginate(Task, { page: query.page, limit: query.limit, search: query.search, searchFields: ['title', 'description', 'notes'], sortBy: query.sortBy, sortOrder: query.sortOrder }, filter as FilterQuery<ITask>);
  await populateTask(result.data);
  return { ...result, data: result.data.map((doc) => sanitize(doc)) };
};

export const getById = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Task.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Task not found');
  assertAccess(doc, viewer);
  await populateTask(doc);
  const auditLogs = await AuditLog.find({ entity: 'Task', entityId: doc._id }).sort({ createdAt: -1 }).limit(20).populate('userId', 'name email');
  return sanitize(doc, auditLogs);
};

export const create = async (input: CreateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = getHotelId(viewer, input.hotelId);
  await ensureAssignableStaff(hotelId, input.assignedTo);
  const doc = await Task.create({
    hotelId,
    ...input,
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : undefined,
    relatedTo: input.relatedTo ? { ...input.relatedTo, id: new Types.ObjectId(input.relatedTo.id) } : undefined,
    followUpType: input.followUpType ?? 'general',
    status: input.status ?? (input.dueDate ? 'scheduled' : 'pending'),
    priority: input.priority ?? 'medium',
    timeline: [{ action: 'followup.created', message: 'Follow-up created', createdAt: new Date(), createdBy: new Types.ObjectId(viewer.userId) }],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  await logAudit('followup.created', doc, viewer);
  return getById(doc._id.toString(), viewer);
};

export const update = async (id: string, input: UpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Task.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Task not found');
  assertAccess(doc, viewer);
  if (input.assignedTo !== undefined) await ensureAssignableStaff(doc.hotelId.toString(), input.assignedTo);
  Object.assign(doc, input, {
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : doc.assignedTo,
    relatedTo: input.relatedTo ? { ...input.relatedTo, id: new Types.ObjectId(input.relatedTo.id) } : doc.relatedTo,
    updatedBy: viewer.userId,
  });
  addTimeline(doc, 'followup.updated', viewer, 'Follow-up updated', input as Record<string, unknown>);
  await doc.save();
  await logAudit('followup.updated', doc, viewer, input as Record<string, unknown>);
  return getById(id, viewer);
};

export const remove = async (id: string, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Task.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Task not found');
  assertAccess(doc, viewer);
  Object.assign(doc, { isDeleted: true, deletedAt: new Date(), deletedBy: viewer.userId });
  await doc.save();
  await logAudit('followup.deleted', doc, viewer);
};

export const stats = async (viewer: Viewer, hotelIdInput?: string) => {
  assertCanManage(viewer);
  const hotelId = getHotelId(viewer, hotelIdInput);
  const baseFilter = { hotelId, isDeleted: { $ne: true } };
  const { start, end } = todayRange();
  const now = new Date();
  const [statusAgg, typeAgg, totalFollowUps, todayFollowUps, overdueFollowUps, pendingFollowUps, completedFollowUps] = await Promise.all([
    Task.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.aggregate([{ $match: baseFilter }, { $group: { _id: '$followUpType', count: { $sum: 1 } } }]),
    Task.countDocuments(baseFilter),
    Task.countDocuments({ ...baseFilter, dueDate: { $gte: start, $lt: end }, status: { $nin: ['completed', 'cancelled'] } }),
    Task.countDocuments({ ...baseFilter, dueDate: { $lt: now }, status: { $nin: ['completed', 'cancelled'] } }),
    Task.countDocuments({ ...baseFilter, status: { $in: ['pending', 'scheduled', 'in_progress', 'rescheduled'] } }),
    Task.countDocuments({ ...baseFilter, status: 'completed' }),
  ]);
  return {
    totalFollowUps,
    todayFollowUps,
    overdueFollowUps,
    pendingFollowUps,
    completedFollowUps,
    byStatus: statusAgg.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item._id || 'unknown']: item.count }), {}),
    byType: typeAgg.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item._id || 'unknown']: item.count }), {}),
  };
};

export const assign = async (id: string, input: AssignInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Task.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Task not found');
  assertAccess(doc, viewer);
  await ensureAssignableStaff(doc.hotelId.toString(), input.assignedTo);
  doc.assignedTo = new Types.ObjectId(input.assignedTo);
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'followup.assigned', viewer, input.notes || 'Follow-up assigned', { assignedTo: input.assignedTo });
  await doc.save();
  await logAudit('followup.assigned', doc, viewer, { assignedTo: input.assignedTo });
  return getById(id, viewer);
};

export const updateStatus = async (id: string, input: StatusInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Task.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Task not found');
  assertAccess(doc, viewer);
  const previous = doc.status;
  doc.status = input.status;
  if (input.outcome !== undefined) doc.outcome = input.outcome;
  if (input.notes !== undefined) doc.notes = [doc.notes, input.notes].filter(Boolean).join('\n');
  if (input.status === 'completed') doc.completedAt = new Date();
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'followup.status_changed', viewer, input.notes || `Status changed to ${input.status}`, { previous, status: input.status });
  await doc.save();
  await logAudit('followup.status_changed', doc, viewer, { previous, status: input.status });
  return getById(id, viewer);
};

export const reschedule = async (id: string, input: RescheduleInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Task.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Task not found');
  assertAccess(doc, viewer);
  doc.rescheduledFrom = doc.dueDate;
  doc.dueDate = input.dueDate;
  doc.reminderAt = input.reminderAt;
  doc.status = 'rescheduled';
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'followup.rescheduled', viewer, input.notes || 'Follow-up rescheduled', { dueDate: input.dueDate });
  await doc.save();
  await logAudit('followup.rescheduled', doc, viewer, { dueDate: input.dueDate });
  return getById(id, viewer);
};

export const addNote = async (id: string, input: NoteInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const doc = await Task.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Task not found');
  assertAccess(doc, viewer);
  doc.notes = [doc.notes, input.note].filter(Boolean).join('\n');
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'followup.note_added', viewer, input.note);
  await doc.save();
  await logAudit('followup.note_added', doc, viewer);
  return getById(id, viewer);
};
