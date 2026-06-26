import { FilterQuery, Types } from 'mongoose';
import { recordBookingPayment } from '../payments/payments.service';
import { Booking, BookingRoom, Guest, Payment, Review, Room } from '../../models';
import { paginate } from '../../utils/pagination';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { triggerCheckoutReviewRequest } from '../reviews/reviews.service';
import {
  AssignRoomInput,
  CancelInput,
  CreateInput,
  ListQuery,
  NotesInput,
  PaymentInput,
  StatusInput,
  UpdateInput,
} from './bookings.validation';

interface Viewer { userId: string; role: string; hotelId?: string }

const assertAccess = (doc: unknown, viewer: Viewer): void => {
  if (viewer.role !== 'super_admin' && String((doc as { hotelId?: unknown }).hotelId) !== viewer.hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const getHotelId = (viewer: Viewer, hotelIdInput?: string): string => {
  const hotelId = viewer.role === 'super_admin' && hotelIdInput ? hotelIdInput : viewer.hotelId;
  if (!hotelId) throw new ValidationError('Hotel ID is required');
  return hotelId;
};

const toObjectId = (id?: string) => (id ? new Types.ObjectId(id) : undefined);

const startOfDay = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const addTimeline = (
  booking: InstanceType<typeof Booking>,
  action: string,
  viewer: Viewer,
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

const bookingPopulate = () => [
  { path: 'guestId', select: 'fullName name phone email city isVip isRepeatGuest totalSpend totalBookings lastStayDate' },
  { path: 'roomId', select: 'roomNumber floor status housekeepingStatus roomTypeId' },
  { path: 'roomTypeId', select: 'name code basePrice maxGuests bedType' },
  { path: 'enquiryId', select: 'guestName phone source status' },
  { path: 'assignedTo', select: 'name email role' },
];

const syncRoomForBooking = async (
  booking: InstanceType<typeof Booking>,
  status: string,
  viewer: Viewer
) => {
  if (!booking.roomId) return;
  const occupied = ['checked_in'].includes(status);
  const available = ['checked_out', 'completed', 'cancelled', 'no_show'].includes(status);
  if (occupied) {
    await Room.findOneAndUpdate(
      { _id: booking.roomId, hotelId: booking.hotelId, isDeleted: { $ne: true } },
      {
        status: 'occupied',
        currentBookingId: booking._id,
        currentGuestId: booking.guestId,
        updatedBy: viewer.userId,
      }
    );
  } else if (available) {
    await Room.findOneAndUpdate(
      { _id: booking.roomId, hotelId: booking.hotelId, currentBookingId: booking._id },
      {
        status: 'available',
        currentBookingId: undefined,
        currentGuestId: undefined,
        updatedBy: viewer.userId,
      }
    );
  }
};

const syncBookingRoomLink = async (booking: InstanceType<typeof Booking>) => {
  if (!booking.roomId || !booking.roomTypeId) return;
  await BookingRoom.findOneAndUpdate(
    { bookingId: booking._id, roomId: booking.roomId, hotelId: booking.hotelId },
    {
      bookingId: booking._id,
      roomId: booking.roomId,
      roomTypeId: booking.roomTypeId,
      hotelId: booking.hotelId,
      pricePerNight: booking.roomRate ?? Math.round((booking.totalAmount || 0) / Math.max(booking.nights || 1, 1)),
      isDeleted: false,
    },
    { upsert: true, new: true }
  );
};

const syncGuestBookingMetrics = async (guestId: Types.ObjectId, hotelId: Types.ObjectId) => {
  const [summary] = await Booking.aggregate([
    { $match: { guestId, hotelId, isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$guestId',
        totalBookings: { $sum: 1 },
        completedBookings: {
          $sum: { $cond: [{ $in: ['$status', ['checked_out', 'completed']] }, 1, 0] },
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        noShowCount: {
          $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] },
        },
        totalSpend: { $sum: '$paidAmount' },
        lastBookingDate: { $max: '$createdAt' },
        lastStayDate: { $max: '$checkOutDate' },
      },
    },
  ]);

  await Guest.findOneAndUpdate(
    { _id: guestId, hotelId },
    {
      totalBookings: summary?.totalBookings ?? 0,
      completedBookings: summary?.completedBookings ?? 0,
      cancelledBookings: summary?.cancelledBookings ?? 0,
      noShowCount: summary?.noShowCount ?? 0,
      totalSpend: summary?.totalSpend ?? 0,
      averageSpend: summary?.totalBookings ? Math.round((summary.totalSpend ?? 0) / summary.totalBookings) : 0,
      lastBookingDate: summary?.lastBookingDate,
      lastStayDate: summary?.lastStayDate,
      isRepeatGuest: (summary?.totalBookings ?? 0) >= 2,
    }
  );
};

const buildFilter = (query: ListQuery, viewer: Viewer): FilterQuery<InstanceType<typeof Booking>> => {
  const hotelId = getHotelId(viewer, query.hotelId);
  const filter: FilterQuery<InstanceType<typeof Booking>> = { hotelId };
  if (query.status) filter.status = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.bookingType) filter.bookingType = query.bookingType;
  if (query.source) filter.source = { $regex: query.source, $options: 'i' };
  if (query.guestId) filter.guestId = query.guestId;
  if (query.roomId) filter.roomId = query.roomId;
  if (query.roomTypeId) filter.roomTypeId = query.roomTypeId;
  if (query.checkInFrom || query.checkInTo) {
    filter.checkInDate = {};
    if (query.checkInFrom) filter.checkInDate.$gte = query.checkInFrom;
    if (query.checkInTo) filter.checkInDate.$lte = query.checkInTo;
  }
  if (query.checkOutFrom || query.checkOutTo) {
    filter.checkOutDate = {};
    if (query.checkOutFrom) filter.checkOutDate.$gte = query.checkOutFrom;
    if (query.checkOutTo) filter.checkOutDate.$lte = query.checkOutTo;
  }
  return filter;
};

export const list = async (query: ListQuery, viewer: Viewer) => {
  const result = await paginate(Booking, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['bookingNumber', 'source', 'couponCode'],
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  }, buildFilter(query, viewer));

  const ids = result.data.map((booking) => booking._id);
  const populated = await Booking.find({ _id: { $in: ids } })
    .populate(bookingPopulate())
    .sort({ [query.sortBy ?? 'createdAt']: query.sortOrder === 'asc' ? 1 : -1 });

  return { ...result, data: populated };
};

export const getById = async (id: string, viewer: Viewer) => {
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } }).populate(bookingPopulate());
  if (!doc) throw new NotFoundError('Booking not found');
  assertAccess(doc, viewer);
  const [payments, reviews] = await Promise.all([
    Payment.find({ bookingId: id, isDeleted: { $ne: true } }).sort({ createdAt: -1 }),
    Review.find({ bookingId: id, isDeleted: { $ne: true } }).sort({ createdAt: -1 }),
  ]);
  return {
    booking: doc,
    payments,
    reviews,
    timeline: doc.timeline ?? [],
  };
};

export const create = async (input: CreateInput, viewer: Viewer) => {
  const hotelId = getHotelId(viewer, input.hotelId);
  const guest = await Guest.findOne({ _id: input.guestId, hotelId, isDeleted: { $ne: true } });
  if (!guest) throw new NotFoundError('Guest not found for this hotel');
  if (input.roomId) {
    const conflicting = await Booking.findOne({
      hotelId,
      roomId: input.roomId,
      status: { $in: ['reserved', 'pending', 'confirmed', 'checked_in'] },
      isDeleted: { $ne: true },
      $or: [
        { checkInDate: { $lt: input.checkOutDate }, checkOutDate: { $gt: input.checkInDate } },
      ],
    });
    if (conflicting) throw new ConflictError('Selected room is already booked for these dates');
  }

  const booking = new Booking({
    ...input,
    hotelId,
    roomId: toObjectId(input.roomId),
    roomTypeId: toObjectId(input.roomTypeId),
    guestId: toObjectId(input.guestId),
    enquiryId: toObjectId(input.enquiryId),
    corporateLeadId: toObjectId(input.corporateLeadId),
    eventLeadId: toObjectId(input.eventLeadId),
    assignedTo: toObjectId(input.assignedTo),
    bookingNumber: `BKG-${Date.now()}`,
    bookingType: input.bookingType ?? 'individual',
    source: input.source ?? 'direct',
    status: input.status ?? 'reserved',
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  addTimeline(booking, 'booking.created', viewer, 'Booking created');
  await booking.save();
  await syncBookingRoomLink(booking);
  await syncGuestBookingMetrics(booking.guestId, booking.hotelId);
  return getById(booking._id.toString(), viewer);
};

export const update = async (id: string, input: UpdateInput, viewer: Viewer) => {
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Booking not found');
  assertAccess(doc, viewer);
  Object.assign(doc, input, {
    roomId: toObjectId(input.roomId) ?? doc.roomId,
    roomTypeId: toObjectId(input.roomTypeId) ?? doc.roomTypeId,
    assignedTo: toObjectId(input.assignedTo) ?? doc.assignedTo,
    updatedBy: viewer.userId,
  });
  addTimeline(doc, 'booking.updated', viewer, 'Booking details updated');
  await doc.save();
  await syncBookingRoomLink(doc);
  await syncGuestBookingMetrics(doc.guestId, doc.hotelId);
  return getById(id, viewer);
};

export const remove = async (id: string, viewer: Viewer) => {
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Booking not found');
  assertAccess(doc, viewer);
  if (doc.status === 'checked_in') throw new ConflictError('Cannot delete a checked-in booking');
  Object.assign(doc, { isDeleted: true, deletedAt: new Date(), deletedBy: viewer.userId });
  addTimeline(doc, 'booking.deleted', viewer, 'Booking archived');
  await doc.save();
  await BookingRoom.updateMany({ bookingId: doc._id, hotelId: doc.hotelId }, { isDeleted: true });
  await syncRoomForBooking(doc, 'cancelled', viewer);
  await syncGuestBookingMetrics(doc.guestId, doc.hotelId);
};

export const updateStatus = async (id: string, input: StatusInput, viewer: Viewer) => {
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Booking not found');
  assertAccess(doc, viewer);
  doc.status = input.status;
  if (input.status === 'checked_in') doc.checkedInAt = new Date();
  if (['checked_out', 'completed'].includes(input.status)) doc.checkedOutAt = new Date();
  if (input.status === 'cancelled') doc.cancelledAt = new Date();
  addTimeline(doc, `booking.${input.status}`, viewer, input.note || `Status changed to ${input.status}`);
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  await doc.save();
  if (['cancelled', 'checked_out', 'completed', 'no_show'].includes(input.status)) {
    await BookingRoom.updateMany({ bookingId: doc._id, hotelId: doc.hotelId }, { isDeleted: true });
  } else {
    await syncBookingRoomLink(doc);
  }
  await syncRoomForBooking(doc, input.status, viewer);
  await syncGuestBookingMetrics(doc.guestId, doc.hotelId);
  if (['checked_out', 'completed'].includes(input.status)) {
    await triggerCheckoutReviewRequest({
      _id: doc._id,
      hotelId: doc.hotelId,
      guestId: doc.guestId,
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy,
    });
  }
  return getById(id, viewer);
};

export const cancel = async (id: string, input: CancelInput, viewer: Viewer) => {
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Booking not found');
  assertAccess(doc, viewer);
  doc.status = 'cancelled';
  doc.cancelledAt = new Date();
  doc.cancellationReason = input.reason;
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'booking.cancelled', viewer, input.reason);
  await doc.save();
  await BookingRoom.updateMany({ bookingId: doc._id, hotelId: doc.hotelId }, { isDeleted: true });
  await syncRoomForBooking(doc, 'cancelled', viewer);
  await syncGuestBookingMetrics(doc.guestId, doc.hotelId);
  return getById(id, viewer);
};

export const checkIn = async (id: string, viewer: Viewer) => {
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Booking not found');
  assertAccess(doc, viewer);
  if (doc.roomId) {
    const room = await Room.findOne({ _id: doc.roomId, hotelId: doc.hotelId, isDeleted: { $ne: true } });
    if (!room) throw new NotFoundError('Assigned room not found');
    if (['dirty', 'cleaning_in_progress', 'needs_attention'].includes(room.housekeepingStatus)) {
      throw new ConflictError('Room is not ready for check-in. Please complete housekeeping first.');
    }
    if (['minor_issue', 'major_issue', 'under_repair'].includes(room.maintenanceStatus) || room.status === 'maintenance') {
      throw new ConflictError('Room is under maintenance. Please resolve maintenance issues before check-in.');
    }
  }
  return updateStatus(id, { status: 'checked_in' }, viewer);
};

export const checkOut = async (id: string, viewer: Viewer) => updateStatus(id, { status: 'checked_out' }, viewer);

export const assignRoom = async (id: string, input: AssignRoomInput, viewer: Viewer) => {
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Booking not found');
  assertAccess(doc, viewer);
  const room = await Room.findOne({ _id: input.roomId, hotelId: doc.hotelId, isDeleted: { $ne: true } });
  if (!room) throw new NotFoundError('Room not found');
  doc.roomId = room._id;
  doc.roomTypeId = room.roomTypeId;
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'booking.room_assigned', viewer, input.note || `Room ${room.roomNumber} assigned`);
  await doc.save();
  await syncBookingRoomLink(doc);
  return getById(id, viewer);
};

export const updateNotes = async (id: string, input: NotesInput, viewer: Viewer) => {
  const doc = await Booking.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Booking not found');
  assertAccess(doc, viewer);
  if (input.notes !== undefined) doc.notes = input.notes;
  if (input.internalNotes !== undefined) doc.internalNotes = input.internalNotes;
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'booking.notes_updated', viewer, 'Booking notes updated');
  await doc.save();
  return getById(id, viewer);
};

export const recordPayment = async (id: string, input: PaymentInput, viewer: Viewer) => {
  await recordBookingPayment(
    id,
    {
      amount: input.amount,
      method: input.method,
      status: input.status === 'completed' ? 'paid' : input.status,
      transactionId: input.transactionId,
      notes: input.notes,
    },
    viewer
  );
  return getById(id, viewer);
};

export const getStats = async (query: ListQuery, viewer: Viewer) => {
  const hotelId = getHotelId(viewer, query.hotelId);
  const baseFilter = { hotelId, isDeleted: { $ne: true } };
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const nextWeek = new Date(todayEnd);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const [
    totalBookings,
    todayBookings,
    upcomingCheckIns,
    upcomingCheckOuts,
    checkedIn,
    cancelled,
    revenueAgg,
    pendingAgg,
    statusAgg,
  ] = await Promise.all([
    Booking.countDocuments(baseFilter),
    Booking.countDocuments({ ...baseFilter, createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Booking.countDocuments({ ...baseFilter, checkInDate: { $gte: todayStart, $lte: nextWeek }, status: { $in: ['reserved', 'pending', 'confirmed'] } }),
    Booking.countDocuments({ ...baseFilter, checkOutDate: { $gte: todayStart, $lte: nextWeek }, status: 'checked_in' }),
    Booking.countDocuments({ ...baseFilter, status: 'checked_in' }),
    Booking.countDocuments({ ...baseFilter, status: 'cancelled' }),
    Booking.aggregate([{ $match: baseFilter }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
    Booking.aggregate([
      { $match: { ...baseFilter, paymentStatus: { $in: ['unpaid', 'partially_paid'] } } },
      { $group: { _id: null, total: { $sum: { $max: [{ $subtract: ['$totalAmount', '$paidAmount'] }, 0] } } } },
    ]),
    Booking.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  return {
    totalBookings,
    todayBookings,
    upcomingCheckIns,
    upcomingCheckOuts,
    checkedIn,
    cancelled,
    bookingRevenue: revenueAgg[0]?.total ?? 0,
    pendingRevenue: pendingAgg[0]?.total ?? 0,
    statusBreakdown: statusAgg.reduce<Record<string, number>>((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
  };
};

export const getUpcomingCheckIns = async (query: ListQuery, viewer: Viewer) => {
  const hotelId = getHotelId(viewer, query.hotelId);
  return Booking.find({
    hotelId,
    isDeleted: { $ne: true },
    checkInDate: { $gte: startOfDay() },
    status: { $in: ['reserved', 'pending', 'confirmed'] },
  }).sort({ checkInDate: 1 }).limit(query.limit ?? 10).populate(bookingPopulate());
};

export const getUpcomingCheckOuts = async (query: ListQuery, viewer: Viewer) => {
  const hotelId = getHotelId(viewer, query.hotelId);
  return Booking.find({
    hotelId,
    isDeleted: { $ne: true },
    checkOutDate: { $gte: startOfDay() },
    status: 'checked_in',
  }).sort({ checkOutDate: 1 }).limit(query.limit ?? 10).populate(bookingPopulate());
};
