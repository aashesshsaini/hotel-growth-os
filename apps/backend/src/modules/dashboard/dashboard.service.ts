import { FilterQuery, Types } from 'mongoose';
import {
  Booking,
  Campaign,
  Enquiry,
  Guest,
  Payment,
  Review,
  Room,
  Task,
  WhatsAppMessage,
} from '../../models';

interface Viewer {
  hotelId?: string;
}

const startOfDay = (date = new Date()): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date = new Date()): Date => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const startOfMonth = (date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const sumField = async (
  model: typeof Payment | typeof Booking,
  filter: Record<string, unknown>,
  field: string
): Promise<number> => {
  const result = await model.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return result[0]?.total ?? 0;
};

const serializeGuestName = (guest: unknown): string => {
  if (!guest || typeof guest !== 'object') return 'Guest';
  const value = guest as { fullName?: string; name?: string; phone?: string };
  return value.fullName || value.name || value.phone || 'Guest';
};

export const getDashboard = async (viewer: Viewer) => {
  const hotelFilter = viewer.hotelId ? { hotelId: new Types.ObjectId(viewer.hotelId) } : {};
  const activeFilter = { ...hotelFilter, isDeleted: { $ne: true } };
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const monthStart = startOfMonth();

  const [
    totalBookings,
    todayBookings,
    totalGuests,
    newGuestsThisMonth,
    totalRooms,
    occupiedRooms,
    availableRooms,
    totalPaymentRevenue,
    fallbackBookingRevenue,
    pendingPaymentAmount,
    pendingBookingAmount,
    newEnquiries,
    pendingFollowUps,
    reviewCount,
    reviewRatingAgg,
    activeCampaigns,
    whatsappAutomationCount,
    recentBookings,
    recentEnquiries,
    bookingStatusAgg,
    enquiryStatusAgg,
  ] = await Promise.all([
    Booking.countDocuments(activeFilter),
    Booking.countDocuments({ ...activeFilter, createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Guest.countDocuments(activeFilter),
    Guest.countDocuments({ ...activeFilter, createdAt: { $gte: monthStart } }),
    Room.countDocuments(activeFilter),
    Room.countDocuments({ ...activeFilter, status: 'occupied' }),
    Room.countDocuments({ ...activeFilter, status: 'available', isBookable: { $ne: false }, isBlocked: { $ne: true } }),
    sumField(Payment, { ...activeFilter, status: 'completed' }, 'amount'),
    sumField(Booking, activeFilter, 'paidAmount'),
    sumField(Payment, { ...activeFilter, status: 'pending' }, 'amount'),
    Booking.aggregate([
      { $match: { ...activeFilter, paymentStatus: { $in: ['unpaid', 'partially_paid'] } } },
      {
        $group: {
          _id: null,
          total: { $sum: { $max: [{ $subtract: ['$totalAmount', '$paidAmount'] }, 0] } },
        },
      },
    ]).then((result) => result[0]?.total ?? 0),
    Enquiry.countDocuments({ ...activeFilter, status: 'new' }),
    Task.countDocuments({ ...activeFilter, status: { $in: ['pending', 'in_progress'] } }),
    Review.countDocuments(activeFilter),
    Review.aggregate([
      { $match: activeFilter },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } },
    ]),
    Campaign.countDocuments({ ...activeFilter, status: { $in: ['scheduled', 'running'] } }),
    WhatsAppMessage.countDocuments({ ...activeFilter, direction: 'outgoing' }),
    Booking.find(activeFilter)
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('guestId', 'fullName name phone')
      .lean(),
    Enquiry.find(activeFilter).sort({ createdAt: -1 }).limit(6).lean(),
    Booking.aggregate([
      { $match: activeFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Enquiry.aggregate([
      { $match: activeFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const occupancyPercentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const totalRevenue = totalPaymentRevenue > 0 ? totalPaymentRevenue : fallbackBookingRevenue;
  const pendingPayments = pendingPaymentAmount > 0 ? pendingPaymentAmount : pendingBookingAmount;
  const averageRating = Number((reviewRatingAgg[0]?.averageRating ?? 0).toFixed(1));

  return {
    generatedAt: new Date(),
    summary: {
      totalBookings,
      todayBookings,
      totalGuests,
      newGuestsThisMonth,
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyPercentage,
      totalRevenue,
      pendingPayments,
      newEnquiries,
      pendingFollowUps,
      reviewCount,
      averageRating,
      activeCampaigns,
      whatsappAutomationCount,
    },
    bookingOverview: {
      totalBookings,
      todayBookings,
      confirmedBookings: bookingStatusAgg.find((item) => item._id === 'confirmed')?.count ?? 0,
      checkedInBookings: bookingStatusAgg.find((item) => item._id === 'checked_in')?.count ?? 0,
      cancelledBookings: bookingStatusAgg.find((item) => item._id === 'cancelled')?.count ?? 0,
      occupancyPercentage,
    },
    revenueOverview: {
      totalRevenue,
      paymentRevenue: totalPaymentRevenue,
      bookingPaidRevenue: fallbackBookingRevenue,
      pendingPayments,
    },
    occupancy: {
      totalRooms,
      occupiedRooms,
      availableRooms,
      occupancyPercentage,
    },
    guestLeadActivity: {
      totalGuests,
      newGuestsThisMonth,
      newEnquiries,
      pendingFollowUps,
      enquiryStatuses: enquiryStatusAgg.reduce<Record<string, number>>((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
    },
    reputation: {
      reviewCount,
      averageRating,
    },
    growth: {
      activeCampaigns,
      whatsappAutomationCount,
    },
    recentBookings: recentBookings.map((booking) => ({
      id: String(booking._id),
      bookingNumber: booking.bookingNumber,
      guestName: serializeGuestName(booking.guestId),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      totalAmount: booking.totalAmount,
      createdAt: booking.createdAt,
    })),
    recentEnquiries: recentEnquiries.map((enquiry) => ({
      id: String(enquiry._id),
      guestName: enquiry.guestName,
      phone: enquiry.phone,
      source: enquiry.source,
      status: enquiry.status,
      followUpDate: enquiry.followUpDate,
      budget: enquiry.budget,
      createdAt: enquiry.createdAt,
    })),
  };
};
