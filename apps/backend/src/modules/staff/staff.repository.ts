import { FilterQuery, Types } from 'mongoose';
import { Hotel, HotelStaff, User, AuditLog } from '../../models';
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

  const [total, active, inactive, suspended, byRole, byDepartment] = await Promise.all([
    HotelStaff.countDocuments(baseFilter),
    HotelStaff.countDocuments({ ...baseFilter, status: 'active' }),
    HotelStaff.countDocuments({ ...baseFilter, status: 'inactive' }),
    HotelStaff.countDocuments({ ...baseFilter, status: 'suspended' }),
    HotelStaff.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
    HotelStaff.aggregate([
      { $match: { ...baseFilter, department: { $exists: true, $ne: '' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]),
  ]);

  return { total, active, inactive, suspended, byRole, byDepartment };
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
