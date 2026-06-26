import { PipelineStage, Types } from 'mongoose';
import {
  Booking,
  Guest,
  HotelStaff,
  Lead,
  Payment,
  Review,
  Room,
  RoomType,
  Task,
  WhatsAppMessage,
} from '../../models';
import { getCampaignStatsRepository } from '../campaigns/campaign.repository';
import { getGuestStatsRepository } from '../guests/guest.repository';
import { getHousekeepingStatsRepository } from '../housekeeping/housekeeping.repository';
import { getLeadStatsRepository } from '../leads/lead.repository';
import { getMaintenanceStatsRepository } from '../maintenance/maintenance.repository';
import { getPaymentStatsRepository } from '../payments/payment.repository';
import { getReviewStatsRepository } from '../reviews/review.repository';
import { getWhatsAppStatsRepository } from '../whatsapp/whatsapp.repository';
import { AnalyticsOverview, TrendPoint } from './analytics.types';

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface ResolvedDateRange {
  from: Date;
  to: Date;
  period: AnalyticsPeriod;
  dateFormat: string;
}

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

export const resolveDateRange = (
  period: AnalyticsPeriod = 'monthly',
  fromDate?: Date,
  toDate?: Date
): ResolvedDateRange => {
  const now = new Date();
  let from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  let to = endOfDay(now);
  let dateFormat = '%Y-%m-%d';

  if (period === 'daily') {
    from = startOfDay(now);
    to = endOfDay(now);
    dateFormat = '%H:00';
  } else if (period === 'weekly') {
    from = startOfDay(new Date(now));
    from.setDate(from.getDate() - 6);
    dateFormat = '%Y-%m-%d';
  } else if (period === 'monthly') {
    from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    dateFormat = '%Y-%m-%d';
  } else if (period === 'quarterly') {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    from = startOfDay(new Date(now.getFullYear(), quarterStart, 1));
    dateFormat = '%Y-%m';
  } else if (period === 'yearly') {
    from = startOfDay(new Date(now.getFullYear(), 0, 1));
    dateFormat = '%Y-%m';
  } else if (period === 'custom' && fromDate && toDate) {
    from = startOfDay(fromDate);
    to = endOfDay(toDate);
    const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    dateFormat = diffDays <= 31 ? '%Y-%m-%d' : '%Y-%m';
  }

  return { from, to, period, dateFormat };
};

const trendFromAgg = (
  rows: Array<{ _id: string; value?: number; count?: number; secondary?: number }>
): TrendPoint[] =>
  rows.map((row) => ({
    label: String(row._id),
    value: row.value ?? row.count ?? 0,
    secondary: row.secondary,
  }));

const paidStatuses = ['paid', 'completed', 'partially_paid'];

export const getAnalyticsOverviewRepository = async (
  hotelId: string,
  range: ResolvedDateRange
): Promise<AnalyticsOverview> => {
  const hotelObjectId = new Types.ObjectId(hotelId);
  const baseFilter = { hotelId: hotelObjectId, isDeleted: { $ne: true } };
  const dateFilter = { createdAt: { $gte: range.from, $lte: range.to } };
  const bookingDateFilter = { checkInDate: { $gte: range.from, $lte: range.to } };
  const paymentDateFilter = { paidAt: { $gte: range.from, $lte: range.to } };

  const daysInRange = Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)));

  const [
    guestStats,
    rawLeadStats,
    paymentStats,
    reviewStats,
    campaignStats,
    whatsappStats,
    housekeepingStats,
    maintenanceStats,
    totalRooms,
    occupiedRooms,
    totalBookingsInRange,
    cancelledBookings,
    noShowBookings,
    bookingRevenueAgg,
    avgStayAgg,
    avgBookingValueAgg,
    revenueTrendAgg,
    revenueByMethodAgg,
    revenueBySourceAgg,
    bookingTrendAgg,
    bookingStatusAgg,
    bookingSourceAgg,
    bookingTypeAgg,
    guestTrendAgg,
    guestSourceAgg,
    leadSourceAgg,
    paymentTrendAgg,
    reviewTrendAgg,
    whatsappTrendAgg,
    roomTypeOccupancyAgg,
    totalStaff,
    staffOnDuty,
    staffOnLeave,
    pendingFollowUps,
    overdueFollowUps,
    completedFollowUps,
    totalFollowUps,
  ] = await Promise.all([
    getGuestStatsRepository(hotelId),
    getLeadStatsRepository(hotelId),
    getPaymentStatsRepository(hotelId),
    getReviewStatsRepository(hotelId),
    getCampaignStatsRepository(hotelId),
    getWhatsAppStatsRepository(hotelId),
    getHousekeepingStatsRepository(hotelId),
    getMaintenanceStatsRepository(hotelId),
    Room.countDocuments(baseFilter),
    Room.countDocuments({ ...baseFilter, status: 'occupied' }),
    Booking.countDocuments({ ...baseFilter, ...dateFilter }),
    Booking.countDocuments({ ...baseFilter, ...dateFilter, status: 'cancelled' }),
    Booking.countDocuments({ ...baseFilter, ...dateFilter, status: 'no_show' }),
    Payment.aggregate([
      { $match: { ...baseFilter, status: { $in: paidStatuses }, paymentType: { $ne: 'refund' }, ...paymentDateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Booking.aggregate([
      { $match: { ...baseFilter, ...bookingDateFilter } },
      { $group: { _id: null, avgNights: { $avg: '$nights' } } },
    ]),
    Booking.aggregate([
      { $match: { ...baseFilter, ...bookingDateFilter } },
      { $group: { _id: null, avgValue: { $avg: '$totalAmount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...baseFilter, status: { $in: paidStatuses }, paymentType: { $ne: 'refund' }, paidAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: { $dateToString: { format: range.dateFormat, date: '$paidAt' } }, value: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ] as PipelineStage[]),
    Payment.aggregate([
      { $match: { ...baseFilter, status: { $in: paidStatuses }, paymentType: { $ne: 'refund' }, ...paymentDateFilter } },
      { $group: { _id: '$method', value: { $sum: '$amount' } } },
    ]),
    Booking.aggregate([
      { $match: { ...baseFilter, ...bookingDateFilter } },
      { $group: { _id: '$source', value: { $sum: '$paidAmount' } } },
    ]),
    Booking.aggregate([
      { $match: { ...baseFilter, ...dateFilter } },
      { $group: { _id: { $dateToString: { format: range.dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ] as PipelineStage[]),
    Booking.aggregate([{ $match: { ...baseFilter, ...dateFilter } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { ...baseFilter, ...dateFilter } }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { ...baseFilter, ...dateFilter } }, { $group: { _id: '$bookingType', count: { $sum: 1 } } }]),
    Guest.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: { $dateToString: { format: range.dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ] as PipelineStage[]),
    Guest.aggregate([
      { $match: { ...baseFilter, source: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Lead.aggregate([
      { $match: { ...baseFilter, ...dateFilter } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { ...baseFilter, status: { $in: paidStatuses }, paidAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: { $dateToString: { format: range.dateFormat, date: '$paidAt' } }, value: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ] as PipelineStage[]),
    Review.aggregate([
      { $match: { ...baseFilter, submittedAt: { $gte: range.from, $lte: range.to }, rating: { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: range.dateFormat, date: '$submittedAt' } },
          value: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ] as PipelineStage[]),
    WhatsAppMessage.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: { $dateToString: { format: range.dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ] as PipelineStage[]),
    RoomType.aggregate([
      { $match: baseFilter },
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
          total: { $size: '$rooms' },
          occupied: {
            $size: {
              $filter: {
                input: '$rooms',
                as: 'room',
                cond: { $eq: ['$$room.status', 'occupied'] },
              },
            },
          },
        },
      },
    ]),
    HotelStaff.countDocuments(baseFilter),
    HotelStaff.countDocuments({ ...baseFilter, status: 'on_duty' }),
    HotelStaff.countDocuments({ ...baseFilter, status: 'leave' }),
    Task.countDocuments({ ...baseFilter, status: { $nin: ['completed', 'cancelled'] } }),
    Task.countDocuments({ ...baseFilter, dueDate: { $lt: new Date() }, status: { $nin: ['completed', 'cancelled'] } }),
    Task.countDocuments({ ...baseFilter, status: 'completed', updatedAt: { $gte: range.from, $lte: range.to } }),
    Task.countDocuments({ ...baseFilter, ...dateFilter }),
  ]);

  const leadsByStatus = (rawLeadStats.statusAgg as Array<{ _id: string; count: number }>).reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});
  const leadsBySource = (rawLeadStats.sourceAgg as Array<{ _id: string; count: number }>).reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});
  const totalLeads = Object.values(leadsByStatus).reduce((sum, count) => sum + count, 0);
  const convertedLeads = leadsByStatus.converted ?? 0;
  const leadConversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const periodRevenue = bookingRevenueAgg[0]?.total ?? 0;
  const availableRoomNights = Math.max(totalRooms * daysInRange, 1);
  const soldRoomNights = Math.max(occupiedRooms * daysInRange, 1);
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const revpar = Number((periodRevenue / availableRoomNights).toFixed(2));
  const adr = Number((periodRevenue / soldRoomNights).toFixed(2));
  const cancellationRate = totalBookingsInRange > 0 ? Math.round((cancelledBookings / totalBookingsInRange) * 100) : 0;
  const noShowRate = totalBookingsInRange > 0 ? Math.round((noShowBookings / totalBookingsInRange) * 100) : 0;
  const repeatGuestRate = guestStats.totalGuests > 0 ? Math.round((guestStats.repeatGuests / guestStats.totalGuests) * 100) : 0;
  const campaignEngagementRate =
    campaignStats.totalSent > 0 ? Math.round((campaignStats.totalResponded / campaignStats.totalSent) * 100) : 0;
  const followUpCompletionRate = totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;

  const toRecord = (rows: Array<{ _id: string; count?: number; value?: number }>) =>
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row._id || 'unknown'] = row.count ?? row.value ?? 0;
      return acc;
    }, {});

  const avgLifetimeValue =
    guestStats.totalGuests > 0 && guestStats.topSpendingGuests.length > 0
      ? Math.round(guestStats.topSpendingGuests.reduce((sum, g) => sum + g.totalSpend, 0) / guestStats.topSpendingGuests.length)
      : 0;

  const hkStatusMap = (housekeepingStats.statusAgg as Array<{ _id: string; count: number }>).reduce<Record<string, number>>((acc, row) => {
    acc[row._id || 'unknown'] = row.count;
    return acc;
  }, {});
  const hkTotalTasks = Object.values(hkStatusMap).reduce((sum, count) => sum + count, 0);
  const hkCompleted = hkStatusMap.completed ?? 0;

  const maintenanceStatusMap = (maintenanceStats.statusAgg as Array<{ _id: string; count: number }>).reduce<Record<string, number>>((acc, row) => {
    acc[row._id || 'unknown'] = row.count;
    return acc;
  }, {});
  const maintenanceOpen =
    (maintenanceStatusMap.open ?? 0) +
    (maintenanceStatusMap.assigned ?? 0) +
    (maintenanceStatusMap.in_progress ?? 0) +
    (maintenanceStatusMap.on_hold ?? 0) +
    (maintenanceStatusMap.reopened ?? 0);
  const maintenanceUrgent = (maintenanceStats.priorityAgg as Array<{ _id: string; count: number }>).find((row) => row._id === 'urgent')?.count ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    dateRange: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      period: range.period,
    },
    executiveSummary: {
      totalRevenue: periodRevenue,
      revpar,
      adr,
      occupancyRate,
      totalBookings: totalBookingsInRange,
      averageBookingValue: Number((avgBookingValueAgg[0]?.avgValue ?? 0).toFixed(0)),
      averageStayNights: Number((avgStayAgg[0]?.avgNights ?? 0).toFixed(1)),
      cancellationRate,
      noShowRate,
      collectionRate: paymentStats.collectionRate,
      outstandingAmount: paymentStats.outstandingAmount,
      averageRating: reviewStats.averageRating,
      reputationScore: reviewStats.reputationScore,
      leadConversionRate,
      repeatGuestRate,
      campaignEngagementRate,
      whatsappDeliveryRate: whatsappStats.deliveryRate,
      followUpCompletionRate,
    },
    revenue: {
      trend: trendFromAgg(revenueTrendAgg),
      byMethod: toRecord(revenueByMethodAgg),
      byBookingSource: toRecord(revenueBySourceAgg),
    },
    bookings: {
      trend: trendFromAgg(bookingTrendAgg),
      byStatus: toRecord(bookingStatusAgg),
      bySource: toRecord(bookingSourceAgg),
      byType: toRecord(bookingTypeAgg),
    },
    occupancy: {
      trend: [{ label: 'Current', value: occupancyRate }],
      currentRate: occupancyRate,
      totalRooms,
      occupiedRooms,
      byRoomType: roomTypeOccupancyAgg.map((item) => ({
        name: item.name || 'Room Type',
        total: item.total ?? 0,
        occupied: item.occupied ?? 0,
        rate: item.total > 0 ? Math.round(((item.occupied ?? 0) / item.total) * 100) : 0,
      })),
    },
    guests: {
      trend: trendFromAgg(guestTrendAgg),
      totalGuests: guestStats.totalGuests,
      newGuests: guestStats.newGuestsThisMonth,
      repeatGuestRate,
      averageLifetimeValue: avgLifetimeValue,
      bySource: toRecord(guestSourceAgg),
    },
    leads: {
      funnel: leadsByStatus,
      conversionRate: leadConversionRate,
      bySource: leadsBySource,
      hotLeads: rawLeadStats.hotLeads,
    },
    campaigns: {
      totalCampaigns: campaignStats.totalCampaigns,
      activeCampaigns: campaignStats.activeCampaigns,
      totalSent: campaignStats.totalSent,
      engagementRate: campaignEngagementRate,
      revenueGenerated: campaignStats.totalRevenueGenerated,
      bookingsGenerated: campaignStats.totalBookingsGenerated,
      byChannel: campaignStats.byChannel,
      byType: campaignStats.byType,
    },
    payments: {
      totalCollected: paymentStats.totalCollected,
      pendingAmount: paymentStats.pendingAmount,
      refundedAmount: paymentStats.refundedAmount,
      collectionRate: paymentStats.collectionRate,
      trend: trendFromAgg(paymentTrendAgg),
      byMethod: paymentStats.methodBreakdown,
    },
    reviews: {
      averageRating: reviewStats.averageRating,
      reputationScore: reviewStats.reputationScore,
      totalReviews: reviewStats.totalReviews,
      negativeReviews: reviewStats.negativeReviews,
      trend: reviewTrendAgg.map((row) => ({
        label: String(row._id),
        value: Number((row.value ?? 0).toFixed(1)),
        secondary: row.count,
      })),
      ratingDistribution: reviewStats.ratingDistribution,
      bySource: reviewStats.sourceBreakdown,
    },
    whatsapp: {
      totalMessages: whatsappStats.totalMessages,
      deliveryRate: whatsappStats.deliveryRate,
      readRate: whatsappStats.readRate,
      replyRate: whatsappStats.replyRate,
      incomingMessages: whatsappStats.incomingMessages,
      outgoingMessages: whatsappStats.outgoingMessages,
      trend: trendFromAgg(whatsappTrendAgg),
    },
    operations: {
      housekeeping: {
        totalTasks: hkTotalTasks,
        completedTasks: hkCompleted,
        completionRate: hkTotalTasks > 0 ? Math.round((hkCompleted / hkTotalTasks) * 100) : 0,
        dirtyRooms: housekeepingStats.dirtyRooms,
      },
      maintenance: {
        openIssues: maintenanceOpen,
        urgentIssues: maintenanceUrgent,
        downtimeRooms: maintenanceStats.maintenanceRooms,
        avgResolutionHours: 0,
      },
    },
    staff: {
      totalStaff,
      onDuty: staffOnDuty,
      onLeave: staffOnLeave,
      followUpsDue: pendingFollowUps,
      overdueFollowUps,
    },
  };
};

export const buildAnalyticsExportRepository = (
  overview: AnalyticsOverview,
  type: string
): { filename: string; contentType: string; data: string } => {
  const rows: string[][] = [['Metric', 'Value']];

  if (type === 'revenue') {
    rows.push(['Total Revenue', String(overview.executiveSummary.totalRevenue)]);
    rows.push(['RevPAR', String(overview.executiveSummary.revpar)]);
    rows.push(['ADR', String(overview.executiveSummary.adr)]);
    overview.revenue.trend.forEach((point) => rows.push([point.label, String(point.value)]));
  } else if (type === 'bookings') {
    rows.push(['Total Bookings', String(overview.executiveSummary.totalBookings)]);
    rows.push(['Cancellation Rate', `${overview.executiveSummary.cancellationRate}%`]);
    rows.push(['No-show Rate', `${overview.executiveSummary.noShowRate}%`]);
    overview.bookings.trend.forEach((point) => rows.push([point.label, String(point.value)]));
  } else if (type === 'leads') {
    rows.push(['Conversion Rate', `${overview.leads.conversionRate}%`]);
    Object.entries(overview.leads.funnel).forEach(([key, value]) => rows.push([key, String(value)]));
  } else {
    Object.entries(overview.executiveSummary).forEach(([key, value]) => rows.push([key, String(value)]));
  }

  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  return {
    filename: `analytics-${type}-${new Date().toISOString().slice(0, 10)}.csv`,
    contentType: 'text/csv',
    data: csv,
  };
};
