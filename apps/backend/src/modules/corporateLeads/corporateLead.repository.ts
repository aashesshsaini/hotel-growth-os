import { FilterQuery, Types } from 'mongoose';
import { AuditLog, Booking, CorporateLead, User } from '../../models';
import { ICorporateLead } from '../../models/CorporateLead';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { CorporateLeadStats, CorporatePipelineColumn } from './corporateLead.types';

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
  { path: 'timeline.createdBy', select: 'name email' },
  { path: 'structuredNotes.createdBy', select: 'name email' },
  { path: 'meetings.createdBy', select: 'name email' },
  { path: 'proposals.createdBy', select: 'name email' },
];

export const findCorporateLeadsRepository = async (
  baseFilter: FilterQuery<ICorporateLead>,
  options: PaginationOptions
): Promise<PaginatedResponse<ICorporateLead>> => {
  const result = await paginate(
    CorporateLead,
    {
      ...options,
      searchFields: ['companyName', 'companyNumber', 'contactPerson', 'phone', 'email', 'gstNumber', 'industry'],
    },
    baseFilter
  );
  await CorporateLead.populate(result.data, populateFields);
  return result;
};

export const findCorporateLeadByIdRepository = async (id: string) => {
  return CorporateLead.findOne({ _id: id, isDeleted: { $ne: true } }).populate(populateFields);
};

export const getCorporateLeadStatsRepository = async (hotelId: string): Promise<CorporateLeadStats> => {
  const hotelObjectId = new Types.ObjectId(hotelId);
  const baseFilter = { hotelId: hotelObjectId, isDeleted: { $ne: true } };
  const now = new Date();
  const weekEnd = endOfDay(addDays(now, 7));
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

  const activeStatuses = ['active_client', 'confirmed', 'approved'];

  const [
    totalCompanies,
    activeClients,
    pipelineAgg,
    outstandingAgg,
    pendingFollowUps,
    meetingsThisWeek,
    proposalsSent,
    statusAgg,
    companyTypeAgg,
    monthlyRevenueAgg,
    bookingRevenueAgg,
  ] = await Promise.all([
    CorporateLead.countDocuments(baseFilter),
    CorporateLead.countDocuments({ ...baseFilter, status: { $in: activeStatuses } }),
    CorporateLead.aggregate([
      { $match: { ...baseFilter, status: { $nin: ['lost', 'inactive'] } } },
      { $group: { _id: null, value: { $sum: '$totalValue' } } },
    ]),
    CorporateLead.aggregate([{ $match: baseFilter }, { $group: { _id: null, value: { $sum: '$outstandingAmount' } } }]),
    CorporateLead.countDocuments({
      ...baseFilter,
      followUpDate: { $lte: now },
      status: { $nin: ['lost', 'inactive', 'active_client', 'confirmed'] },
    }),
    CorporateLead.countDocuments({
      ...baseFilter,
      meetings: { $elemMatch: { scheduledAt: { $gte: now, $lte: weekEnd }, status: 'scheduled' } },
    }),
    CorporateLead.countDocuments({ ...baseFilter, 'proposals.status': 'sent' }),
    CorporateLead.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    CorporateLead.aggregate([{ $match: baseFilter }, { $group: { _id: '$companyType', count: { $sum: 1 } } }]),
    CorporateLead.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, value: { $sum: '$paidAmount' } } },
    ]),
    Booking.aggregate([
      { $match: { hotelId: hotelObjectId, corporateLeadId: { $exists: true, $ne: null }, isDeleted: { $ne: true } } },
      { $group: { _id: null, value: { $sum: '$paidAmount' } } },
    ]),
  ]);

  const statusBreakdown = statusAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});

  const companyTypeBreakdown = companyTypeAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});

  const totalRevenue = (pipelineAgg[0]?.value ?? 0) + (bookingRevenueAgg[0]?.value ?? 0);

  return {
    totalCompanies,
    activeClients,
    pipelineValue: pipelineAgg[0]?.value ?? 0,
    totalRevenue,
    outstandingAmount: outstandingAgg[0]?.value ?? 0,
    pendingFollowUps,
    meetingsThisWeek,
    proposalsSent,
    statusBreakdown,
    companyTypeBreakdown,
    monthlyRevenue: monthlyRevenueAgg[0]?.value ?? 0,
  };
};

const PIPELINE_STAGES = [
  { status: 'new', label: 'New' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { status: 'proposal_sent', label: 'Proposal Sent' },
  { status: 'negotiation', label: 'Negotiation' },
  { status: 'contract_review', label: 'Contract Review' },
  { status: 'approved', label: 'Approved' },
  { status: 'active_client', label: 'Active Client' },
  { status: 'inactive', label: 'Inactive' },
  { status: 'lost', label: 'Lost' },
];

export const getCorporatePipelineRepository = async (hotelId: string): Promise<CorporatePipelineColumn[]> => {
  const hotelObjectId = new Types.ObjectId(hotelId);
  const companies = await CorporateLead.find({ hotelId: hotelObjectId, isDeleted: { $ne: true } })
    .populate('assignedTo', 'name email')
    .sort({ updatedAt: -1 })
    .lean();

  return PIPELINE_STAGES.map((stage) => {
    const stageCompanies = companies.filter((company) => {
      if (stage.status === 'negotiation') return ['negotiation', 'negotiating'].includes(company.status);
      if (stage.status === 'active_client') return ['active_client', 'confirmed'].includes(company.status);
      return company.status === stage.status;
    });

    return {
      status: stage.status,
      label: stage.label,
      count: stageCompanies.length,
      value: stageCompanies.reduce((sum, company) => sum + (company.totalValue ?? 0), 0),
      companies: stageCompanies.slice(0, 20).map((company) => ({
        id: String(company._id),
        companyNumber: company.companyNumber || String(company._id),
        companyName: company.companyName,
        contactPerson: company.contactPerson,
        totalValue: company.totalValue ?? 0,
        priority: company.priority || 'medium',
        followUpDate: company.followUpDate?.toISOString(),
        assignedToName: (company.assignedTo as { name?: string } | null)?.name,
      })),
    };
  });
};

export const getCorporateLeadBookingsRepository = async (hotelId: string, corporateLeadId: string) => {
  return Booking.find({
    hotelId,
    corporateLeadId,
    isDeleted: { $ne: true },
  })
    .populate('guestId', 'fullName name phone')
    .populate('roomId', 'roomNumber')
    .sort({ checkInDate: -1 })
    .limit(50)
    .lean();
};

export const findAuditLogsByCorporateLeadIdRepository = async (hotelId: string, corporateLeadId: string) => {
  return AuditLog.find({ hotelId, entity: 'CorporateLead', entityId: corporateLeadId })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
};

export const findUserByIdRepository = async (userId: string) => {
  return User.findOne({ _id: userId, isDeleted: { $ne: true } });
};

export const syncOutstandingAmount = (lead: ICorporateLead) => {
  const totalValue = lead.totalValue ?? 0;
  const paidAmount = lead.paidAmount ?? 0;
  lead.outstandingAmount = Math.max(0, totalValue - paidAmount);
};
