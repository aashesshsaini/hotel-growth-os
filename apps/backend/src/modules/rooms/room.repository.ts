import { FilterQuery, Types } from 'mongoose';
import { AuditLog, Booking, BookingRoom, Room, RoomType } from '../../models';
import { IRoom } from '../../models/Room';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { RoomStatsResult } from './room.types';

export const findRoomTypeByIdRepository = async (roomTypeId: string) => {
  return RoomType.findById(roomTypeId);
};

export const findRoomByNumberInHotelRepository = async (
  hotelId: string,
  roomNumber: string,
  excludeRoomId?: string
) => {
  const filter: FilterQuery<IRoom> = { hotelId, roomNumber, isDeleted: { $ne: true } };
  if (excludeRoomId) filter._id = { $ne: excludeRoomId };
  return Room.findOne(filter);
};

export const createRoomRepository = async (data: Record<string, unknown>) => {
  return Room.create(data);
};

export const findRoomByIdRepository = async (id: string, populate = true): Promise<IRoom | null> => {
  const query = Room.findById(id);
  if (populate) {
    query.populate('roomTypeId', 'name basePrice maxGuests amenities');
    query.populate('currentGuestId', 'name phone');
    query.populate('currentBookingId', 'bookingNumber status checkInDate checkOutDate');
  }
  return query.exec();
};

export const findRoomsRepository = async (
  baseFilter: FilterQuery<IRoom>,
  options: PaginationOptions
): Promise<PaginatedResponse<IRoom>> => {
  const result = await paginate(Room, options, baseFilter);
  await Room.populate(result.data, [
    { path: 'roomTypeId', select: 'name basePrice maxGuests' },
    { path: 'currentGuestId', select: 'name phone' },
    { path: 'currentBookingId', select: 'bookingNumber status' },
  ]);
  return result;
};

export const updateRoomRepository = async (room: IRoom): Promise<IRoom> => {
  await room.save();
  return room;
};

export const softDeleteRoomRepository = async (id: string, deletedBy: string): Promise<void> => {
  await Room.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy,
    updatedBy: deletedBy,
  });
};

export const getUnavailableRoomIdsRepository = async (
  hotelId: string,
  checkInDate: Date,
  checkOutDate: Date,
  excludeBookingId?: string
): Promise<Types.ObjectId[]> => {
  const overlappingFilter: FilterQuery<typeof Booking.prototype> = {
    hotelId,
    status: { $nin: ['cancelled', 'checked_out'] },
    checkInDate: { $lt: checkOutDate },
    checkOutDate: { $gt: checkInDate },
  };
  if (excludeBookingId) {
    overlappingFilter._id = { $ne: excludeBookingId };
  }

  const overlappingBookings = await Booking.find(overlappingFilter).select('_id');
  const bookingIds = overlappingBookings.map((b) => b._id);
  if (!bookingIds.length) return [];

  return BookingRoom.find({ bookingId: { $in: bookingIds }, hotelId }).distinct('roomId');
};

export const findAvailableRoomsRepository = async (
  hotelId: string,
  checkInDate: Date,
  checkOutDate: Date,
  unavailableRoomIds: Types.ObjectId[],
  roomTypeId?: string,
  numberOfGuests?: number
): Promise<IRoom[]> => {
  const filter: FilterQuery<IRoom> = {
    hotelId,
    isDeleted: { $ne: true },
    isBookable: true,
    isBlocked: { $ne: true },
    status: { $in: ['available'] },
    maintenanceStatus: { $nin: ['under_repair', 'major_issue'] },
    _id: { $nin: unavailableRoomIds },
  };

  if (roomTypeId) filter.roomTypeId = roomTypeId;

  const rooms = await Room.find(filter)
    .populate('roomTypeId', 'name basePrice maxGuests amenities')
    .sort({ roomNumber: 1 })
    .exec();

  if (!numberOfGuests) return rooms;

  return rooms.filter((room) => {
    const roomType = room.roomTypeId as { maxGuests?: number } | undefined;
    const maxGuests = room.maxGuestsOverride ?? roomType?.maxGuests ?? 1;
    return maxGuests >= numberOfGuests;
  });
};

export const countActiveBookingsForRoomRepository = async (roomId: string): Promise<number> => {
  const bookingRooms = await BookingRoom.find({
    roomId,
    hotelId: { $exists: true },
  }).distinct('bookingId');

  if (!bookingRooms.length) return 0;

  return Booking.countDocuments({
    _id: { $in: bookingRooms },
    status: { $nin: ['cancelled', 'checked_out'] },
  });
};

export const getRoomStatsRepository = async (hotelId: string): Promise<RoomStatsResult> => {
  const baseFilter = { hotelId, isDeleted: { $ne: true } };

  const [
    totalRooms,
    availableRooms,
    occupiedRooms,
    reservedRooms,
    dirtyRooms,
    cleaningRooms,
    maintenanceRooms,
    blockedRooms,
    outOfOrderRooms,
    roomTypeAgg,
    floorAgg,
    housekeepingAgg,
  ] = await Promise.all([
    Room.countDocuments(baseFilter),
    Room.countDocuments({ ...baseFilter, status: 'available' }),
    Room.countDocuments({ ...baseFilter, status: 'occupied' }),
    Room.countDocuments({ ...baseFilter, status: 'reserved' }),
    Room.countDocuments({ ...baseFilter, status: 'dirty' }),
    Room.countDocuments({ ...baseFilter, status: 'cleaning' }),
    Room.countDocuments({ ...baseFilter, status: 'maintenance' }),
    Room.countDocuments({ ...baseFilter, status: 'blocked' }),
    Room.countDocuments({ ...baseFilter, status: 'out_of_order' }),
    Room.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$roomTypeId', count: { $sum: 1 } } },
    ]),
    Room.aggregate([
      { $match: { ...baseFilter, floor: { $exists: true, $ne: null } } },
      { $group: { _id: '$floor', count: { $sum: 1 } } },
    ]),
    Room.aggregate([
      { $match: baseFilter },
      { $group: { _id: '$housekeepingStatus', count: { $sum: 1 } } },
    ]),
  ]);

  const roomTypeIds = roomTypeAgg.map((r: { _id: Types.ObjectId }) => r._id);
  const roomTypes = await RoomType.find({ _id: { $in: roomTypeIds } }).select('name');
  const roomTypeNameMap = new Map(roomTypes.map((rt) => [rt._id.toString(), rt.name]));

  const roomTypeWiseCount: Record<string, number> = {};
  roomTypeAgg.forEach((item: { _id: Types.ObjectId; count: number }) => {
    const name = roomTypeNameMap.get(item._id.toString()) || 'Unknown';
    roomTypeWiseCount[name] = item.count;
  });

  const floorWiseCount: Record<string, number> = {};
  floorAgg.forEach((item: { _id: number; count: number }) => {
    floorWiseCount[String(item._id)] = item.count;
  });

  const housekeepingSummary: Record<string, number> = {};
  housekeepingAgg.forEach((item: { _id: string; count: number }) => {
    housekeepingSummary[item._id || 'unknown'] = item.count;
  });

  const occupancyPercentage =
    totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return {
    totalRooms,
    availableRooms,
    occupiedRooms,
    reservedRooms,
    dirtyRooms,
    cleaningRooms,
    maintenanceRooms,
    blockedRooms,
    outOfOrderRooms,
    occupancyPercentage,
    roomTypeWiseCount,
    floorWiseCount,
    housekeepingSummary,
  };
};

export const findAuditLogsByRoomIdRepository = async (roomId: Types.ObjectId) => {
  return AuditLog.find({ entity: 'Room', entityId: roomId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId', 'name email');
};

export const createAuditLogRepository = async (data: Record<string, unknown>): Promise<void> => {
  await AuditLog.create(data);
};

export const bulkUpdateRoomsRepository = async (
  filter: FilterQuery<IRoom>,
  update: Record<string, unknown>
): Promise<number> => {
  const result = await Room.updateMany(filter, update);
  return result.modifiedCount;
};
