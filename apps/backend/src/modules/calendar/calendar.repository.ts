import { Types } from 'mongoose';
import { Booking, Guest, HousekeepingTask, MaintenanceIssue, Room, RoomType } from '../../models';
import {
  CalendarAvailabilityResponse,
  CalendarBlockEvent,
  CalendarBookingsResponse,
  CalendarConflictResult,
  CalendarEvent,
  CalendarOccupancyDay,
  CalendarOccupancyResponse,
  CalendarOverview,
  CalendarResource,
  CalendarRoomTypeGroup,
  CalendarView,
  ResolvedCalendarRange,
} from './calendar.types';

const ACTIVE_BOOKING_STATUSES = ['reserved', 'pending', 'confirmed', 'checked_in'];
const PAST_BOOKING_STATUSES = ['checked_out', 'completed', 'cancelled', 'no_show'];

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const resolveCalendarRange = (
  fromDate?: Date,
  toDate?: Date,
  view: CalendarView = 'week'
): ResolvedCalendarRange => {
  const now = startOfDay(new Date());

  if (fromDate && toDate) {
    return { from: startOfDay(fromDate), to: endOfDay(toDate) };
  }

  if (view === 'day') {
    return { from: now, to: endOfDay(now) };
  }
  if (view === 'month') {
    const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return { from, to };
  }
  if (view === 'week' || view === 'timeline' || view === 'resource') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const from = addDays(now, -diff);
    return { from: startOfDay(from), to: endOfDay(addDays(from, 6)) };
  }

  return { from: now, to: endOfDay(addDays(now, 6)) };
};

const guestName = (guest: { fullName?: string; name?: string; phone?: string } | null | undefined) =>
  guest?.fullName || guest?.name || guest?.phone || 'Guest';

const getColorKey = (booking: {
  status: string;
  bookingType?: string;
  guestId?: { isVip?: boolean } | unknown;
}): string => {
  const guest = booking.guestId as { isVip?: boolean } | null;
  if (guest?.isVip) return 'vip';
  if (booking.bookingType === 'corporate') return 'corporate';
  if (booking.bookingType === 'wedding') return 'wedding';
  if (booking.bookingType === 'group') return 'group';
  if (booking.bookingType === 'walk_in') return 'walk_in';
  if (booking.bookingType === 'ota') return 'ota';
  if (booking.bookingType === 'direct') return 'direct';
  if (PAST_BOOKING_STATUSES.includes(booking.status)) {
    if (booking.status === 'cancelled' || booking.status === 'no_show') return booking.status;
    return 'checked_out';
  }
  if (booking.status === 'checked_in') return 'checked_in';
  if (booking.status === 'confirmed') return 'confirmed';
  if (booking.status === 'pending') return 'pending';
  return booking.status;
};

const baseFilter = (hotelId: string) => ({
  hotelId: new Types.ObjectId(hotelId),
  isDeleted: { $ne: true },
});

const overlapFilter = (range: ResolvedCalendarRange) => ({
  checkInDate: { $lt: range.to },
  checkOutDate: { $gt: range.from },
});

export const findBookingConflictRepository = async (
  hotelId: string,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<CalendarConflictResult> => {
  const room = await Room.findOne({ ...baseFilter(hotelId), _id: roomId }).lean();
  if (!room) {
    return { hasConflict: true, blockReason: 'Room not found' };
  }

  if (room.isBlocked || room.status === 'blocked') {
    return {
      hasConflict: true,
      roomBlocked: true,
      blockReason: room.blockedReason || 'Room is blocked',
    };
  }

  if (['maintenance', 'out_of_order'].includes(room.status)) {
    return {
      hasConflict: true,
      roomBlocked: true,
      blockReason: `Room is ${room.status.replace(/_/g, ' ')}`,
    };
  }

  const conflictFilter: Record<string, unknown> = {
    ...baseFilter(hotelId),
    roomId: new Types.ObjectId(roomId),
    status: { $in: ACTIVE_BOOKING_STATUSES },
    checkInDate: { $lt: checkOut },
    checkOutDate: { $gt: checkIn },
  };
  if (excludeBookingId) {
    conflictFilter._id = { $ne: new Types.ObjectId(excludeBookingId) };
  }

  const conflict = await Booking.findOne(conflictFilter)
    .populate('guestId', 'fullName name phone')
    .lean();

  if (!conflict) return { hasConflict: false };

  return {
    hasConflict: true,
    conflictingBooking: {
      id: String(conflict._id),
      bookingNumber: conflict.bookingNumber,
      guestName: guestName(conflict.guestId as Parameters<typeof guestName>[0]),
      checkInDate: conflict.checkInDate.toISOString(),
      checkOutDate: conflict.checkOutDate.toISOString(),
      status: conflict.status,
    },
  };
};

const mapBookingToEvent = (
  booking: Record<string, unknown>,
  conflictIds: Set<string>
): CalendarEvent => {
  const guest = booking.guestId as Parameters<typeof guestName>[0] & { _id?: unknown; isVip?: boolean };
  const room = booking.roomId as { _id?: unknown; roomNumber?: string; floor?: number } | null;
  const roomType = booking.roomTypeId as { _id?: unknown; name?: string } | null;

  return {
    id: String(booking._id),
    bookingNumber: String(booking.bookingNumber),
    guestId: String(guest?._id ?? booking.guestId),
    guestName: guestName(guest),
    guestIsVip: Boolean(guest?.isVip),
    roomId: room?._id ? String(room._id) : booking.roomId ? String(booking.roomId) : undefined,
    roomNumber: room?.roomNumber,
    roomTypeId: roomType?._id ? String(roomType._id) : booking.roomTypeId ? String(booking.roomTypeId) : undefined,
    roomTypeName: roomType?.name,
    floor: room?.floor,
    bookingType: String(booking.bookingType ?? 'individual'),
    source: String(booking.source ?? 'direct'),
    status: String(booking.status),
    paymentStatus: String(booking.paymentStatus ?? 'unpaid'),
    checkInDate: new Date(booking.checkInDate as Date).toISOString(),
    checkOutDate: new Date(booking.checkOutDate as Date).toISOString(),
    nights: Number(booking.nights ?? 1),
    totalAmount: Number(booking.totalAmount ?? 0),
    paidAmount: Number(booking.paidAmount ?? 0),
    adults: Number(booking.adults ?? 1),
    children: Number(booking.children ?? 0),
    hasConflict: conflictIds.has(String(booking._id)),
    colorKey: getColorKey({
      status: String(booking.status),
      bookingType: String(booking.bookingType),
      guestId: guest,
    }),
  };
};

const detectConflicts = async (hotelId: string, bookings: Array<{ _id: unknown; roomId?: unknown; checkInDate: Date; checkOutDate: Date }>) => {
  const conflictIds = new Set<string>();
  const roomBookings = new Map<string, typeof bookings>();

  bookings.forEach((booking) => {
    if (!booking.roomId) return;
    const key = String(booking.roomId);
    roomBookings.set(key, [...(roomBookings.get(key) ?? []), booking]);
  });

  roomBookings.forEach((items) => {
    const sorted = [...items].sort((a, b) => a.checkInDate.getTime() - b.checkInDate.getTime());
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        if (sorted[i].checkOutDate > sorted[j].checkInDate && sorted[i].checkInDate < sorted[j].checkOutDate) {
          conflictIds.add(String(sorted[i]._id));
          conflictIds.add(String(sorted[j]._id));
        }
      }
    }
  });

  const assignedBookings = bookings.filter((b) => b.roomId);
  await Promise.all(
    assignedBookings.map(async (booking) => {
      const result = await findBookingConflictRepository(
        hotelId,
        String(booking.roomId),
        booking.checkInDate,
        booking.checkOutDate,
        String(booking._id)
      );
      if (result.hasConflict) conflictIds.add(String(booking._id));
    })
  );

  return conflictIds;
};

export const getCalendarOverviewRepository = async (
  hotelId: string,
  range: ResolvedCalendarRange
): Promise<CalendarOverview> => {
  const filter = baseFilter(hotelId);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const nextWeek = endOfDay(addDays(new Date(), 7));

  const [
    todayCheckIns,
    todayCheckOuts,
    upcomingArrivals,
    upcomingDepartures,
    inHouseGuests,
    totalRooms,
    occupiedRooms,
    blockedRooms,
    maintenanceRooms,
    dirtyRooms,
    pendingPayments,
    bookingsInRange,
  ] = await Promise.all([
    Booking.countDocuments({ ...filter, checkInDate: { $gte: todayStart, $lte: todayEnd }, status: { $in: ['reserved', 'pending', 'confirmed'] } }),
    Booking.countDocuments({ ...filter, checkOutDate: { $gte: todayStart, $lte: todayEnd }, status: 'checked_in' }),
    Booking.countDocuments({ ...filter, checkInDate: { $gte: todayStart, $lte: nextWeek }, status: { $in: ['reserved', 'pending', 'confirmed'] } }),
    Booking.countDocuments({ ...filter, checkOutDate: { $gte: todayStart, $lte: nextWeek }, status: 'checked_in' }),
    Booking.countDocuments({ ...filter, status: 'checked_in' }),
    Room.countDocuments(filter),
    Room.countDocuments({ ...filter, status: 'occupied' }),
    Room.countDocuments({ ...filter, $or: [{ isBlocked: true }, { status: 'blocked' }] }),
    Room.countDocuments({ ...filter, status: 'maintenance' }),
    Room.countDocuments({ ...filter, housekeepingStatus: 'dirty' }),
    Booking.countDocuments({ ...filter, paymentStatus: { $in: ['unpaid', 'partially_paid'] }, status: { $in: ACTIVE_BOOKING_STATUSES } }),
    Booking.find({ ...filter, ...overlapFilter(range), status: { $nin: ['cancelled', 'no_show'] } }).select('roomId checkInDate checkOutDate').lean(),
  ]);

  const conflictIds = await detectConflicts(hotelId, bookingsInRange as Array<{ _id: unknown; roomId?: unknown; checkInDate: Date; checkOutDate: Date }>);

  return {
    generatedAt: new Date().toISOString(),
    dateRange: { from: range.from.toISOString(), to: range.to.toISOString() },
    todayCheckIns,
    todayCheckOuts,
    upcomingArrivals,
    upcomingDepartures,
    inHouseGuests,
    occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    totalRooms,
    occupiedRooms,
    availableRooms: totalRooms - occupiedRooms,
    blockedRooms,
    maintenanceRooms,
    dirtyRooms,
    conflictCount: conflictIds.size,
    pendingPayments,
  };
};

export const getCalendarBookingsRepository = async (
  hotelId: string,
  range: ResolvedCalendarRange,
  view: CalendarView,
  filters: {
    roomId?: string;
    roomTypeId?: string;
    floor?: number;
    status?: string;
    bookingType?: string;
    search?: string;
  }
): Promise<CalendarBookingsResponse> => {
  const bookingFilter: Record<string, unknown> = {
    ...baseFilter(hotelId),
    ...overlapFilter(range),
    status: { $nin: ['cancelled', 'no_show'] },
  };

  if (filters.roomId) bookingFilter.roomId = new Types.ObjectId(filters.roomId);
  if (filters.roomTypeId) bookingFilter.roomTypeId = new Types.ObjectId(filters.roomTypeId);
  if (filters.status) bookingFilter.status = filters.status;
  if (filters.bookingType) bookingFilter.bookingType = filters.bookingType;

  const roomFilter: Record<string, unknown> = { ...baseFilter(hotelId) };
  if (filters.roomTypeId) roomFilter.roomTypeId = new Types.ObjectId(filters.roomTypeId);
  if (filters.floor !== undefined) roomFilter.floor = filters.floor;

  const [bookings, rooms, roomTypes, maintenanceIssues, housekeepingTasks] = await Promise.all([
    Booking.find(bookingFilter)
      .populate('guestId', 'fullName name phone isVip')
      .populate('roomId', 'roomNumber floor status housekeepingStatus')
      .populate('roomTypeId', 'name code')
      .sort({ checkInDate: 1 })
      .lean(),
    Room.find(roomFilter)
      .populate('roomTypeId', 'name code')
      .populate('currentGuestId', 'fullName name')
      .sort({ floor: 1, roomNumber: 1 })
      .lean(),
    RoomType.find(baseFilter(hotelId)).sort({ sortOrder: 1, name: 1 }).lean(),
    MaintenanceIssue.find({
      ...baseFilter(hotelId),
      status: { $in: ['open', 'assigned', 'in_progress', 'on_hold'] },
      reportedAt: { $lte: range.to },
    })
      .populate('roomId', 'roomNumber')
      .lean(),
    HousekeepingTask.find({
      ...baseFilter(hotelId),
      taskType: 'checkout_cleaning',
      scheduledFor: { $gte: range.from, $lte: range.to },
      status: { $nin: ['completed', 'rejected'] },
    })
      .populate('roomId', 'roomNumber')
      .lean(),
  ]);

  let filteredBookings = bookings;
  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    filteredBookings = bookings.filter((booking) => {
      const guest = booking.guestId as Parameters<typeof guestName>[0];
      return (
        booking.bookingNumber.toLowerCase().includes(term) ||
        guestName(guest).toLowerCase().includes(term) ||
        String((booking.roomId as { roomNumber?: string } | null)?.roomNumber ?? '').toLowerCase().includes(term)
      );
    });
  }

  const conflictIds = await detectConflicts(
    hotelId,
    filteredBookings as Array<{ _id: unknown; roomId?: unknown; checkInDate: Date; checkOutDate: Date }>
  );

  const events = filteredBookings.map((booking) =>
    mapBookingToEvent(booking as unknown as Record<string, unknown>, conflictIds)
  );

  const resources: CalendarResource[] = rooms.map((room) => ({
    id: String(room._id),
    roomNumber: room.roomNumber,
    roomTypeId: String(room.roomTypeId),
    roomTypeName: (room.roomTypeId as { name?: string } | null)?.name || 'Room Type',
    floor: room.floor,
    status: room.status,
    housekeepingStatus: room.housekeepingStatus,
    maintenanceStatus: room.maintenanceStatus,
    isBlocked: Boolean(room.isBlocked || room.status === 'blocked'),
    currentGuestName: guestName(room.currentGuestId as Parameters<typeof guestName>[0]),
    currentBookingId: room.currentBookingId ? String(room.currentBookingId) : undefined,
  }));

  const blocks: CalendarBlockEvent[] = [];

  rooms.forEach((room) => {
    if (room.isBlocked || room.status === 'blocked') {
      blocks.push({
        id: `block-${room._id}`,
        roomId: String(room._id),
        roomNumber: room.roomNumber,
        blockType: 'blocked',
        title: room.blockedReason || 'Room blocked',
        from: (room.blockedFrom ?? range.from).toISOString(),
        to: (room.blockedTo ?? range.to).toISOString(),
        colorKey: 'blocked',
      });
    }
    if (room.status === 'maintenance') {
      blocks.push({
        id: `maintenance-room-${room._id}`,
        roomId: String(room._id),
        roomNumber: room.roomNumber,
        blockType: 'maintenance',
        title: 'Maintenance',
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        colorKey: 'maintenance',
      });
    }
  });

  maintenanceIssues.forEach((issue) => {
    const room = issue.roomId as { _id?: unknown; roomNumber?: string } | null;
    if (!room?._id) return;
    blocks.push({
      id: `maintenance-${issue._id}`,
      roomId: String(room._id),
      roomNumber: room.roomNumber || '-',
      blockType: 'maintenance',
      title: issue.title,
      from: issue.reportedAt.toISOString(),
      to: (issue.scheduledFor ?? issue.resolvedAt ?? range.to).toISOString(),
      status: issue.status,
      priority: issue.priority,
      colorKey: issue.priority === 'urgent' ? 'maintenance_urgent' : 'maintenance',
    });
  });

  housekeepingTasks.forEach((task) => {
    const room = task.roomId as { _id?: unknown; roomNumber?: string } | null;
    if (!room?._id || !task.scheduledFor) return;
    blocks.push({
      id: `hk-${task._id}`,
      roomId: String(room._id),
      roomNumber: room.roomNumber || '-',
      blockType: 'housekeeping',
      title: task.title || 'Checkout cleaning',
      from: task.scheduledFor.toISOString(),
      to: endOfDay(task.scheduledFor).toISOString(),
      status: task.status,
      priority: task.priority,
      colorKey: 'cleaning',
    });
  });

  const roomTypeGroups: CalendarRoomTypeGroup[] = roomTypes.map((roomType) => ({
    id: String(roomType._id),
    name: roomType.name,
    code: roomType.code,
    totalRooms: resources.filter((resource) => resource.roomTypeId === String(roomType._id)).length,
    rooms: resources.filter((resource) => resource.roomTypeId === String(roomType._id)),
  }));

  return {
    generatedAt: new Date().toISOString(),
    dateRange: { from: range.from.toISOString(), to: range.to.toISOString() },
    view,
    events,
    blocks,
    resources,
    roomTypeGroups,
  };
};

export const getCalendarOccupancyRepository = async (
  hotelId: string,
  range: ResolvedCalendarRange
): Promise<CalendarOccupancyResponse> => {
  const filter = baseFilter(hotelId);
  const totalRooms = await Room.countDocuments(filter);
  const days: CalendarOccupancyDay[] = [];

  let cursor = startOfDay(range.from);
  const end = startOfDay(range.to);

  while (cursor <= end) {
    const dayStart = startOfDay(cursor);
    const dayEnd = endOfDay(cursor);

    const [occupiedRooms, blockedRooms, checkIns, checkOuts] = await Promise.all([
      Booking.countDocuments({
        ...filter,
        status: { $in: ACTIVE_BOOKING_STATUSES },
        checkInDate: { $lte: dayEnd },
        checkOutDate: { $gt: dayStart },
      }),
      Room.countDocuments({ ...filter, $or: [{ isBlocked: true }, { status: 'blocked' }] }),
      Booking.countDocuments({ ...filter, checkInDate: { $gte: dayStart, $lte: dayEnd }, status: { $in: ['reserved', 'pending', 'confirmed', 'checked_in'] } }),
      Booking.countDocuments({ ...filter, checkOutDate: { $gte: dayStart, $lte: dayEnd }, status: { $in: ['checked_in', 'checked_out', 'completed'] } }),
    ]);

    days.push({
      date: dayStart.toISOString(),
      totalRooms,
      occupiedRooms,
      blockedRooms,
      occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      checkIns,
      checkOuts,
    });

    cursor = addDays(cursor, 1);
  }

  return {
    generatedAt: new Date().toISOString(),
    dateRange: { from: range.from.toISOString(), to: range.to.toISOString() },
    days,
  };
};

export const getCalendarAvailabilityRepository = async (
  hotelId: string,
  range: ResolvedCalendarRange,
  roomTypeId?: string
): Promise<CalendarAvailabilityResponse> => {
  const roomFilter: Record<string, unknown> = { ...baseFilter(hotelId), isBookable: { $ne: false } };
  if (roomTypeId) roomFilter.roomTypeId = new Types.ObjectId(roomTypeId);

  const rooms = await Room.find(roomFilter).populate('roomTypeId', 'name').sort({ roomNumber: 1 }).lean();

  const availability = await Promise.all(
    rooms.map(async (room) => {
      const conflict = await findBookingConflictRepository(
        hotelId,
        String(room._id),
        range.from,
        range.to
      );

      return {
        roomId: String(room._id),
        roomNumber: room.roomNumber,
        roomTypeId: String(room.roomTypeId),
        roomTypeName: (room.roomTypeId as { name?: string } | null)?.name || 'Room Type',
        floor: room.floor,
        isAvailable: !conflict.hasConflict,
        conflictReason: conflict.blockReason || conflict.conflictingBooking?.bookingNumber,
      };
    })
  );

  return {
    dateRange: { from: range.from.toISOString(), to: range.to.toISOString() },
    rooms: availability,
  };
};
