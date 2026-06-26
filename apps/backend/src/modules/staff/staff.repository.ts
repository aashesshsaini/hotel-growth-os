import { FilterQuery, Types } from 'mongoose';
import { AuditLog, Booking, Enquiry, Hotel, HotelStaff, HousekeepingTask, Lead, MaintenanceIssue, StaffAttendance, Task, User } from '../../models';
import { IHotelStaff } from '../../models/HotelStaff';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';

export const findStaffListRepository = async (
  baseFilter: FilterQuery<IHotelStaff>,
  options: PaginationOptions
): Promise<PaginatedResponse<IHotelStaff>> => {
  const result = await paginate(HotelStaff, options, baseFilter);

  await HotelStaff.populate(result.data, {
    path: 'userId',
    select: 'lastLoginAt',
  });

  return result;
};

export const findStaffByIdRepository = async (
  id: string,
  populateUser = true
): Promise<IHotelStaff | null> => {
  const query = HotelStaff.findById(id);
  if (populateUser) {
    query.populate('userId', 'lastLoginAt name email');
  }
  return query.exec();
};

export const findStaffByEmailInHotelRepository = async (
  hotelId: string,
  email: string,
  excludeStaffId?: string
): Promise<IHotelStaff | null> => {
  const filter: FilterQuery<IHotelStaff> = {
    hotelId,
    email: email.toLowerCase(),
    isDeleted: { $ne: true },
  };
  if (excludeStaffId) {
    filter._id = { $ne: excludeStaffId };
  }
  return HotelStaff.findOne(filter);
};

export const findStaffByPhoneInHotelRepository = async (
  hotelId: string,
  phone: string,
  excludeStaffId?: string
): Promise<IHotelStaff | null> => {
  const filter: FilterQuery<IHotelStaff> = {
    hotelId,
    phone,
    isDeleted: { $ne: true },
  };
  if (excludeStaffId) {
    filter._id = { $ne: excludeStaffId };
  }
  return HotelStaff.findOne(filter);
};

export const findStaffByEmployeeIdInHotelRepository = async (
  hotelId: string,
  employeeId: string,
  excludeStaffId?: string
): Promise<IHotelStaff | null> => {
  const filter: FilterQuery<IHotelStaff> = {
    hotelId,
    employeeId: employeeId.toUpperCase(),
    isDeleted: { $ne: true },
  };
  if (excludeStaffId) {
    filter._id = { $ne: excludeStaffId };
  }
  return HotelStaff.findOne(filter);
};

export const findUserByEmailRepository = async (email: string): Promise<typeof User.prototype | null> => {
  return User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
};

export const findUserByIdRepository = async (userId: Types.ObjectId) => {
  return User.findById(userId);
};

export const findHotelByIdRepository = async (hotelId: string) => {
  return Hotel.findById(hotelId);
};

export const createUserRepository = async (data: Record<string, unknown>) => {
  return User.create(data);
};

export const createStaffRepository = async (data: Record<string, unknown>) => {
  return HotelStaff.create(data);
};

export const updateStaffRepository = async (staff: IHotelStaff): Promise<IHotelStaff> => {
  await staff.save();
  return staff;
};

export const updateUserRepository = async (user: InstanceType<typeof User>): Promise<void> => {
  await user.save();
};

export const updateUserByIdRepository = async (
  userId: Types.ObjectId,
  data: Record<string, unknown>
): Promise<void> => {
  await User.findByIdAndUpdate(userId, data);
};

export const softDeleteStaffRepository = async (
  id: string,
  deletedBy: string
): Promise<void> => {
  await HotelStaff.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date(),
    isActive: false,
    status: 'inactive',
    deletedBy,
    updatedBy: deletedBy,
  });
};

export const getStaffStatsRepository = async (hotelId: string) => {
  const baseFilter = { hotelId, isDeleted: { $ne: true } };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    total,
    active,
    inactive,
    onDuty,
    offDuty,
    onLeave,
    suspended,
    resigned,
    presentToday,
    lateToday,
    byRole,
    byDepartment,
    byShift,
  ] = await Promise.all([
    HotelStaff.countDocuments(baseFilter),
    HotelStaff.countDocuments({ ...baseFilter, status: 'active' }),
    HotelStaff.countDocuments({ ...baseFilter, status: 'inactive' }),
    HotelStaff.countDocuments({ ...baseFilter, status: 'on_duty' }),
    HotelStaff.countDocuments({ ...baseFilter, status: 'off_duty' }),
    HotelStaff.countDocuments({ ...baseFilter, status: 'leave' }),
    HotelStaff.countDocuments({ ...baseFilter, status: 'suspended' }),
    HotelStaff.countDocuments({ ...baseFilter, status: 'resigned' }),
    StaffAttendance.countDocuments({
      hotelId,
      date: { $gte: today, $lt: tomorrow },
      status: { $in: ['present', 'on_duty', 'late'] },
    }),
    StaffAttendance.countDocuments({ hotelId, date: { $gte: today, $lt: tomorrow }, status: 'late' }),
    HotelStaff.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    HotelStaff.aggregate([
      { $match: { ...baseFilter, department: { $exists: true, $ne: '' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]),
    HotelStaff.aggregate([
      { $match: { ...baseFilter, shiftType: { $exists: true, $ne: '' } } },
      { $group: { _id: '$shiftType', count: { $sum: 1 } } },
    ]),
  ]);

  return {
    total,
    active,
    inactive,
    onDuty,
    offDuty,
    onLeave,
    suspended,
    resigned,
    presentToday,
    lateToday,
    byRole,
    byDepartment,
    byShift,
  };
};

export const upsertStaffAttendanceRepository = async (data: {
  hotelId: Types.ObjectId;
  staffId: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date;
  status: string;
  checkInAt?: Date;
  checkOutAt?: Date;
  shiftType?: string;
  notes?: string;
  updatedBy: string;
}) => {
  return StaffAttendance.findOneAndUpdate(
    { hotelId: data.hotelId, staffId: data.staffId, date: data.date },
    {
      ...data,
      updatedBy: data.updatedBy,
      createdBy: data.updatedBy,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const findAttendanceByStaffRepository = async (staffId: Types.ObjectId) => {
  return StaffAttendance.find({ staffId }).sort({ date: -1 }).limit(30);
};

export const getStaffWorkloadRepository = async (hotelId: Types.ObjectId, userId: Types.ObjectId) => {
  const [
    assignedBookings,
    bookingRevenue,
    assignedTasks,
    openTasks,
    housekeepingTasks,
    openHousekeepingTasks,
    maintenanceIssues,
    openMaintenanceIssues,
    assignedLeads,
    openLeads,
    assignedEnquiries,
    openEnquiries,
  ] = await Promise.all([
    Booking.countDocuments({ hotelId, assignedTo: userId, isDeleted: { $ne: true } }),
    Booking.aggregate([
      { $match: { hotelId, assignedTo: userId, isDeleted: { $ne: true } } },
      { $group: { _id: '$assignedTo', revenue: { $sum: '$paidAmount' } } },
    ]),
    Task.countDocuments({ hotelId, assignedTo: userId, isDeleted: { $ne: true } }),
    Task.countDocuments({ hotelId, assignedTo: userId, status: { $in: ['pending', 'scheduled', 'in_progress', 'missed', 'overdue', 'rescheduled'] }, isDeleted: { $ne: true } }),
    HousekeepingTask.countDocuments({ hotelId, assignedTo: userId, isDeleted: { $ne: true } }),
    HousekeepingTask.countDocuments({
      hotelId,
      assignedTo: userId,
      status: { $in: ['pending', 'assigned', 'in_progress', 'inspection_pending', 'reclean_required'] },
      isDeleted: { $ne: true },
    }),
    MaintenanceIssue.countDocuments({ hotelId, assignedTo: userId, isDeleted: { $ne: true } }),
    MaintenanceIssue.countDocuments({
      hotelId,
      assignedTo: userId,
      status: { $in: ['open', 'assigned', 'in_progress', 'on_hold', 'reopened'] },
      isDeleted: { $ne: true },
    }),
    Lead.countDocuments({ hotelId, assignedTo: userId, isDeleted: { $ne: true } }),
    Lead.countDocuments({
      hotelId,
      assignedTo: userId,
      status: { $nin: ['converted', 'lost', 'not_interested'] },
      isDeleted: { $ne: true },
    }),
    Enquiry.countDocuments({ hotelId, assignedTo: userId, isDeleted: { $ne: true } }),
    Enquiry.countDocuments({
      hotelId,
      assignedTo: userId,
      status: { $nin: ['converted_to_booking', 'closed', 'lost', 'spam', 'booked'] },
      isDeleted: { $ne: true },
    }),
  ]);

  return {
    assignedBookings,
    bookingRevenue: bookingRevenue[0]?.revenue ?? 0,
    assignedTasks,
    openTasks,
    housekeepingTasks,
    openHousekeepingTasks,
    maintenanceIssues,
    openMaintenanceIssues,
    assignedLeads,
    openLeads,
    assignedEnquiries,
    openEnquiries,
  };
};

export const findAuditLogsByStaffIdRepository = async (staffId: Types.ObjectId) => {
  return AuditLog.find({ entity: 'Staff', entityId: staffId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId', 'name email');
};

export const createAuditLogRepository = async (data: Record<string, unknown>): Promise<void> => {
  await AuditLog.create(data);
};

export const findDuplicateStaffAssignmentRepository = async (
  hotelId: string,
  userId: Types.ObjectId,
  excludeStaffId: string
) => {
  return HotelStaff.findOne({
    hotelId,
    userId,
    _id: { $ne: excludeStaffId },
  });
};
