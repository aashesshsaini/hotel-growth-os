import { FilterQuery, Types } from 'mongoose';
import {
  Booking,
  Campaign,
  Enquiry,
  Guest,
  HotelStaff,
  Lead,
  MaintenanceIssue,
  Payment,
  Review,
  Room,
  RoomType,
  Task,
  WhatsAppMessage,
} from '../../models';
import { getPaymentStatsRepository } from '../payments/payment.repository';
import { getCorporateLeadStatsRepository } from '../corporateLeads/corporateLead.repository';
import { getEventLeadStatsRepository } from '../eventLeads/eventLead.repository';

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

const serializeRecentGuest = (guest: {
  _id: unknown;
  fullName?: string;
  name?: string;
  phone?: string;
  city?: string;
  guestType?: string;
  isVip?: boolean;
  isRepeatGuest?: boolean;
  totalSpend?: number;
  createdAt?: Date;
}) => ({
  id: String(guest._id),
  fullName: guest.fullName || guest.name || 'Guest',
  phone: guest.phone,
  city: guest.city,
  guestType: guest.guestType,
  isVip: guest.isVip,
  isRepeatGuest: guest.isRepeatGuest,
  totalSpend: guest.totalSpend ?? 0,
  createdAt: guest.createdAt,
});

export const getDashboard = async (viewer: Viewer) => {
  const hotelFilter = viewer.hotelId ? { hotelId: new Types.ObjectId(viewer.hotelId) } : {};
  const activeFilter = { ...hotelFilter, isDeleted: { $ne: true } };
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const monthStart = startOfMonth();

  const [
    totalBookings,
    todayBookings,
    upcomingCheckIns,
    upcomingCheckOuts,
    totalGuests,
    newGuestsThisMonth,
    repeatGuests,
    vipGuests,
    totalRooms,
    occupiedRooms,
    availableRooms,
    reservedRooms,
    maintenanceRooms,
    dirtyRooms,
    cleaningRooms,
    inspectionPendingRooms,
    pendingMaintenanceIssues,
    urgentMaintenanceIssues,
    outOfServiceRooms,
    totalStaff,
    staffOnDuty,
    staffOnLeave,
    totalPaymentRevenue,
    fallbackBookingRevenue,
    pendingPaymentAmount,
    pendingBookingAmount,
    newEnquiries,
    pendingEnquiries,
    convertedEnquiries,
    totalEnquiries,
    pendingFollowUps,
    todayFollowUps,
    overdueFollowUps,
    newLeads,
    hotLeads,
    convertedLeads,
    totalLeads,
    reviewCount,
    reviewRatingAgg,
    pendingReviewRequests,
    negativeReviews,
    newReviewsThisMonth,
    positiveReviews,
    activeCampaigns,
    totalCampaigns,
    scheduledCampaigns,
    runningCampaigns,
    campaignPerformanceAgg,
    recentCampaigns,
    whatsappAutomationCount,
    whatsappStatsAgg,
    recentBookings,
    recentEnquiries,
    recentGuests,
    roomTypeAgg,
    bookingStatusAgg,
    enquiryStatusAgg,
  ] = await Promise.all([
    Booking.countDocuments(activeFilter),
    Booking.countDocuments({ ...activeFilter, createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Booking.countDocuments({
      ...activeFilter,
      checkInDate: { $gte: todayStart },
      status: { $in: ['reserved', 'pending', 'confirmed'] },
    }),
    Booking.countDocuments({
      ...activeFilter,
      checkOutDate: { $gte: todayStart },
      status: 'checked_in',
    }),
    Guest.countDocuments(activeFilter),
    Guest.countDocuments({ ...activeFilter, createdAt: { $gte: monthStart } }),
    Guest.countDocuments({ ...activeFilter, isRepeatGuest: true }),
    Guest.countDocuments({ ...activeFilter, isVip: true }),
    Room.countDocuments(activeFilter),
    Room.countDocuments({ ...activeFilter, status: 'occupied' }),
    Room.countDocuments({ ...activeFilter, status: 'available', isBookable: { $ne: false }, isBlocked: { $ne: true } }),
    Room.countDocuments({ ...activeFilter, status: 'reserved' }),
    Room.countDocuments({ ...activeFilter, status: { $in: ['maintenance', 'out_of_order'] } }),
    Room.countDocuments({ ...activeFilter, housekeepingStatus: 'dirty' }),
    Room.countDocuments({ ...activeFilter, housekeepingStatus: 'cleaning_in_progress' }),
    Room.countDocuments({ ...activeFilter, housekeepingStatus: 'needs_attention' }),
    MaintenanceIssue.countDocuments({ ...activeFilter, status: { $in: ['open', 'assigned', 'in_progress', 'on_hold', 'reopened'] } }),
    MaintenanceIssue.countDocuments({ ...activeFilter, priority: 'urgent', status: { $nin: ['resolved', 'closed'] } }),
    Room.countDocuments({ ...activeFilter, status: { $in: ['maintenance', 'out_of_order', 'blocked'] } }),
    HotelStaff.countDocuments(activeFilter),
    HotelStaff.countDocuments({ ...activeFilter, status: 'on_duty' }),
    HotelStaff.countDocuments({ ...activeFilter, status: 'leave' }),
    sumField(Payment, { ...activeFilter, status: { $in: ['paid', 'completed', 'partially_paid'] } }, 'amount'),
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
    Enquiry.countDocuments({ ...activeFilter, status: { $in: ['new', 'assigned', 'contacted', 'waiting_for_response', 'follow_up_required', 'interested'] } }),
    Enquiry.countDocuments({ ...activeFilter, status: { $in: ['converted_to_booking', 'booked'] } }),
    Enquiry.countDocuments(activeFilter),
    Task.countDocuments({ ...activeFilter, status: { $in: ['pending', 'scheduled', 'in_progress', 'missed', 'overdue', 'rescheduled'] } }),
    Task.countDocuments({ ...activeFilter, dueDate: { $gte: todayStart, $lte: todayEnd }, status: { $nin: ['completed', 'cancelled'] } }),
    Task.countDocuments({ ...activeFilter, dueDate: { $lt: new Date() }, status: { $nin: ['completed', 'cancelled'] } }),
    Lead.countDocuments({ ...activeFilter, status: 'new' }),
    Lead.countDocuments({ ...activeFilter, priority: 'hot', status: { $nin: ['converted', 'lost', 'not_interested'] } }),
    Lead.countDocuments({ ...activeFilter, status: 'converted' }),
    Lead.countDocuments(activeFilter),
    Review.countDocuments(activeFilter),
    Review.aggregate([
      { $match: { ...activeFilter, rating: { $exists: true, $ne: null } } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } },
    ]),
    Review.countDocuments({ ...activeFilter, status: { $in: ['pending_request', 'requested'] } }),
    Review.countDocuments({ ...activeFilter, isPositive: false, status: { $in: ['submitted', 'escalated'] } }),
    Review.countDocuments({ ...activeFilter, createdAt: { $gte: monthStart } }),
    Review.countDocuments({ ...activeFilter, isPositive: true, status: 'submitted' }),
    Campaign.countDocuments({ ...activeFilter, status: { $in: ['scheduled', 'running'] } }),
    Campaign.countDocuments(activeFilter),
    Campaign.countDocuments({ ...activeFilter, status: 'scheduled' }),
    Campaign.countDocuments({ ...activeFilter, status: 'running' }),
    Campaign.aggregate([
      { $match: activeFilter },
      {
        $group: {
          _id: null,
          totalSent: { $sum: '$stats.sent' },
          totalDelivered: { $sum: '$stats.delivered' },
          totalResponded: { $sum: '$stats.responded' },
          campaignLeads: { $sum: '$stats.leadsGenerated' },
          campaignBookings: { $sum: '$stats.bookingsGenerated' },
          campaignRevenue: { $sum: '$stats.revenueGenerated' },
        },
      },
    ]),
    Campaign.find(activeFilter)
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name campaignNumber type status channel stats scheduledAt launchedAt createdAt')
      .lean(),
    WhatsAppMessage.countDocuments({ ...activeFilter, direction: 'outgoing' }),
    WhatsAppMessage.aggregate([
      { $match: activeFilter },
      {
        $group: {
          _id: null,
          sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'read']] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'read']] }, 1, 0] } },
          read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          incoming: { $sum: { $cond: [{ $eq: ['$direction', 'incoming'] }, 1, 0] } },
        },
      },
    ]),
    Booking.find(activeFilter)
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('guestId', 'fullName name phone')
      .lean(),
    Enquiry.find(activeFilter).sort({ createdAt: -1 }).limit(6).lean(),
    Guest.find(activeFilter)
      .sort({ createdAt: -1 })
      .limit(6)
      .select('fullName name phone city guestType isVip isRepeatGuest totalSpend createdAt')
      .lean(),
    RoomType.aggregate([
      { $match: activeFilter },
      {
        $lookup: {
          from: 'rooms',
          localField: '_id',
          foreignField: 'roomTypeId',
          as: 'rooms',
        },
      },
      {
        $project: {
          name: 1,
          basePrice: 1,
          status: 1,
          totalRooms: { $size: '$rooms' },
          availableRooms: {
            $size: {
              $filter: {
                input: '$rooms',
                as: 'room',
                cond: {
                  $and: [
                    { $eq: ['$$room.status', 'available'] },
                    { $ne: ['$$room.isDeleted', true] },
                    { $ne: ['$$room.isBookable', false] },
                    { $ne: ['$$room.isBlocked', true] },
                  ],
                },
              },
            },
          },
        },
      },
      { $sort: { availableRooms: -1, totalRooms: -1 } },
      { $limit: 5 },
    ]),
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
  const submittedReviews = reviewCount > 0 ? reviewCount - pendingReviewRequests : 0;
  const positiveRate = submittedReviews > 0 ? positiveReviews / submittedReviews : 0;
  const reputationScore = Math.min(100, Math.round(averageRating * 18 + positiveRate * 12));
  const paymentStats = viewer.hotelId ? await getPaymentStatsRepository(viewer.hotelId) : null;
  const corporateStats = viewer.hotelId ? await getCorporateLeadStatsRepository(viewer.hotelId) : null;
  const eventStats = viewer.hotelId ? await getEventLeadStatsRepository(viewer.hotelId) : null;

  return {
    generatedAt: new Date(),
    summary: {
      totalBookings,
      todayBookings,
      upcomingCheckIns,
      upcomingCheckOuts,
      totalGuests,
      newGuestsThisMonth,
      repeatGuests,
      vipGuests,
      totalRooms,
      occupiedRooms,
      availableRooms,
      reservedRooms,
      maintenanceRooms,
      dirtyRooms,
      cleaningRooms,
      inspectionPendingRooms,
      pendingMaintenanceIssues,
      urgentMaintenanceIssues,
      outOfServiceRooms,
      totalStaff,
      staffOnDuty,
      staffOnLeave,
      occupancyPercentage,
      totalRevenue,
      pendingPayments,
      newEnquiries,
      pendingEnquiries,
      convertedEnquiries,
      totalEnquiries,
      pendingFollowUps,
      todayFollowUps,
      overdueFollowUps,
      newLeads,
      hotLeads,
      convertedLeads,
      totalLeads,
      reviewCount,
      averageRating,
      pendingReviewRequests,
      negativeReviews,
      newReviewsThisMonth,
      reputationScore,
      activeCampaigns,
      totalCampaigns,
      scheduledCampaigns,
      runningCampaigns,
      campaignLeads: campaignPerformanceAgg[0]?.campaignLeads ?? 0,
      campaignBookings: campaignPerformanceAgg[0]?.campaignBookings ?? 0,
      campaignRevenue: campaignPerformanceAgg[0]?.campaignRevenue ?? 0,
      campaignSent: campaignPerformanceAgg[0]?.totalSent ?? 0,
      campaignDelivered: campaignPerformanceAgg[0]?.totalDelivered ?? 0,
      campaignResponded: campaignPerformanceAgg[0]?.totalResponded ?? 0,
      whatsappAutomationCount,
      whatsappSent: whatsappStatsAgg[0]?.sent ?? 0,
      whatsappDelivered: whatsappStatsAgg[0]?.delivered ?? 0,
      whatsappRead: whatsappStatsAgg[0]?.read ?? 0,
      whatsappFailed: whatsappStatsAgg[0]?.failed ?? 0,
      whatsappScheduled: whatsappStatsAgg[0]?.scheduled ?? 0,
      whatsappIncoming: whatsappStatsAgg[0]?.incoming ?? 0,
      whatsappDeliveryRate:
        (whatsappStatsAgg[0]?.sent ?? 0) > 0
          ? Math.round(((whatsappStatsAgg[0]?.delivered ?? 0) / (whatsappStatsAgg[0]?.sent ?? 1)) * 100)
          : 0,
      whatsappReadRate:
        (whatsappStatsAgg[0]?.delivered ?? 0) > 0
          ? Math.round(((whatsappStatsAgg[0]?.read ?? 0) / (whatsappStatsAgg[0]?.delivered ?? 1)) * 100)
          : 0,
    },
    bookingOverview: {
      totalBookings,
      todayBookings,
      upcomingCheckIns,
      upcomingCheckOuts,
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
      todayRevenue: paymentStats?.todayRevenue ?? 0,
      monthlyRevenue: paymentStats?.monthlyRevenue ?? 0,
      collectionRate: paymentStats?.collectionRate ?? 0,
      outstandingAmount: paymentStats?.outstandingAmount ?? pendingPayments,
      refundedAmount: paymentStats?.refundedAmount ?? 0,
    },
    occupancy: {
      totalRooms,
      occupiedRooms,
      availableRooms,
      reservedRooms,
      maintenanceRooms,
      dirtyRooms,
      cleaningRooms,
      inspectionPendingRooms,
      occupancyPercentage,
    },
    housekeepingOverview: {
      dirtyRooms,
      cleaningRooms,
      inspectionPendingRooms,
      readyRooms: availableRooms,
    },
    maintenanceOverview: {
      pendingIssues: pendingMaintenanceIssues,
      urgentIssues: urgentMaintenanceIssues,
      outOfServiceRooms,
      maintenanceRooms,
    },
    staffOverview: {
      totalStaff,
      staffOnDuty,
      staffOnLeave,
    },
    roomTypeInsights: {
      totalRoomTypes: roomTypeAgg.length,
      availableRoomTypes: roomTypeAgg.filter((item) => item.availableRooms > 0).length,
      topAvailableRoomTypes: roomTypeAgg.map((item) => ({
        id: String(item._id),
        name: item.name,
        basePrice: item.basePrice ?? 0,
        status: item.status,
        totalRooms: item.totalRooms ?? 0,
        availableRooms: item.availableRooms ?? 0,
      })),
    },
    guestLeadActivity: {
      totalGuests,
      newGuestsThisMonth,
      repeatGuests,
      vipGuests,
      newEnquiries,
      pendingEnquiries,
      convertedEnquiries,
      totalEnquiries,
      enquiryConversionRate: totalEnquiries > 0 ? Math.round((convertedEnquiries / totalEnquiries) * 100) : 0,
      pendingFollowUps,
      todayFollowUps,
      overdueFollowUps,
      newLeads,
      hotLeads,
      convertedLeads,
      totalLeads,
      leadConversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
      enquiryStatuses: enquiryStatusAgg.reduce<Record<string, number>>((acc, item) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
      recentGuests: recentGuests.map(serializeRecentGuest),
    },
    corporateOverview: corporateStats
      ? {
          totalCompanies: corporateStats.totalCompanies,
          activeClients: corporateStats.activeClients,
          pipelineValue: corporateStats.pipelineValue,
          totalRevenue: corporateStats.totalRevenue,
          monthlyRevenue: corporateStats.monthlyRevenue,
          outstandingAmount: corporateStats.outstandingAmount,
          pendingFollowUps: corporateStats.pendingFollowUps,
          meetingsThisWeek: corporateStats.meetingsThisWeek,
          proposalsSent: corporateStats.proposalsSent,
          statusBreakdown: corporateStats.statusBreakdown,
        }
      : {
          totalCompanies: 0,
          activeClients: 0,
          pipelineValue: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          outstandingAmount: 0,
          pendingFollowUps: 0,
          meetingsThisWeek: 0,
          proposalsSent: 0,
          statusBreakdown: {},
        },
    eventOverview: eventStats
      ? {
          totalEvents: eventStats.totalEvents,
          upcomingEvents: eventStats.upcomingEvents,
          pipelineValue: eventStats.pipelineValue,
          totalRevenue: eventStats.totalRevenue,
          monthlyRevenue: eventStats.monthlyRevenue,
          outstandingAmount: eventStats.outstandingAmount,
          pendingFollowUps: eventStats.pendingFollowUps,
          siteVisitsThisWeek: eventStats.siteVisitsThisWeek,
          proposalsSent: eventStats.proposalsSent,
          convertedEvents: eventStats.convertedEvents,
          statusBreakdown: eventStats.statusBreakdown,
        }
      : {
          totalEvents: 0,
          upcomingEvents: 0,
          pipelineValue: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          outstandingAmount: 0,
          pendingFollowUps: 0,
          siteVisitsThisWeek: 0,
          proposalsSent: 0,
          convertedEvents: 0,
          statusBreakdown: {},
        },
    reputation: {
      reviewCount,
      averageRating,
      pendingReviewRequests,
      negativeReviews,
      newReviewsThisMonth,
      reputationScore,
      positiveReviews,
    },
    growth: {
      activeCampaigns,
      totalCampaigns,
      scheduledCampaigns,
      runningCampaigns,
      campaignLeads: campaignPerformanceAgg[0]?.campaignLeads ?? 0,
      campaignBookings: campaignPerformanceAgg[0]?.campaignBookings ?? 0,
      campaignRevenue: campaignPerformanceAgg[0]?.campaignRevenue ?? 0,
      campaignSent: campaignPerformanceAgg[0]?.totalSent ?? 0,
      campaignDelivered: campaignPerformanceAgg[0]?.totalDelivered ?? 0,
      campaignResponded: campaignPerformanceAgg[0]?.totalResponded ?? 0,
      whatsappAutomationCount,
      whatsappSent: whatsappStatsAgg[0]?.sent ?? 0,
      whatsappDelivered: whatsappStatsAgg[0]?.delivered ?? 0,
      whatsappRead: whatsappStatsAgg[0]?.read ?? 0,
      whatsappFailed: whatsappStatsAgg[0]?.failed ?? 0,
      whatsappScheduled: whatsappStatsAgg[0]?.scheduled ?? 0,
      whatsappIncoming: whatsappStatsAgg[0]?.incoming ?? 0,
      whatsappDeliveryRate:
        (whatsappStatsAgg[0]?.sent ?? 0) > 0
          ? Math.round(((whatsappStatsAgg[0]?.delivered ?? 0) / (whatsappStatsAgg[0]?.sent ?? 1)) * 100)
          : 0,
      whatsappReadRate:
        (whatsappStatsAgg[0]?.delivered ?? 0) > 0
          ? Math.round(((whatsappStatsAgg[0]?.read ?? 0) / (whatsappStatsAgg[0]?.delivered ?? 1)) * 100)
          : 0,
      recentCampaigns: recentCampaigns.map((campaign) => ({
        id: String(campaign._id),
        name: campaign.name,
        campaignNumber: campaign.campaignNumber,
        type: campaign.type,
        status: campaign.status,
        channel: campaign.channel,
        scheduledAt: campaign.scheduledAt,
        launchedAt: campaign.launchedAt,
        stats: campaign.stats,
        createdAt: campaign.createdAt,
      })),
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
