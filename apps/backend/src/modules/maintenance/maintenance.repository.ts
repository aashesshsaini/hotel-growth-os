import { FilterQuery, Types } from 'mongoose';
import { AuditLog, HotelStaff, HousekeepingTask, MaintenanceIssue, Room, User } from '../../models';
import { IMaintenanceIssue } from '../../models/MaintenanceIssue';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';

export const findMaintenanceIssuesRepository = async (
  baseFilter: FilterQuery<IMaintenanceIssue>,
  options: PaginationOptions
): Promise<PaginatedResponse<IMaintenanceIssue>> => {
  const result = await paginate(MaintenanceIssue, options, baseFilter);
  await MaintenanceIssue.populate(result.data, [
    { path: 'roomId', select: 'roomNumber floor roomName maintenanceStatus status isBookable' },
    { path: 'assignedTo', select: 'name email role' },
    { path: 'sourceHousekeepingTaskId', select: 'taskNumber title status' },
  ]);
  return result;
};

export const findMaintenanceIssueByIdRepository = async (id: string) => {
  return MaintenanceIssue.findById(id)
    .populate('roomId', 'roomNumber floor roomName maintenanceStatus status maintenanceNotes maintenanceSchedule assignedMaintenanceStaffId')
    .populate('assignedTo', 'name email role')
    .populate('sourceHousekeepingTaskId', 'taskNumber title status')
    .populate('timeline.createdBy', 'name email');
};

export const createMaintenanceIssueRepository = async (data: Record<string, unknown>) => {
  return MaintenanceIssue.create(data);
};

export const updateMaintenanceIssueRepository = async (issue: IMaintenanceIssue) => {
  await issue.save();
  return issue;
};

export const softDeleteMaintenanceIssueRepository = async (id: string, deletedBy: string) => {
  await MaintenanceIssue.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy,
    updatedBy: deletedBy,
  });
};

export const findRoomByIdRepository = async (roomId: string) => {
  return Room.findOne({ _id: roomId, isDeleted: { $ne: true } });
};

export const findHousekeepingTaskByIdRepository = async (taskId: string) => {
  return HousekeepingTask.findOne({ _id: taskId, isDeleted: { $ne: true } });
};

export const findUserByIdRepository = async (userId: string) => {
  return User.findOne({ _id: userId, isDeleted: { $ne: true } });
};

export const findMaintenanceStaffRepository = async (hotelId: string, userId: string) => {
  return HotelStaff.findOne({
    hotelId,
    userId,
    role: 'maintenance',
    isDeleted: { $ne: true },
    status: { $nin: ['inactive', 'suspended', 'resigned'] },
  });
};

export const updateRoomMaintenanceRepository = async (
  roomId: Types.ObjectId,
  data: Record<string, unknown>
) => {
  return Room.findByIdAndUpdate(roomId, data, { new: true });
};

export const countOpenIssuesForRoomRepository = async (hotelId: string, roomId: Types.ObjectId) => {
  return MaintenanceIssue.countDocuments({
    hotelId,
    roomId,
    isDeleted: { $ne: true },
    status: { $in: ['open', 'assigned', 'in_progress', 'on_hold', 'reopened'] },
  });
};

export const generateMaintenanceIssueNumberRepository = async (hotelId: string): Promise<string> => {
  const prefix = `MT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const count = await MaintenanceIssue.countDocuments({ hotelId, issueNumber: { $regex: `^${prefix}` } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

export const getMaintenanceStatsRepository = async (hotelId: string) => {
  const baseFilter = { hotelId, isDeleted: { $ne: true } };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [statusAgg, typeAgg, priorityAgg, costAgg, maintenanceRooms, outOfServiceRooms, workloadAgg] = await Promise.all([
    MaintenanceIssue.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    MaintenanceIssue.aggregate([{ $match: baseFilter }, { $group: { _id: '$issueType', count: { $sum: 1 } } }]),
    MaintenanceIssue.aggregate([{ $match: baseFilter }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    MaintenanceIssue.aggregate([
      { $match: baseFilter },
      { $group: { _id: null, estimated: { $sum: '$estimatedCost' }, actual: { $sum: '$actualCost' } } },
    ]),
    Room.countDocuments({ ...baseFilter, maintenanceStatus: { $in: ['minor_issue', 'major_issue', 'under_repair'] } }),
    Room.countDocuments({ ...baseFilter, status: { $in: ['maintenance', 'out_of_order', 'blocked'] } }),
    MaintenanceIssue.aggregate([
      { $match: { ...baseFilter, assignedTo: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          openIssues: { $sum: { $cond: [{ $in: ['$status', ['open', 'assigned', 'in_progress', 'on_hold', 'reopened']] }, 1, 0] } },
          resolvedToday: {
            $sum: {
              $cond: [
                { $and: [{ $in: ['$status', ['resolved', 'closed']] }, { $gte: ['$resolvedAt', today] }, { $lt: ['$resolvedAt', tomorrow] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { openIssues: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const staffDocs = await User.find({ _id: { $in: workloadAgg.map((item) => item._id) } }).select('name email');
  const staffNameMap = new Map(staffDocs.map((user) => [user._id.toString(), user.name || user.email]));

  return {
    statusAgg,
    typeAgg,
    priorityAgg,
    totalEstimatedCost: costAgg[0]?.estimated ?? 0,
    totalActualCost: costAgg[0]?.actual ?? 0,
    maintenanceRooms,
    outOfServiceRooms,
    workloadByStaff: workloadAgg.map((item) => ({
      staffId: item._id.toString(),
      name: staffNameMap.get(item._id.toString()) ?? 'Technician',
      openIssues: item.openIssues,
      resolvedToday: item.resolvedToday,
    })),
  };
};

export const findRoomMaintenanceHistoryRepository = async (hotelId: string, roomId: string) => {
  return MaintenanceIssue.find({ hotelId, roomId, isDeleted: { $ne: true } })
    .sort({ reportedAt: -1 })
    .limit(50)
    .populate('assignedTo', 'name email role');
};

export const findAuditLogsByIssueIdRepository = async (issueId: Types.ObjectId) => {
  return AuditLog.find({ entity: 'MaintenanceIssue', entityId: issueId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId', 'name email');
};

export const createAuditLogRepository = async (data: Record<string, unknown>) => {
  await AuditLog.create(data);
};
