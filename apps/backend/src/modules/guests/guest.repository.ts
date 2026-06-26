import { FilterQuery, Types } from 'mongoose';
import {
  AuditLog,
  Booking,
  CampaignLog,
  Enquiry,
  Guest,
  Hotel,
  Payment,
  Review,
  Room,
  WhatsAppMessage,
} from '../../models';
import { IGuest } from '../../models/Guest';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { GuestStatsResult } from './guest.types';

export const findHotelByIdRepository = async (hotelId: string) => Hotel.findById(hotelId);

export const createGuestRepository = async (data: Record<string, unknown>): Promise<IGuest> => {
  return Guest.create(data);
};

export const findGuestByIdRepository = async (id: string): Promise<IGuest | null> => {
  return Guest.findOne({ _id: id, isDeleted: { $ne: true } });
};

export const findGuestByPhoneRepository = async (
  hotelId: string,
  phone: string,
  excludeId?: string
): Promise<IGuest | null> => {
  const filter: FilterQuery<IGuest> = { hotelId, phone, isDeleted: { $ne: true } };
  if (excludeId) filter._id = { $ne: excludeId };
  return Guest.findOne(filter);
};

export const findGuestByEmailRepository = async (
  hotelId: string,
  email: string,
  excludeId?: string
): Promise<IGuest | null> => {
  const filter: FilterQuery<IGuest> = { hotelId, email, isDeleted: { $ne: true } };
  if (excludeId) filter._id = { $ne: excludeId };
  return Guest.findOne(filter);
};

export const findGuestsRepository = async (
  baseFilter: FilterQuery<IGuest>,
  options: PaginationOptions
): Promise<PaginatedResponse<IGuest>> => {
  return paginate(Guest, options, baseFilter);
};

export const updateGuestRepository = async (guest: IGuest): Promise<IGuest> => {
  await guest.save();
  return guest;
};

export const softDeleteGuestRepository = async (
  id: string,
  deletedBy: string
): Promise<void> => {
  await Guest.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy,
    updatedBy: deletedBy,
  });
};

export const getGuestStatsRepository = async (hotelId: string): Promise<GuestStatsResult> => {
  const baseFilter = { hotelId, isDeleted: { $ne: true } };
  const now = new Date();
  const month = now.getMonth() + 1;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const inactiveCutoff = new Date(now);
  inactiveCutoff.setDate(inactiveCutoff.getDate() - 180);

  const [
    totalGuests,
    newGuestsThisMonth,
    repeatGuests,
    vipGuests,
    inactiveGuests,
    blacklistedGuests,
    birthdayThisMonth,
    anniversaryThisMonth,
    cityAgg,
    topSpenders,
    recentGuests,
    guestsWithNoBooking,
    campaignEligible,
  ] = await Promise.all([
    Guest.countDocuments(baseFilter),
    Guest.countDocuments({ ...baseFilter, createdAt: { $gte: startOfMonth } }),
    Guest.countDocuments({ ...baseFilter, isRepeatGuest: true }),
    Guest.countDocuments({ ...baseFilter, isVip: true }),
    Guest.countDocuments({
      ...baseFilter,
      $or: [
        { lastBookingDate: { $lt: inactiveCutoff } },
        { lastBookingDate: { $exists: false } },
        { lastBookingDate: null },
      ],
    }),
    Guest.countDocuments({ ...baseFilter, isBlacklisted: true }),
    Guest.countDocuments({
      ...baseFilter,
      dateOfBirth: { $exists: true, $ne: null },
      $expr: { $eq: [{ $month: '$dateOfBirth' }, month] },
    }),
    Guest.countDocuments({
      ...baseFilter,
      anniversaryDate: { $exists: true, $ne: null },
      $expr: { $eq: [{ $month: '$anniversaryDate' }, month] },
    }),
    Guest.aggregate([
      { $match: { ...baseFilter, city: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Guest.find({ ...baseFilter, totalSpend: { $gt: 0 } })
      .sort({ totalSpend: -1 })
      .limit(5)
      .select('fullName name totalSpend'),
    Guest.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(6)
      .select('fullName name phone city guestType isVip isRepeatGuest totalSpend createdAt'),
    Guest.countDocuments({ ...baseFilter, totalBookings: 0 }),
    Guest.countDocuments({
      ...baseFilter,
      marketingConsent: true,
      whatsappConsent: true,
      isBlacklisted: { $ne: true },
      $or: [
        { lastBookingDate: { $lt: ninetyDaysAgo } },
        { lastBookingDate: { $exists: false } },
        { lastBookingDate: null },
      ],
    }),
  ]);

  const topCities: Record<string, number> = {};
  cityAgg.forEach((item: { _id: string; count: number }) => {
    topCities[item._id] = item.count;
  });

  return {
    totalGuests,
    newGuestsThisMonth,
    repeatGuests,
    vipGuests,
    inactiveGuests,
    blacklistedGuests,
    birthdayThisMonth,
    anniversaryThisMonth,
    topCities,
    topSpendingGuests: topSpenders.map((g) => ({
      id: g._id.toString(),
      fullName: g.fullName || g.name,
      totalSpend: g.totalSpend,
    })),
    recentGuests: recentGuests.map((g) => ({
      id: g._id.toString(),
      fullName: g.fullName || g.name,
      phone: g.phone,
      city: g.city,
      guestType: g.guestType,
      isVip: g.isVip,
      isRepeatGuest: g.isRepeatGuest,
      totalSpend: g.totalSpend,
      createdAt: g.createdAt,
    })),
    guestsWithNoBooking,
    campaignEligible,
  };
};

export const findAuditLogsByGuestIdRepository = async (guestId: Types.ObjectId) => {
  return AuditLog.find({ entity: 'Guest', entityId: guestId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('userId', 'name email');
};

export const createAuditLogRepository = async (data: Record<string, unknown>): Promise<void> => {
  await AuditLog.create(data);
};

export const findGuestBookingsRepository = async (guestId: string, hotelId: string) => {
  return Booking.find({ guestId, hotelId, isDeleted: { $ne: true } })
    .sort({ checkInDate: -1 })
    .populate('roomId', 'roomNumber floor status')
    .populate('roomTypeId', 'name code basePrice')
    .populate('assignedTo', 'name email');
};

export const findGuestEnquiriesByPhoneRepository = async (hotelId: string, phone: string) => {
  return Enquiry.find({ hotelId, phone, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
};

export const findGuestPaymentsRepository = async (guestId: string, hotelId: string) => {
  return Payment.find({ guestId, hotelId, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .populate('bookingId', 'bookingNumber checkInDate checkOutDate status totalAmount paidAmount paymentStatus');
};

export const findGuestReviewsRepository = async (guestId: string, hotelId: string) => {
  return Review.find({ guestId, hotelId, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .populate('bookingId', 'bookingNumber checkInDate checkOutDate status');
};

export const findGuestCampaignLogsRepository = async (guestId: string, hotelId: string) => {
  return CampaignLog.find({ guestId, hotelId })
    .sort({ createdAt: -1 })
    .populate('campaignId', 'name type status campaignNumber channel launchedAt');
};

export const findGuestWhatsAppMessagesRepository = async (guestId: string, hotelId: string) => {
  return WhatsAppMessage.find({ guestId, hotelId, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('assignedTo', 'name email')
    .populate('bookingId', 'bookingNumber status')
    .populate('campaignId', 'name campaignNumber');
};

export const repointGuestReferencesRepository = async (
  fromGuestId: string,
  toGuestId: string,
  hotelId: string
): Promise<void> => {
  const fromId = new Types.ObjectId(fromGuestId);
  const toId = new Types.ObjectId(toGuestId);
  const hotelObjectId = new Types.ObjectId(hotelId);

  await Promise.all([
    Booking.updateMany({ guestId: fromId, hotelId: hotelObjectId }, { guestId: toId }),
    Payment.updateMany({ guestId: fromId, hotelId: hotelObjectId }, { guestId: toId }),
    Review.updateMany({ guestId: fromId, hotelId: hotelObjectId }, { guestId: toId }),
    CampaignLog.updateMany({ guestId: fromId, hotelId: hotelObjectId }, { guestId: toId }),
    WhatsAppMessage.updateMany({ guestId: fromId, hotelId: hotelObjectId }, { guestId: toId }),
    Room.updateMany(
      { currentGuestId: fromId, hotelId: hotelObjectId },
      { currentGuestId: toId }
    ),
  ]);
};

export const countActiveBookingsForGuestRepository = async (guestId: string): Promise<number> => {
  return Booking.countDocuments({
    guestId,
    status: { $in: ['pending', 'confirmed', 'checked_in'] },
    isDeleted: { $ne: true },
  });
};
