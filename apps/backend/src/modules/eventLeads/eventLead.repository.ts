import { FilterQuery, Types } from 'mongoose';
import { AuditLog, Booking, EventLead, User } from '../../models';
import { IEventLead } from '../../models/EventLead';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { EventLeadStats, EventPipelineColumn } from './eventLead.types';

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

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const populateFields = [
  { path: 'assignedTo', select: 'name email role' },
  { path: 'convertedGuestId', select: 'fullName name phone email' },
  { path: 'convertedBookingId', select: 'bookingNumber status totalAmount' },
  { path: 'timeline.createdBy', select: 'name email' },
  { path: 'structuredNotes.createdBy', select: 'name email' },
  { path: 'proposals.createdBy', select: 'name email' },
  { path: 'siteVisits.createdBy', select: 'name email' },
  { path: 'packages.createdBy', select: 'name email' },
];

export const findEventLeadsRepository = async (
  baseFilter: FilterQuery<IEventLead>,
  options: PaginationOptions
): Promise<PaginatedResponse<IEventLead>> => {
  const result = await paginate(
    EventLead,
    {
      ...options,
      searchFields: ['eventName', 'eventNumber', 'contactPerson', 'phone', 'email', 'packageName'],
    },
    baseFilter
  );
  await EventLead.populate(result.data, populateFields);
  return result;
};

export const findEventLeadByIdRepository = async (id: string) => {
  return EventLead.findOne({ _id: id, isDeleted: { $ne: true } }).populate(populateFields);
};

export const getEventLeadStatsRepository = async (hotelId: string): Promise<EventLeadStats> => {
  const hotelObjectId = new Types.ObjectId(hotelId);
  const baseFilter = { hotelId: hotelObjectId, isDeleted: { $ne: true } };
  const now = new Date();
  const weekEnd = endOfDay(addDays(now, 7));
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const todayStart = startOfDay(now);

  const activePipelineStatuses = ['lost', 'converted', 'completed'];

  const [
    totalEvents,
    upcomingEvents,
    pipelineAgg,
    outstandingAgg,
    pendingFollowUps,
    siteVisitsThisWeek,
    proposalsSent,
    convertedEvents,
    statusAgg,
    eventTypeAgg,
    monthlyRevenueAgg,
    bookingRevenueAgg,
  ] = await Promise.all([
    EventLead.countDocuments(baseFilter),
    EventLead.countDocuments({ ...baseFilter, eventDate: { $gte: todayStart }, status: { $nin: ['lost', 'converted', 'completed'] } }),
    EventLead.aggregate([
      { $match: { ...baseFilter, status: { $nin: activePipelineStatuses } } },
      { $group: { _id: null, value: { $sum: { $ifNull: ['$totalValue', '$estimatedValue'] } } } },
    ]),
    EventLead.aggregate([{ $match: baseFilter }, { $group: { _id: null, value: { $sum: '$outstandingAmount' } } }]),
    EventLead.countDocuments({
      ...baseFilter,
      followUpDate: { $lte: now },
      status: { $nin: activePipelineStatuses },
    }),
    EventLead.countDocuments({
      ...baseFilter,
      siteVisits: { $elemMatch: { scheduledAt: { $gte: now, $lte: weekEnd }, status: 'scheduled' } },
    }),
    EventLead.countDocuments({ ...baseFilter, 'proposals.status': 'sent' }),
    EventLead.countDocuments({ ...baseFilter, status: { $in: ['converted', 'completed', 'confirmed'] } }),
    EventLead.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    EventLead.aggregate([{ $match: baseFilter }, { $group: { _id: '$eventType', count: { $sum: 1 } } }]),
    EventLead.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, value: { $sum: '$paidAmount' } } },
    ]),
    Booking.aggregate([
      { $match: { hotelId: hotelObjectId, eventLeadId: { $exists: true, $ne: null }, isDeleted: { $ne: true } } },
      { $group: { _id: null, value: { $sum: '$paidAmount' } } },
    ]),
  ]);

  const statusBreakdown = statusAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});

  const eventTypeBreakdown = eventTypeAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});

  const pipelineValue = pipelineAgg[0]?.value ?? 0;
  const bookingRevenue = bookingRevenueAgg[0]?.value ?? 0;

  return {
    totalEvents,
    upcomingEvents,
    pipelineValue,
    totalRevenue: pipelineValue + bookingRevenue,
    outstandingAmount: outstandingAgg[0]?.value ?? 0,
    pendingFollowUps,
    siteVisitsThisWeek,
    proposalsSent,
    convertedEvents,
    statusBreakdown,
    eventTypeBreakdown,
    monthlyRevenue: monthlyRevenueAgg[0]?.value ?? 0,
  };
};

const PIPELINE_STAGES = [
  { status: 'new', label: 'New' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'requirement_collected', label: 'Requirement Collected' },
  { status: 'proposal_sent', label: 'Proposal Sent' },
  { status: 'site_visit_scheduled', label: 'Site Visit Scheduled' },
  { status: 'negotiation', label: 'Negotiation' },
  { status: 'advance_pending', label: 'Advance Pending' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'converted', label: 'Converted' },
  { status: 'lost', label: 'Lost' },
];

const normalizeStatus = (status: string): string => {
  if (status === 'quoted') return 'proposal_sent';
  if (status === 'completed') return 'converted';
  return status;
};

export const getEventPipelineRepository = async (hotelId: string): Promise<EventPipelineColumn[]> => {
  const hotelObjectId = new Types.ObjectId(hotelId);
  const events = await EventLead.find({ hotelId: hotelObjectId, isDeleted: { $ne: true } })
    .populate('assignedTo', 'name email')
    .sort({ eventDate: 1, updatedAt: -1 })
    .lean();

  return PIPELINE_STAGES.map((stage) => {
    const stageEvents = events.filter((event) => normalizeStatus(event.status) === stage.status);

    return {
      status: stage.status,
      label: stage.label,
      count: stageEvents.length,
      value: stageEvents.reduce((sum, event) => sum + (event.totalValue ?? event.estimatedValue ?? 0), 0),
      events: stageEvents.slice(0, 20).map((event) => ({
        id: String(event._id),
        eventNumber: event.eventNumber || String(event._id),
        eventName: event.eventName,
        eventType: event.eventType,
        contactPerson: event.contactPerson,
        eventDate: event.eventDate?.toISOString(),
        guestCount: event.guestCount,
        totalValue: event.totalValue ?? event.estimatedValue ?? 0,
        priority: event.priority || 'medium',
        followUpDate: event.followUpDate?.toISOString(),
        assignedToName: (event.assignedTo as { name?: string } | null)?.name,
      })),
    };
  });
};

export const getEventLeadBookingsRepository = async (hotelId: string, eventLeadId: string) => {
  return Booking.find({
    hotelId,
    eventLeadId,
    isDeleted: { $ne: true },
  })
    .populate('guestId', 'fullName name phone')
    .populate('roomId', 'roomNumber')
    .sort({ checkInDate: -1 })
    .limit(50)
    .lean();
};

export const findAuditLogsByEventLeadIdRepository = async (hotelId: string, eventLeadId: string) => {
  return AuditLog.find({ hotelId, entity: 'EventLead', entityId: eventLeadId })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
};

export const findUserByIdRepository = async (userId: string) => {
  return User.findOne({ _id: userId, isDeleted: { $ne: true } });
};

export const syncOutstandingAmount = (lead: IEventLead) => {
  const totalValue = lead.totalValue ?? lead.estimatedValue ?? 0;
  const paidAmount = lead.paidAmount ?? 0;
  lead.outstandingAmount = Math.max(0, totalValue - paidAmount);
};
