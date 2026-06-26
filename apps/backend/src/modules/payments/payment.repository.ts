import { FilterQuery, PipelineStage, Types } from 'mongoose';
import { Booking, Guest, Payment, WhatsAppAutomationRule, WhatsAppMessage } from '../../models';
import { IPayment } from '../../models/Payment';
import { IBooking } from '../../models/Booking';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { BookingPaymentSummary, PaymentStatsResult } from './payment.types';

export const SUCCESSFUL_PAYMENT_STATUSES = ['paid', 'completed', 'partially_paid'] as const;

const paymentPopulate = [
  { path: 'guestId', select: 'fullName name phone email totalSpend' },
  { path: 'bookingId', select: 'bookingNumber checkInDate checkOutDate status totalAmount paidAmount paymentStatus roomId' },
  { path: 'receivedBy', select: 'name email' },
  { path: 'timeline.createdBy', select: 'name email' },
  { path: 'paymentNotes.createdBy', select: 'name email' },
];

export const normalizePaymentStatus = (status?: string): string => {
  if (status === 'completed') return 'paid';
  return status || 'pending';
};

export const isSuccessfulPaymentStatus = (status?: string): boolean =>
  SUCCESSFUL_PAYMENT_STATUSES.includes(normalizePaymentStatus(status) as (typeof SUCCESSFUL_PAYMENT_STATUSES)[number]);

export const findPaymentsRepository = async (
  baseFilter: FilterQuery<IPayment>,
  options: PaginationOptions
): Promise<PaginatedResponse<IPayment>> => {
  const result = await paginate(Payment, options, baseFilter);
  await Payment.populate(result.data, paymentPopulate);
  return result;
};

export const findPaymentByIdRepository = async (id: string) => {
  return Payment.findOne({ _id: id, isDeleted: { $ne: true } }).populate(paymentPopulate);
};

export const createPaymentRepository = async (data: Record<string, unknown>) => Payment.create(data);

export const updatePaymentRepository = async (payment: IPayment) => {
  await payment.save();
  return payment;
};

export const softDeletePaymentRepository = async (id: string, deletedBy: string) => {
  await Payment.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy });
};

export const findBookingByIdRepository = async (bookingId: string) => {
  return Booking.findOne({ _id: bookingId, isDeleted: { $ne: true } });
};

export const findGuestByIdRepository = async (guestId: string, hotelId: string) => {
  return Guest.findOne({ _id: guestId, hotelId, isDeleted: { $ne: true } });
};

export const generateInvoiceNumberRepository = async (hotelId: string): Promise<string> => {
  const prefix = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const count = await Payment.countDocuments({ hotelId, invoiceNumber: { $regex: `^${prefix}` } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

export const recalculateBookingPaidAmountRepository = async (booking: IBooking) => {
  const payments = await Payment.find({
    hotelId: booking.hotelId,
    bookingId: booking._id,
    isDeleted: { $ne: true },
    status: { $in: ['paid', 'completed', 'partially_paid'] },
  });

  const refunds = await Payment.find({
    hotelId: booking.hotelId,
    bookingId: booking._id,
    isDeleted: { $ne: true },
    paymentType: 'refund',
    status: { $in: ['paid', 'completed', 'refunded'] },
  });

  const collected = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const refunded = refunds.reduce((sum, payment) => sum + (payment.refundedAmount ?? payment.amount ?? 0), 0);
  booking.paidAmount = Math.max(collected - refunded, 0);
  await booking.save();
  return booking;
};

export const syncGuestPaymentMetricsRepository = async (guestId: string, hotelId: string) => {
  const [summary] = await Booking.aggregate([
    { $match: { guestId: new Types.ObjectId(guestId), hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$guestId',
        totalBookings: { $sum: 1 },
        totalSpend: { $sum: '$paidAmount' },
      },
    },
  ]);

  await Guest.findOneAndUpdate(
    { _id: guestId, hotelId },
    {
      totalSpend: summary?.totalSpend ?? 0,
      averageSpend: summary?.totalBookings ? Math.round((summary.totalSpend ?? 0) / summary.totalBookings) : 0,
    }
  );
};

export const inferPaymentType = (amount: number, booking: IBooking, isRefund = false): string => {
  if (isRefund) return 'refund';
  const due = Math.max((booking.totalAmount || 0) - (booking.paidAmount || 0), 0);
  if (amount >= due && due > 0) return 'full';
  if ((booking.paidAmount || 0) <= 0) return 'advance';
  return 'partial';
};

export const getPaymentStatsRepository = async (hotelId: string): Promise<PaymentStatsResult> => {
  const baseFilter = { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } };
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const successMatch = { ...baseFilter, status: { $in: ['paid', 'completed', 'partially_paid'] }, paymentType: { $ne: 'refund' } };

  const [
    totalPayments,
    collectedAgg,
    pendingAgg,
    refundedAgg,
    todayAgg,
    monthlyAgg,
    statusAgg,
    methodAgg,
    typeAgg,
    outstandingBookings,
    outstandingAgg,
    trendAgg,
    bookingDueAgg,
  ] = await Promise.all([
    Payment.countDocuments(baseFilter),
    Payment.aggregate([{ $match: successMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { ...baseFilter, status: 'pending' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Payment.aggregate([
      { $match: { ...baseFilter, $or: [{ status: 'refunded' }, { paymentType: 'refund' }] } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$refundedAmount', '$amount'] } } } },
    ]),
    Payment.aggregate([
      { $match: { ...successMatch, paidAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { ...successMatch, paidAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: baseFilter }, { $group: { _id: '$method', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: baseFilter }, { $group: { _id: '$paymentType', count: { $sum: 1 } } }]),
    Booking.countDocuments({
      hotelId: new Types.ObjectId(hotelId),
      isDeleted: { $ne: true },
      paymentStatus: { $in: ['unpaid', 'partially_paid'] },
    }),
    Booking.aggregate([
      {
        $match: {
          hotelId: new Types.ObjectId(hotelId),
          isDeleted: { $ne: true },
          paymentStatus: { $in: ['unpaid', 'partially_paid'] },
        },
      },
      { $group: { _id: null, total: { $sum: { $max: [{ $subtract: ['$totalAmount', '$paidAmount'] }, 0] } } } },
    ]),
    Payment.aggregate([
      { $match: { ...successMatch, paidAt: { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
          collected: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ] as PipelineStage[]),
    Booking.aggregate([
      { $match: { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } } },
      { $group: { _id: null, totalDue: { $sum: '$totalAmount' }, totalPaid: { $sum: '$paidAmount' } } },
    ]),
  ]);

  const totalCollected = collectedAgg[0]?.total ?? 0;
  const totalDue = bookingDueAgg[0]?.totalDue ?? 0;
  const totalPaidOnBookings = bookingDueAgg[0]?.totalPaid ?? 0;
  const collectionRate = totalDue > 0 ? Math.round((totalPaidOnBookings / totalDue) * 100) : 100;

  return {
    totalPayments,
    totalCollected,
    pendingAmount: pendingAgg[0]?.total ?? 0,
    refundedAmount: refundedAgg[0]?.total ?? 0,
    todayRevenue: todayAgg[0]?.total ?? 0,
    monthlyRevenue: monthlyAgg[0]?.total ?? 0,
    collectionRate,
    outstandingBookings,
    outstandingAmount: outstandingAgg[0]?.total ?? 0,
    statusBreakdown: statusAgg.reduce<Record<string, number>>((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
    methodBreakdown: methodAgg.reduce<Record<string, number>>((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
    typeBreakdown: typeAgg.reduce<Record<string, number>>((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
    recentTrend: trendAgg.map((item) => ({
      month: String(item._id),
      collected: item.collected ?? 0,
      count: item.count ?? 0,
    })),
  };
};

export const findBookingPaymentsRepository = async (hotelId: string, bookingId: string) => {
  return Payment.find({ hotelId, bookingId, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .populate(paymentPopulate);
};

export const findGuestPaymentsRepository = async (guestId: string, hotelId: string) => {
  return Payment.find({ guestId, hotelId, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .populate('bookingId', 'bookingNumber checkInDate checkOutDate status totalAmount paidAmount paymentStatus');
};

export const schedulePaymentReminderWhatsAppRepository = async (
  booking: IBooking,
  guestPhone?: string,
  dueAmount?: number
) => {
  if (!guestPhone) return;
  const hotelId = String(booking.hotelId);
  const rules = await WhatsAppAutomationRule.find({
    hotelId,
    trigger: 'payment_reminder',
    isActive: true,
    isDeleted: { $ne: true },
  }).populate('templateId');

  const rule = rules[0];
  if (!rule) return;

  const template = rule.templateId as unknown as { body?: string; name?: string } | null;
  const guest = await Guest.findById(booking.guestId).select('fullName name');
  const guestName = guest?.fullName || guest?.name || 'Guest';
  const body = (template?.body || 'Hello {{guestName}}, pending payment of {{amount}} for booking {{bookingNumber}}.')
    .replace(/\{\{guestName\}\}/g, guestName)
    .replace(/\{\{guest_name\}\}/g, guestName)
    .replace(/\{\{amount\}\}/g, String(dueAmount ?? Math.max((booking.totalAmount || 0) - (booking.paidAmount || 0), 0)))
    .replace(/\{\{bookingNumber\}\}/g, booking.bookingNumber || '');

  return WhatsAppMessage.create({
    hotelId: booking.hotelId,
    guestId: booking.guestId,
    bookingId: booking._id,
    phone: guestPhone.replace(/\D/g, '').slice(-10),
    direction: 'outgoing',
    messageType: 'template',
    body,
    status: 'scheduled',
    scheduledAt: new Date(Date.now() + (rule.delayMinutes ?? 30) * 60 * 1000),
    templateName: template?.name || 'payment_reminder',
    metadata: { bookingId: booking._id, trigger: 'payment_reminder' },
  });
};

export const buildBookingPaymentSummaryRepository = async (
  hotelId: string,
  bookingId: string
): Promise<BookingPaymentSummary | null> => {
  const booking = await Booking.findOne({ _id: bookingId, hotelId, isDeleted: { $ne: true } });
  if (!booking) return null;
  const payments = await findBookingPaymentsRepository(hotelId, bookingId);
  const dueAmount = Math.max((booking.totalAmount || 0) - (booking.paidAmount || 0), 0);
  return {
    bookingId: String(booking._id),
    bookingNumber: booking.bookingNumber,
    totalAmount: booking.totalAmount || 0,
    paidAmount: booking.paidAmount || 0,
    dueAmount,
    paymentStatus: booking.paymentStatus,
    payments: payments.map((payment) => {
      const doc = payment.toObject ? payment.toObject() : payment;
      return {
        ...doc,
        id: String(payment._id),
        hotelId: String(doc.hotelId),
        status: normalizePaymentStatus(doc.status),
      } as unknown as import('./payment.types').SanitizedPayment;
    }),
  };
};
