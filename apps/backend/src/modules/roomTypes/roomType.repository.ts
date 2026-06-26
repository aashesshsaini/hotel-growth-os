import { FilterQuery, Types } from 'mongoose';
import { AuditLog, Booking, Hotel, Room, RoomType } from '../../models';
import { IRoomType } from '../../models/RoomType';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { RoomTypeStatsResult } from './roomType.types';

export const slugifyRoomType = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateRoomTypeCode = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase();
  }
  return words
    .map((word) => word[0])
    .join('')
    .slice(0, 6)
    .toUpperCase();
};

export const findHotelBySlugRepository = async (slug: string) => {
  return Hotel.findOne({ slug: slug.toLowerCase(), isDeleted: { $ne: true } });
};

export const findHotelByIdRepository = async (hotelId: string) => {
  return Hotel.findById(hotelId);
};

export const findRoomTypeBySlugInHotelRepository = async (hotelId: string, slug: string) => {
  return RoomType.findOne({ hotelId, slug, isDeleted: { $ne: true } });
};

export const findRoomTypeByCodeInHotelRepository = async (
  hotelId: string,
  code: string,
  excludeId?: string
) => {
  const filter: FilterQuery<IRoomType> = { hotelId, code, isDeleted: { $ne: true } };
  if (excludeId) filter._id = { $ne: excludeId };
  return RoomType.findOne(filter);
};

export const findRoomTypeByNameInHotelRepository = async (
  hotelId: string,
  name: string,
  excludeId?: string
) => {
  const filter: FilterQuery<IRoomType> = {
    hotelId,
    name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    isDeleted: { $ne: true },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return RoomType.findOne(filter);
};

export const generateUniqueRoomTypeSlugRepository = async (
  hotelId: string,
  name: string,
  excludeId?: string
): Promise<string> => {
  const baseSlug = slugifyRoomType(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const filter: FilterQuery<IRoomType> = { hotelId, slug, isDeleted: { $ne: true } };
    if (excludeId) filter._id = { $ne: excludeId };
    const existing = await RoomType.findOne(filter).setOptions({ includeDeleted: true });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

export const generateUniqueRoomTypeCodeRepository = async (
  hotelId: string,
  name: string,
  excludeId?: string
): Promise<string> => {
  const baseCode = generateRoomTypeCode(name);
  let code = baseCode;
  let counter = 1;

  while (true) {
    const existing = await findRoomTypeByCodeInHotelRepository(hotelId, code, excludeId);
    if (!existing) return code;
    code = `${baseCode}${counter}`;
    counter += 1;
  }
};

export const createRoomTypeRepository = async (data: Record<string, unknown>) => {
  return RoomType.create(data);
};

export const findRoomTypeByIdRepository = async (id: string): Promise<IRoomType | null> => {
  return RoomType.findById(id);
};

export const findRoomTypesRepository = async (
  baseFilter: FilterQuery<IRoomType>,
  options: PaginationOptions
): Promise<PaginatedResponse<IRoomType>> => {
  return paginate(RoomType, options, baseFilter);
};

export const findPublicRoomTypesRepository = async (hotelId: string): Promise<IRoomType[]> => {
  return RoomType.find({
    hotelId,
    status: 'active',
    isVisibleOnWebsite: true,
    isAvailableForBooking: true,
    isDeleted: { $ne: true },
  })
    .sort({ sortOrder: 1, basePrice: 1 })
    .exec();
};

export const updateRoomTypeRepository = async (roomType: IRoomType): Promise<IRoomType> => {
  await roomType.save();
  return roomType;
};

export const softDeleteRoomTypeRepository = async (
  id: string,
  deletedBy: string
): Promise<void> => {
  await RoomType.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy,
    status: 'archived',
    isActive: false,
    isAvailableForBooking: false,
    updatedBy: deletedBy,
  });
};

export const countRoomsByRoomTypeRepository = async (roomTypeId: string): Promise<number> => {
  return Room.countDocuments({ roomTypeId, isDeleted: { $ne: true } });
};

export const getRoomTypeStatsRepository = async (hotelId: string): Promise<RoomTypeStatsResult> => {
  const baseFilter = { hotelId, isDeleted: { $ne: true } };

  const [
    totalRoomTypes,
    activeRoomTypes,
    inactiveRoomTypes,
    visibleOnWebsite,
    availableForBooking,
    priceStats,
    roomTypesWithoutImages,
    totalRoomsLinked,
    roomAvailabilityAgg,
    bookingAgg,
  ] = await Promise.all([
    RoomType.countDocuments(baseFilter),
    RoomType.countDocuments({ ...baseFilter, status: 'active' }),
    RoomType.countDocuments({ ...baseFilter, status: 'inactive' }),
    RoomType.countDocuments({ ...baseFilter, isVisibleOnWebsite: true }),
    RoomType.countDocuments({ ...baseFilter, isAvailableForBooking: true }),
    RoomType.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          averageBasePrice: { $avg: '$basePrice' },
          lowestPrice: { $min: '$basePrice' },
          highestPrice: { $max: '$basePrice' },
        },
      },
    ]),
    RoomType.countDocuments({
      ...baseFilter,
      $or: [{ images: { $size: 0 } }, { images: { $exists: false } }],
    }),
    Room.aggregate([
      { $match: { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]),
    Room.aggregate([
      { $match: { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$roomTypeId',
          linkedRooms: { $sum: 1 },
          availableRooms: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'available'] },
                    { $ne: ['$isBookable', false] },
                    { $ne: ['$isBlocked', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          occupiedRooms: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
        },
      },
    ]),
    Booking.aggregate([
      { $match: { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true }, roomTypeId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$roomTypeId',
          bookings: { $sum: 1 },
          revenue: { $sum: '$paidAmount' },
        },
      },
      { $sort: { bookings: -1, revenue: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const prices = priceStats[0] ?? { averageBasePrice: 0, lowestPrice: 0, highestPrice: 0 };
  const totalAvailableRooms = roomAvailabilityAgg.reduce((sum: number, item: { availableRooms: number }) => sum + item.availableRooms, 0);
  const totalOccupiedRooms = roomAvailabilityAgg.reduce((sum: number, item: { occupiedRooms: number }) => sum + item.occupiedRooms, 0);
  const totalBookings = bookingAgg.reduce((sum: number, item: { bookings: number }) => sum + item.bookings, 0);
  const totalRevenue = bookingAgg.reduce((sum: number, item: { revenue: number }) => sum + item.revenue, 0);
  const popularRoomTypeIds = [
    ...new Set([
      ...bookingAgg.map((item: { _id: Types.ObjectId }) => item._id?.toString()).filter(Boolean),
      ...roomAvailabilityAgg.map((item: { _id: Types.ObjectId }) => item._id?.toString()).filter(Boolean),
    ]),
  ];
  const popularRoomTypeDocs = await RoomType.find({ _id: { $in: popularRoomTypeIds } }).select('name');
  const popularNameMap = new Map(popularRoomTypeDocs.map((rt) => [rt._id.toString(), rt.name]));
  const roomAvailabilityMap = new Map(
    roomAvailabilityAgg.map((item: { _id: Types.ObjectId; linkedRooms: number; availableRooms: number }) => [
      item._id.toString(),
      item,
    ])
  );

  return {
    totalRoomTypes,
    activeRoomTypes,
    inactiveRoomTypes,
    visibleOnWebsite,
    availableForBooking,
    averageBasePrice: Math.round(prices.averageBasePrice ?? 0),
    lowestPrice: prices.lowestPrice ?? 0,
    highestPrice: prices.highestPrice ?? 0,
    totalRoomsLinked: totalRoomsLinked[0]?.count ?? 0,
    totalAvailableRooms,
    totalOccupiedRooms,
    totalBookings,
    totalRevenue,
    popularRoomTypes: bookingAgg.map((item: { _id: Types.ObjectId; bookings: number; revenue: number }) => {
      const id = item._id.toString();
      const availability = roomAvailabilityMap.get(id);
      return {
        id,
        name: popularNameMap.get(id) ?? 'Unknown',
        bookings: item.bookings,
        revenue: item.revenue,
        linkedRooms: availability?.linkedRooms ?? 0,
        availableRooms: availability?.availableRooms ?? 0,
      };
    }),
    roomTypesWithoutImages,
  };
};

export const findAuditLogsByRoomTypeIdRepository = async (roomTypeId: Types.ObjectId) => {
  return AuditLog.find({ entity: 'RoomType', entityId: roomTypeId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId', 'name email');
};

export const createAuditLogRepository = async (data: Record<string, unknown>): Promise<void> => {
  await AuditLog.create(data);
};
