import { Types } from 'mongoose';
import {
  Booking,
  Campaign,
  Guest,
  HotelStaff,
  HousekeepingTask,
  Lead,
  MaintenanceIssue,
  Payment,
  Review,
  Room,
  WhatsAppMessage,
} from '../../models';
import { getAnalyticsOverviewRepository, resolveDateRange } from '../analytics/analytics.repository';
import {
  CategoryReport,
  ReportCategory,
  ReportCategoryMeta,
  ReportCategorySummary,
  ReportExportFormat,
  ReportExportResult,
  ReportPeriod,
  ReportsSummary,
  ResolvedReportDateRange,
} from './report.types';

const PREVIEW_LIMIT = 50;
const paidStatuses = ['paid', 'completed', 'partially_paid'];

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

export const resolveReportDateRange = (
  period: ReportPeriod = 'this_month',
  fromDate?: Date,
  toDate?: Date
): ResolvedReportDateRange => {
  const now = new Date();

  if (period === 'today') {
    return { from: startOfDay(now), to: endOfDay(now), period };
  }
  if (period === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { from: startOfDay(yesterday), to: endOfDay(yesterday), period };
  }
  if (period === 'this_week') {
    const from = startOfDay(now);
    const day = from.getDay();
    const diff = day === 0 ? 6 : day - 1;
    from.setDate(from.getDate() - diff);
    return { from, to: endOfDay(now), period };
  }
  if (period === 'this_month') {
    return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: endOfDay(now),
      period,
    };
  }
  if (period === 'last_month') {
    return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      period,
    };
  }
  if (period === 'this_quarter') {
    const quarterStart = Math.floor(now.getMonth() / 3) * 3;
    return {
      from: startOfDay(new Date(now.getFullYear(), quarterStart, 1)),
      to: endOfDay(now),
      period,
    };
  }
  if (period === 'this_year') {
    return {
      from: startOfDay(new Date(now.getFullYear(), 0, 1)),
      to: endOfDay(now),
      period,
    };
  }
  if (period === 'custom' && fromDate && toDate) {
    return { from: startOfDay(fromDate), to: endOfDay(toDate), period };
  }

  return {
    from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: endOfDay(now),
    period: 'this_month',
  };
};

const toIsoDate = (date: Date) => date.toISOString();

const formatReportDateRange = (range: ResolvedReportDateRange) => ({
  from: toIsoDate(range.from),
  to: toIsoDate(range.to),
  period: range.period,
});

export const REPORT_CATEGORY_META: ReportCategoryMeta[] = [
  { id: 'bookings', title: 'Booking Reports', description: 'Reservations, check-ins, cancellations, and no-shows.', group: 'sales' },
  { id: 'guests', title: 'Guest Reports', description: 'Guest profiles, repeat guests, VIP guests, and lifetime value.', group: 'sales' },
  { id: 'revenue', title: 'Revenue Reports', description: 'Collected revenue, ADR, RevPAR, and booking source revenue.', group: 'finance' },
  { id: 'payments', title: 'Payment Reports', description: 'Collections, pending balances, refunds, and payment methods.', group: 'finance' },
  { id: 'occupancy', title: 'Occupancy Reports', description: 'Room occupancy rates and availability trends.', group: 'operations' },
  { id: 'rooms', title: 'Room Reports', description: 'Room status, housekeeping readiness, and maintenance blocks.', group: 'operations' },
  { id: 'leads', title: 'Lead Reports', description: 'Lead funnel, conversion, and source performance.', group: 'sales' },
  { id: 'campaigns', title: 'Campaign Reports', description: 'Campaign reach, engagement, and booking attribution.', group: 'marketing' },
  { id: 'whatsapp', title: 'WhatsApp Reports', description: 'Message delivery, read rates, and automation performance.', group: 'marketing' },
  { id: 'reviews', title: 'Review Reports', description: 'Ratings, reputation score, and review source breakdown.', group: 'marketing' },
  { id: 'staff', title: 'Staff Reports', description: 'Staff headcount, duty status, and follow-up workload.', group: 'people' },
  { id: 'housekeeping', title: 'Housekeeping Reports', description: 'Cleaning tasks, completion rates, and dirty rooms.', group: 'operations' },
  { id: 'maintenance', title: 'Maintenance Reports', description: 'Open issues, urgent repairs, and downtime rooms.', group: 'operations' },
];

const mapPeriodToAnalytics = (period: ReportPeriod): 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom' => {
  if (period === 'today' || period === 'yesterday') return 'daily';
  if (period === 'this_week') return 'weekly';
  if (period === 'this_month' || period === 'last_month') return 'monthly';
  if (period === 'this_quarter') return 'quarterly';
  if (period === 'this_year') return 'yearly';
  return 'custom';
};

const guestName = (guest: { fullName?: string; name?: string; firstName?: string; lastName?: string } | null | undefined) =>
  guest?.fullName || guest?.name || [guest?.firstName, guest?.lastName].filter(Boolean).join(' ') || 'Guest';

export const getReportsSummaryRepository = async (
  hotelId: string,
  range: ResolvedReportDateRange
): Promise<ReportsSummary> => {
  const analyticsPeriod = mapPeriodToAnalytics(range.period);
  const analyticsRange = resolveDateRange(
    analyticsPeriod,
    range.period === 'custom' ? range.from : undefined,
    range.period === 'custom' ? range.to : undefined
  );
  if (range.period === 'last_month') {
    analyticsRange.from = range.from;
    analyticsRange.to = range.to;
  } else if (range.period === 'yesterday') {
    analyticsRange.from = range.from;
    analyticsRange.to = range.to;
  } else if (range.period === 'today') {
    analyticsRange.from = range.from;
    analyticsRange.to = range.to;
  }

  const overview = await getAnalyticsOverviewRepository(hotelId, analyticsRange);
  const summary = overview.executiveSummary;

  const categories: ReportCategorySummary[] = [
    { id: 'bookings', title: 'Bookings', description: 'Reservation activity', metric: summary.totalBookings, metricLabel: 'Total bookings', recordCount: summary.totalBookings },
    { id: 'guests', title: 'Guests', description: 'Guest CRM activity', metric: overview.guests.totalGuests, metricLabel: 'Total guests', recordCount: overview.guests.newGuests },
    { id: 'revenue', title: 'Revenue', description: 'Collected revenue', metric: summary.totalRevenue, metricLabel: 'Total revenue', recordCount: overview.payments.trend.length },
    { id: 'payments', title: 'Payments', description: 'Payment collections', metric: overview.payments.totalCollected, metricLabel: 'Collected', recordCount: overview.payments.trend.length },
    { id: 'occupancy', title: 'Occupancy', description: 'Room utilization', metric: `${summary.occupancyRate}%`, metricLabel: 'Occupancy rate', recordCount: overview.occupancy.totalRooms },
    { id: 'rooms', title: 'Rooms', description: 'Room inventory status', metric: overview.occupancy.totalRooms, metricLabel: 'Total rooms', recordCount: overview.occupancy.occupiedRooms },
    { id: 'leads', title: 'Leads', description: 'Lead pipeline', metric: `${summary.leadConversionRate}%`, metricLabel: 'Conversion rate', recordCount: overview.leads.hotLeads },
    { id: 'campaigns', title: 'Campaigns', description: 'Marketing campaigns', metric: overview.campaigns.totalSent, metricLabel: 'Messages sent', recordCount: overview.campaigns.totalCampaigns },
    { id: 'whatsapp', title: 'WhatsApp', description: 'Messaging automation', metric: `${summary.whatsappDeliveryRate}%`, metricLabel: 'Delivery rate', recordCount: overview.whatsapp.totalMessages },
    { id: 'reviews', title: 'Reviews', description: 'Reputation management', metric: summary.averageRating, metricLabel: 'Average rating', recordCount: overview.reviews.totalReviews },
    { id: 'staff', title: 'Staff', description: 'Workforce overview', metric: overview.staff.totalStaff, metricLabel: 'Total staff', recordCount: overview.staff.onDuty },
    { id: 'housekeeping', title: 'Housekeeping', description: 'Cleaning operations', metric: `${overview.operations.housekeeping.completionRate}%`, metricLabel: 'Completion rate', recordCount: overview.operations.housekeeping.totalTasks },
    { id: 'maintenance', title: 'Maintenance', description: 'Repair operations', metric: overview.operations.maintenance.openIssues, metricLabel: 'Open issues', recordCount: overview.operations.maintenance.urgentIssues },
  ];

  return {
    generatedAt: new Date().toISOString(),
    dateRange: formatReportDateRange(range),
    categories,
  };
};

const baseFilter = (hotelId: string) => ({
  hotelId: new Types.ObjectId(hotelId),
  isDeleted: { $ne: true },
});

export const getCategoryReportRepository = async (
  hotelId: string,
  category: ReportCategory,
  range: ResolvedReportDateRange
): Promise<CategoryReport> => {
  const meta = REPORT_CATEGORY_META.find((item) => item.id === category)!;
  const filter = baseFilter(hotelId);
  const createdAtFilter = { createdAt: { $gte: range.from, $lte: range.to } };
  const paidAtFilter = { paidAt: { $gte: range.from, $lte: range.to } };

  if (category === 'bookings') {
    const [rows, totalRows, cancelled, noShow] = await Promise.all([
      Booking.find({ ...filter, ...createdAtFilter })
        .populate('guestId', 'fullName name firstName lastName phone')
        .sort({ createdAt: -1 })
        .limit(PREVIEW_LIMIT)
        .lean(),
      Booking.countDocuments({ ...filter, ...createdAtFilter }),
      Booking.countDocuments({ ...filter, ...createdAtFilter, status: 'cancelled' }),
      Booking.countDocuments({ ...filter, ...createdAtFilter, status: 'no_show' }),
    ]);

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: {
        totalBookings: totalRows,
        cancelled,
        noShow,
        cancellationRate: totalRows > 0 ? Math.round((cancelled / totalRows) * 100) : 0,
      },
      columns: [
        { key: 'bookingNumber', label: 'Booking #' },
        { key: 'guestName', label: 'Guest' },
        { key: 'checkInDate', label: 'Check-in' },
        { key: 'checkOutDate', label: 'Check-out' },
        { key: 'status', label: 'Status' },
        { key: 'totalAmount', label: 'Amount', align: 'right' },
      ],
      rows: rows.map((row) => ({
        bookingNumber: row.bookingNumber || row._id,
        guestName: guestName(row.guestId as Parameters<typeof guestName>[0]),
        checkInDate: row.checkInDate ? new Date(row.checkInDate).toLocaleDateString() : '-',
        checkOutDate: row.checkOutDate ? new Date(row.checkOutDate).toLocaleDateString() : '-',
        status: row.status,
        totalAmount: row.totalAmount ?? 0,
      })),
      totalRows,
    };
  }

  if (category === 'guests') {
    const [rows, totalRows, vipCount, repeatCount] = await Promise.all([
      Guest.find({ ...filter, ...createdAtFilter }).sort({ createdAt: -1 }).limit(PREVIEW_LIMIT).lean(),
      Guest.countDocuments({ ...filter, ...createdAtFilter }),
      Guest.countDocuments({ ...filter, ...createdAtFilter, isVip: true }),
      Guest.countDocuments({ ...filter, ...createdAtFilter, isRepeatGuest: true }),
    ]);

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: { totalGuests: totalRows, vipGuests: vipCount, repeatGuests: repeatCount },
      columns: [
        { key: 'name', label: 'Guest' },
        { key: 'phone', label: 'Phone' },
        { key: 'guestType', label: 'Type' },
        { key: 'source', label: 'Source' },
        { key: 'totalSpend', label: 'Lifetime Spend', align: 'right' },
        { key: 'isVip', label: 'VIP' },
      ],
      rows: rows.map((row) => ({
        name: guestName(row),
        phone: row.phone,
        guestType: row.guestType || '-',
        source: row.source || '-',
        totalSpend: row.totalSpend ?? 0,
        isVip: row.isVip ? 'Yes' : 'No',
      })),
      totalRows,
    };
  }

  if (category === 'revenue' || category === 'payments') {
    const paymentFilter = {
      ...filter,
      status: { $in: paidStatuses },
      paymentType: { $ne: 'refund' },
      ...paidAtFilter,
    };
    const [rows, totalRows, totalCollected, pendingAgg, refundedAgg] = await Promise.all([
      Payment.find(paymentFilter).sort({ paidAt: -1 }).limit(PREVIEW_LIMIT).lean(),
      Payment.countDocuments(paymentFilter),
      Payment.aggregate([{ $match: paymentFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([
        { $match: { ...filter, status: { $in: ['pending', 'partially_paid'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { ...filter, status: 'refunded', ...paidAtFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: {
        totalCollected: totalCollected[0]?.total ?? 0,
        pendingAmount: pendingAgg[0]?.total ?? 0,
        refundedAmount: refundedAgg[0]?.total ?? 0,
        transactionCount: totalRows,
      },
      columns: [
        { key: 'reference', label: 'Reference' },
        { key: 'amount', label: 'Amount', align: 'right' },
        { key: 'method', label: 'Method' },
        { key: 'status', label: 'Status' },
        { key: 'paidAt', label: 'Paid At' },
      ],
      rows: rows.map((row) => ({
        reference: row.paymentNumber || row._id,
        amount: row.amount ?? 0,
        method: row.method || '-',
        status: row.status,
        paidAt: row.paidAt ? new Date(row.paidAt).toLocaleString() : '-',
      })),
      totalRows,
    };
  }

  if (category === 'occupancy') {
    const [totalRooms, occupiedRooms, roomTypeRows] = await Promise.all([
      Room.countDocuments(filter),
      Room.countDocuments({ ...filter, status: 'occupied' }),
      Room.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'roomtypes',
            localField: 'roomTypeId',
            foreignField: '_id',
            as: 'roomType',
          },
        },
        { $unwind: { path: '$roomType', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$roomType.name',
            total: { $sum: 1 },
            occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: { totalRooms, occupiedRooms, availableRooms: totalRooms - occupiedRooms, occupancyRate },
      columns: [
        { key: 'roomType', label: 'Room Type' },
        { key: 'total', label: 'Total', align: 'right' },
        { key: 'occupied', label: 'Occupied', align: 'right' },
        { key: 'rate', label: 'Occupancy %', align: 'right' },
      ],
      rows: roomTypeRows.map((row) => ({
        roomType: row._id || 'Unassigned',
        total: row.total,
        occupied: row.occupied,
        rate: row.total > 0 ? Math.round((row.occupied / row.total) * 100) : 0,
      })),
      totalRows: roomTypeRows.length,
    };
  }

  if (category === 'rooms') {
    const [rows, totalRows, dirtyRooms, maintenanceRooms] = await Promise.all([
      Room.find(filter)
        .populate('roomTypeId', 'name')
        .sort({ roomNumber: 1 })
        .limit(PREVIEW_LIMIT)
        .lean(),
      Room.countDocuments(filter),
      Room.countDocuments({ ...filter, housekeepingStatus: 'dirty' }),
      Room.countDocuments({ ...filter, status: 'maintenance' }),
    ]);

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: { totalRooms: totalRows, dirtyRooms, maintenanceRooms },
      columns: [
        { key: 'roomNumber', label: 'Room' },
        { key: 'roomType', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'housekeepingStatus', label: 'Housekeeping' },
        { key: 'floor', label: 'Floor', align: 'right' },
      ],
      rows: rows.map((row) => ({
        roomNumber: row.roomNumber,
        roomType: (row.roomTypeId as { name?: string } | null)?.name || '-',
        status: row.status,
        housekeepingStatus: row.housekeepingStatus || '-',
        floor: row.floor ?? '-',
      })),
      totalRows,
    };
  }

  if (category === 'leads') {
    const [rows, totalRows, converted, hotLeads] = await Promise.all([
      Lead.find({ ...filter, ...createdAtFilter }).sort({ createdAt: -1 }).limit(PREVIEW_LIMIT).lean(),
      Lead.countDocuments({ ...filter, ...createdAtFilter }),
      Lead.countDocuments({ ...filter, ...createdAtFilter, status: 'converted' }),
      Lead.countDocuments({ ...filter, ...createdAtFilter, priority: 'hot' }),
    ]);

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: {
        totalLeads: totalRows,
        converted,
        conversionRate: totalRows > 0 ? Math.round((converted / totalRows) * 100) : 0,
        hotLeads,
      },
      columns: [
        { key: 'name', label: 'Lead' },
        { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status' },
        { key: 'source', label: 'Source' },
        { key: 'priority', label: 'Priority' },
        { key: 'createdAt', label: 'Created' },
      ],
      rows: rows.map((row) => ({
        name: row.fullName || '-',
        phone: row.phone || '-',
        status: row.status,
        source: row.source || '-',
        priority: row.priority || '-',
        createdAt: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-',
      })),
      totalRows,
    };
  }

  if (category === 'campaigns') {
    const [rows, totalRows, activeCampaigns] = await Promise.all([
      Campaign.find({ ...filter, ...createdAtFilter }).sort({ createdAt: -1 }).limit(PREVIEW_LIMIT).lean(),
      Campaign.countDocuments({ ...filter, ...createdAtFilter }),
      Campaign.countDocuments({ ...filter, status: 'active' }),
    ]);

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: { totalCampaigns: totalRows, activeCampaigns },
      columns: [
        { key: 'campaignNumber', label: 'Campaign #' },
        { key: 'name', label: 'Name' },
        { key: 'channel', label: 'Channel' },
        { key: 'status', label: 'Status' },
        { key: 'sentCount', label: 'Sent', align: 'right' },
        { key: 'bookingsGenerated', label: 'Bookings', align: 'right' },
      ],
      rows: rows.map((row) => ({
        campaignNumber: row.campaignNumber || row._id,
        name: row.name,
        channel: row.channel || '-',
        status: row.status,
        sentCount: row.stats?.sent ?? 0,
        bookingsGenerated: row.stats?.bookingsGenerated ?? 0,
      })),
      totalRows,
    };
  }

  if (category === 'whatsapp') {
    const [rows, totalRows, delivered, readCount] = await Promise.all([
      WhatsAppMessage.find({ ...filter, ...createdAtFilter }).sort({ createdAt: -1 }).limit(PREVIEW_LIMIT).lean(),
      WhatsAppMessage.countDocuments({ ...filter, ...createdAtFilter }),
      WhatsAppMessage.countDocuments({ ...filter, ...createdAtFilter, status: 'delivered' }),
      WhatsAppMessage.countDocuments({ ...filter, ...createdAtFilter, status: 'read' }),
    ]);

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: {
        totalMessages: totalRows,
        deliveryRate: totalRows > 0 ? Math.round((delivered / totalRows) * 100) : 0,
        readRate: totalRows > 0 ? Math.round((readCount / totalRows) * 100) : 0,
      },
      columns: [
        { key: 'phone', label: 'Phone' },
        { key: 'direction', label: 'Direction' },
        { key: 'status', label: 'Status' },
        { key: 'messageType', label: 'Type' },
        { key: 'createdAt', label: 'Sent At' },
      ],
      rows: rows.map((row) => ({
        phone: row.phone || '-',
        direction: row.direction || '-',
        status: row.status,
        messageType: row.messageType || '-',
        createdAt: row.createdAt ? new Date(row.createdAt).toLocaleString() : '-',
      })),
      totalRows,
    };
  }

  if (category === 'reviews') {
    const [rows, totalRows, avgAgg, negativeReviews] = await Promise.all([
      Review.find({ ...filter, submittedAt: { $gte: range.from, $lte: range.to } })
        .populate('guestId', 'fullName name')
        .sort({ submittedAt: -1 })
        .limit(PREVIEW_LIMIT)
        .lean(),
      Review.countDocuments({ ...filter, submittedAt: { $gte: range.from, $lte: range.to } }),
      Review.aggregate([
        { $match: { ...filter, submittedAt: { $gte: range.from, $lte: range.to }, rating: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
      Review.countDocuments({ ...filter, submittedAt: { $gte: range.from, $lte: range.to }, rating: { $lte: 2 } }),
    ]);

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: {
        totalReviews: totalRows,
        averageRating: Number((avgAgg[0]?.avg ?? 0).toFixed(1)),
        negativeReviews,
      },
      columns: [
        { key: 'guestName', label: 'Guest' },
        { key: 'rating', label: 'Rating', align: 'right' },
        { key: 'source', label: 'Source' },
        { key: 'status', label: 'Status' },
        { key: 'submittedAt', label: 'Submitted' },
      ],
      rows: rows.map((row) => ({
        guestName: guestName(row.guestId as Parameters<typeof guestName>[0]),
        rating: row.rating ?? '-',
        source: row.source || '-',
        status: row.status || '-',
        submittedAt: row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '-',
      })),
      totalRows,
    };
  }

  if (category === 'staff') {
    const [rows, totalRows, onDuty, onLeave] = await Promise.all([
      HotelStaff.find(filter).sort({ fullName: 1 }).limit(PREVIEW_LIMIT).lean(),
      HotelStaff.countDocuments(filter),
      HotelStaff.countDocuments({ ...filter, status: 'on_duty' }),
      HotelStaff.countDocuments({ ...filter, status: 'leave' }),
    ]);

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: { totalStaff: totalRows, onDuty, onLeave },
      columns: [
        { key: 'fullName', label: 'Staff' },
        { key: 'role', label: 'Role' },
        { key: 'department', label: 'Department' },
        { key: 'shiftType', label: 'Shift' },
        { key: 'status', label: 'Status' },
      ],
      rows: rows.map((row) => ({
        fullName: row.fullName || '-',
        role: row.role,
        department: row.department || '-',
        shiftType: row.shiftType || '-',
        status: row.status || '-',
      })),
      totalRows,
    };
  }

  if (category === 'housekeeping') {
    const [rows, totalRows, completed] = await Promise.all([
      HousekeepingTask.find({ ...filter, ...createdAtFilter })
        .populate('roomId', 'roomNumber')
        .sort({ createdAt: -1 })
        .limit(PREVIEW_LIMIT)
        .lean(),
      HousekeepingTask.countDocuments({ ...filter, ...createdAtFilter }),
      HousekeepingTask.countDocuments({ ...filter, ...createdAtFilter, status: 'completed' }),
    ]);

    return {
      category,
      title: meta.title,
      description: meta.description,
      generatedAt: new Date().toISOString(),
      dateRange: formatReportDateRange(range),
      summary: {
        totalTasks: totalRows,
        completedTasks: completed,
        completionRate: totalRows > 0 ? Math.round((completed / totalRows) * 100) : 0,
      },
      columns: [
        { key: 'roomNumber', label: 'Room' },
        { key: 'taskType', label: 'Task' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'scheduledAt', label: 'Scheduled' },
      ],
      rows: rows.map((row) => ({
        roomNumber: (row.roomId as { roomNumber?: string } | null)?.roomNumber || '-',
        taskType: row.taskType || '-',
        priority: row.priority || '-',
        status: row.status,
        scheduledAt: row.scheduledFor ? new Date(row.scheduledFor).toLocaleString() : '-',
      })),
      totalRows,
    };
  }

  const [rows, totalRows, urgentIssues, openIssues] = await Promise.all([
    MaintenanceIssue.find({ ...filter, ...createdAtFilter })
      .populate('roomId', 'roomNumber')
      .sort({ createdAt: -1 })
      .limit(PREVIEW_LIMIT)
      .lean(),
    MaintenanceIssue.countDocuments({ ...filter, ...createdAtFilter }),
    MaintenanceIssue.countDocuments({ ...filter, ...createdAtFilter, priority: 'urgent' }),
    MaintenanceIssue.countDocuments({ ...filter, ...createdAtFilter, status: { $in: ['open', 'in_progress'] } }),
  ]);

  return {
    category: 'maintenance',
    title: meta.title,
    description: meta.description,
    generatedAt: new Date().toISOString(),
    dateRange: formatReportDateRange(range),
    summary: { totalIssues: totalRows, openIssues, urgentIssues },
    columns: [
      { key: 'issueTitle', label: 'Issue' },
      { key: 'roomNumber', label: 'Room' },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
    ],
    rows: rows.map((row) => ({
      issueTitle: row.title || '-',
      roomNumber: (row.roomId as { roomNumber?: string } | null)?.roomNumber || '-',
      category: row.issueType || '-',
      priority: row.priority || '-',
      status: row.status,
    })),
    totalRows,
  };
};

const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const buildReportExportRepository = (
  report: CategoryReport,
  format: ReportExportFormat
): ReportExportResult => {
  const headerRow = report.columns.map((column) => column.label);
  const dataRows = report.rows.map((row) => report.columns.map((column) => row[column.key] ?? ''));

  if (format === 'pdf') {
    const summaryRows = Object.entries(report.summary)
      .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
      .join('');
    const tableHead = report.columns.map((column) => `<th>${column.label}</th>`).join('');
    const tableBody = report.rows
      .map((row) => `<tr>${report.columns.map((column) => `<td>${row[column.key] ?? ''}</td>`).join('')}</tr>`)
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${report.title}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{margin:0 0 8px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f8fafc}</style>
</head><body>
<h1>${report.title}</h1>
<p>${report.description}</p>
<p>Period: ${new Date(report.dateRange.from).toLocaleDateString()} - ${new Date(report.dateRange.to).toLocaleDateString()}</p>
<h2>Summary</h2><table>${summaryRows}</table>
<h2>Details</h2><table><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>
</body></html>`;

    return {
      filename: `${report.category}-report-${new Date().toISOString().slice(0, 10)}.html`,
      contentType: 'text/html',
      data: html,
      format,
    };
  }

  if (format === 'excel') {
    const tsv = [headerRow, ...dataRows].map((row) => row.join('\t')).join('\n');
    return {
      filename: `${report.category}-report-${new Date().toISOString().slice(0, 10)}.xls`,
      contentType: 'application/vnd.ms-excel',
      data: tsv,
      format,
    };
  }

  const csv = [headerRow, ...dataRows].map((row) => row.map(escapeCsv).join(',')).join('\n');
  return {
    filename: `${report.category}-report-${new Date().toISOString().slice(0, 10)}.csv`,
    contentType: 'text/csv',
    data: csv,
    format: 'csv',
  };
};

export const getLegacyReportsRepository = async (hotelId?: string) => {
  const filter = hotelId
    ? { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } }
    : { isDeleted: { $ne: true } };

  const [bookings, guests, revenue] = await Promise.all([
    Booking.countDocuments(filter),
    Guest.countDocuments(filter),
    Payment.aggregate([
      { $match: { ...filter, status: { $in: paidStatuses }, paymentType: { $ne: 'refund' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    bookings,
    guests,
    revenue: revenue[0]?.total ?? 0,
  };
};
