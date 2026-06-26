import { FilterQuery, Types } from 'mongoose';
import { AuditLog, HotelStaff, HousekeepingTask, Room, User } from '../../models';
import { IHousekeepingTask } from '../../models/HousekeepingTask';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';

export const findHousekeepingTasksRepository = async (
  baseFilter: FilterQuery<IHousekeepingTask>,
  options: PaginationOptions
): Promise<PaginatedResponse<IHousekeepingTask>> => {
  const result = await paginate(HousekeepingTask, options, baseFilter);
  await HousekeepingTask.populate(result.data, [
    { path: 'roomId', select: 'roomNumber floor roomName housekeepingStatus status assignedHousekeeperId' },
    { path: 'assignedTo', select: 'name email role' },
  ]);
  return result;
};

export const findHousekeepingTaskByIdRepository = async (id: string) => {
  return HousekeepingTask.findById(id)
    .populate('roomId', 'roomNumber floor roomName housekeepingStatus status cleaningNotes lastCleanedAt lastInspectedAt')
    .populate('assignedTo', 'name email role')
    .populate('timeline.createdBy', 'name email');
};

export const createHousekeepingTaskRepository = async (data: Record<string, unknown>) => {
  return HousekeepingTask.create(data);
};

export const updateHousekeepingTaskRepository = async (task: IHousekeepingTask) => {
  await task.save();
  return task;
};

export const softDeleteHousekeepingTaskRepository = async (id: string, deletedBy: string) => {
  await HousekeepingTask.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy,
    updatedBy: deletedBy,
  });
};

export const findRoomByIdRepository = async (roomId: string) => {
  return Room.findOne({ _id: roomId, isDeleted: { $ne: true } });
};

export const findUserByIdRepository = async (userId: string) => {
  return User.findOne({ _id: userId, isDeleted: { $ne: true } });
};

export const findHousekeepingStaffRepository = async (hotelId: string, userId: string) => {
  return HotelStaff.findOne({
    hotelId,
    userId,
    role: 'housekeeping',
    isDeleted: { $ne: true },
    status: { $nin: ['inactive', 'suspended', 'resigned'] },
  });
};

export const updateRoomHousekeepingRepository = async (
  roomId: Types.ObjectId,
  data: Record<string, unknown>
) => {
  return Room.findByIdAndUpdate(roomId, data, { new: true });
};

export const generateHousekeepingTaskNumberRepository = async (hotelId: string): Promise<string> => {
  const prefix = `HK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const count = await HousekeepingTask.countDocuments({ hotelId, taskNumber: { $regex: `^${prefix}` } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

export const getHousekeepingStatsRepository = async (hotelId: string) => {
  const baseFilter = { hotelId, isDeleted: { $ne: true } };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    statusAgg,
    typeAgg,
    dirtyRooms,
    cleanRooms,
    cleaningInProgressRooms,
    inspectionRooms,
    workloadAgg,
  ] = await Promise.all([
    HousekeepingTask.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    HousekeepingTask.aggregate([{ $match: baseFilter }, { $group: { _id: '$taskType', count: { $sum: 1 } } }]),
    Room.countDocuments({ ...baseFilter, housekeepingStatus: 'dirty' }),
    Room.countDocuments({ ...baseFilter, housekeepingStatus: 'clean' }),
    Room.countDocuments({ ...baseFilter, housekeepingStatus: 'cleaning_in_progress' }),
    Room.countDocuments({ ...baseFilter, housekeepingStatus: 'needs_attention' }),
    HousekeepingTask.aggregate([
      { $match: { ...baseFilter, assignedTo: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          openTasks: { $sum: { $cond: [{ $in: ['$status', ['pending', 'assigned', 'in_progress', 'inspection_pending', 'reclean_required']] }, 1, 0] } },
          completedToday: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'completed'] }, { $gte: ['$completedAt', today] }, { $lt: ['$completedAt', tomorrow] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { openTasks: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const staffDocs = await User.find({ _id: { $in: workloadAgg.map((item) => item._id) } }).select('name email');
  const staffNameMap = new Map(staffDocs.map((user) => [user._id.toString(), user.name || user.email]));

  return {
    statusAgg,
    typeAgg,
    dirtyRooms,
    cleanRooms,
    cleaningInProgressRooms,
    inspectionRooms,
    workloadByStaff: workloadAgg.map((item) => ({
      staffId: item._id.toString(),
      name: staffNameMap.get(item._id.toString()) ?? 'Staff',
      openTasks: item.openTasks,
      completedToday: item.completedToday,
    })),
  };
};

export const findDailyScheduleRepository = async (hotelId: string, date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return HousekeepingTask.find({
    hotelId,
    isDeleted: { $ne: true },
    scheduledFor: { $gte: start, $lt: end },
  })
    .sort({ scheduledFor: 1, priority: -1 })
    .populate('roomId', 'roomNumber floor roomName housekeepingStatus')
    .populate('assignedTo', 'name email role');
};

export const findAuditLogsByTaskIdRepository = async (taskId: Types.ObjectId) => {
  return AuditLog.find({ entity: 'HousekeepingTask', entityId: taskId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId', 'name email');
};

export const createAuditLogRepository = async (data: Record<string, unknown>) => {
  await AuditLog.create(data);
};
