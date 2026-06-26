import { Types } from 'mongoose';
import { Booking, Guest, Room } from '../../models';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { create as createBooking, getById as getBookingById, update as updateBooking } from '../bookings/bookings.service';
import {
  findBookingConflictRepository,
  getCalendarAvailabilityRepository,
  getCalendarBookingsRepository,
  getCalendarOccupancyRepository,
  getCalendarOverviewRepository,
  resolveCalendarRange,
} from './calendar.repository';
import {
  CalendarAvailabilityResponse,
  CalendarBookingsResponse,
  CalendarConflictResult,
  CalendarOccupancyResponse,
  CalendarOverview,
  ViewerContext,
} from './calendar.types';
import {
  CalendarQuery,
  ConflictQuery,
  MoveBookingInput,
  QuickBookingInput,
  ResizeBookingInput,
} from './calendar.validation';

const CALENDAR_VIEW_ROLES = [
  'super_admin',
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
];

const CALENDAR_MANAGE_ROLES = [
  'super_admin',
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
];

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) throw new ValidationError('Hotel ID is required');
  return resolved;
};

const assertCanView = (viewer: ViewerContext): void => {
  if (!CALENDAR_VIEW_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to view the calendar');
  }
};

const assertCanManage = (viewer: ViewerContext): void => {
  if (!CALENDAR_MANAGE_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to manage calendar bookings');
  }
};

const assertHotelAccess = (viewer: ViewerContext, hotelId: string): void => {
  if (viewer.role !== 'super_admin' && viewer.hotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const resolveRangeFromQuery = (query: CalendarQuery) =>
  resolveCalendarRange(query.fromDate, query.toDate, query.view);

const addTimeline = (
  booking: InstanceType<typeof Booking>,
  action: string,
  viewer: ViewerContext,
  message?: string,
  metadata?: Record<string, unknown>
) => {
  booking.timeline = [
    ...(booking.timeline ?? []),
    {
      action,
      message,
      createdBy: new Types.ObjectId(viewer.userId),
      createdAt: new Date(),
      metadata,
    },
  ];
};

export const getOverview = async (query: CalendarQuery, viewer: ViewerContext): Promise<CalendarOverview> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const range = resolveRangeFromQuery(query);
  return getCalendarOverviewRepository(hotelId, range);
};

export const getBookings = async (query: CalendarQuery, viewer: ViewerContext): Promise<CalendarBookingsResponse> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const range = resolveRangeFromQuery(query);
  return getCalendarBookingsRepository(hotelId, range, query.view, {
    roomId: query.roomId,
    roomTypeId: query.roomTypeId,
    floor: query.floor,
    status: query.status,
    bookingType: query.bookingType,
    search: query.search,
  });
};

export const getOccupancy = async (query: CalendarQuery, viewer: ViewerContext): Promise<CalendarOccupancyResponse> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const range = resolveRangeFromQuery(query);
  return getCalendarOccupancyRepository(hotelId, range);
};

export const getAvailability = async (query: CalendarQuery, viewer: ViewerContext): Promise<CalendarAvailabilityResponse> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const range = resolveRangeFromQuery(query);
  return getCalendarAvailabilityRepository(hotelId, range, query.roomTypeId);
};

export const checkConflict = async (query: ConflictQuery, viewer: ViewerContext): Promise<CalendarConflictResult> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  if (query.checkOutDate <= query.checkInDate) {
    throw new ValidationError('Check-out must be after check-in');
  }
  return findBookingConflictRepository(
    hotelId,
    query.roomId,
    query.checkInDate,
    query.checkOutDate,
    query.excludeBookingId
  );
};

export const moveBooking = async (
  id: string,
  input: MoveBookingInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Booking not found');
  assertHotelAccess(viewer, doc.hotelId.toString());

  const roomId = input.roomId ?? doc.roomId?.toString();
  if (roomId) {
    const conflict = await findBookingConflictRepository(
      doc.hotelId.toString(),
      roomId,
      input.checkInDate,
      input.checkOutDate,
      id
    );
    if (conflict.hasConflict) {
      throw new ConflictError(
        conflict.blockReason ||
          `Room conflict with booking ${conflict.conflictingBooking?.bookingNumber ?? 'existing reservation'}`
      );
    }
  }

  return updateBooking(
    id,
    {
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      roomId: input.roomId,
      notes: input.note ? `${doc.notes ?? ''}\n${input.note}`.trim() : doc.notes,
    },
    viewer
  );
};

export const resizeBooking = async (
  id: string,
  input: ResizeBookingInput,
  viewer: ViewerContext
) => {
  assertCanManage(viewer);
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Booking not found');
  assertHotelAccess(viewer, doc.hotelId.toString());

  const checkInDate = input.checkInDate ?? doc.checkInDate;
  const checkOutDate = input.checkOutDate ?? doc.checkOutDate;

  if (checkOutDate <= checkInDate) {
    throw new ValidationError('Check-out must be after check-in');
  }

  if (doc.roomId) {
    const conflict = await findBookingConflictRepository(
      doc.hotelId.toString(),
      doc.roomId.toString(),
      checkInDate,
      checkOutDate,
      id
    );
    if (conflict.hasConflict) {
      throw new ConflictError(
        conflict.blockReason ||
          `Room conflict with booking ${conflict.conflictingBooking?.bookingNumber ?? 'existing reservation'}`
      );
    }
  }

  return updateBooking(
    id,
    {
      checkInDate,
      checkOutDate,
      notes: input.note ? `${doc.notes ?? ''}\n${input.note}`.trim() : doc.notes,
    },
    viewer
  );
};

export const quickBooking = async (input: QuickBookingInput, viewer: ViewerContext) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);

  if (input.roomId) {
    const conflict = await findBookingConflictRepository(
      hotelId,
      input.roomId,
      input.checkInDate,
      input.checkOutDate
    );
    if (conflict.hasConflict) {
      throw new ConflictError(
        conflict.blockReason ||
          `Room conflict with booking ${conflict.conflictingBooking?.bookingNumber ?? 'existing reservation'}`
      );
    }
  }

  let roomTypeId = input.roomTypeId;
  if (input.roomId && !roomTypeId) {
    const room = await Room.findOne({ _id: input.roomId, hotelId, isDeleted: { $ne: true } });
    if (!room) throw new NotFoundError('Room not found');
    roomTypeId = room.roomTypeId.toString();
  }

  const guest = await Guest.findOne({ _id: input.guestId, hotelId, isDeleted: { $ne: true } });
  if (!guest) throw new NotFoundError('Guest not found');

  return createBooking(
    {
      hotelId,
      guestId: input.guestId,
      roomId: input.roomId,
      roomTypeId,
      bookingType: input.bookingType,
      source: input.source ?? 'direct',
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      adults: input.adults,
      children: input.children,
      status: input.status,
      paymentStatus: 'unpaid',
      totalAmount: input.totalAmount,
      paidAmount: 0,
      notes: input.notes,
    },
    viewer
  );
};

export const transferBookingRoom = async (
  id: string,
  roomId: string,
  viewer: ViewerContext,
  note?: string
) => {
  assertCanManage(viewer);
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Booking not found');
  assertHotelAccess(viewer, doc.hotelId.toString());

  const room = await Room.findOne({ _id: roomId, hotelId: doc.hotelId, isDeleted: { $ne: true } });
  if (!room) throw new NotFoundError('Room not found');

  const conflict = await findBookingConflictRepository(
    doc.hotelId.toString(),
    roomId,
    doc.checkInDate,
    doc.checkOutDate,
    id
  );
  if (conflict.hasConflict) {
    throw new ConflictError(
      conflict.blockReason ||
        `Room conflict with booking ${conflict.conflictingBooking?.bookingNumber ?? 'existing reservation'}`
    );
  }

  const previousRoomId = doc.roomId;
  doc.roomId = room._id;
  doc.roomTypeId = room.roomTypeId;
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'booking.room_transferred', viewer, note || `Transferred to room ${room.roomNumber}`, {
    previousRoomId,
    newRoomId: room._id,
  });
  await doc.save();

  return getBookingById(id, viewer);
};
