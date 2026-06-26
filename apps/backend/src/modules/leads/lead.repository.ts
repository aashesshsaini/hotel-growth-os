import { FilterQuery, Types } from 'mongoose';
import { AuditLog, Booking, Guest, HotelStaff, Lead, Task, User } from '../../models';
import { ILead } from '../../models/Lead';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';

export const findLeadsRepository = async (
  baseFilter: FilterQuery<ILead>,
  options: PaginationOptions
): Promise<PaginatedResponse<ILead>> => {
  const result = await paginate(Lead, options, baseFilter);
  await Lead.populate(result.data, [
    { path: 'assignedTo', select: 'name email role' },
    { path: 'convertedGuestId', select: 'fullName name phone email' },
    { path: 'convertedBookingId', select: 'bookingNumber status checkInDate checkOutDate totalAmount' },
  ]);
  return result;
};

export const findLeadByIdRepository = async (id: string) => {
  return Lead.findById(id)
    .populate('assignedTo', 'name email role')
    .populate('convertedGuestId', 'fullName name phone email city')
    .populate('convertedBookingId', 'bookingNumber status checkInDate checkOutDate totalAmount')
    .populate('timeline.createdBy', 'name email');
};

export const createLeadRepository = async (data: Record<string, unknown>) => Lead.create(data);
export const updateLeadRepository = async (lead: ILead) => {
  await lead.save();
  return lead;
};

export const softDeleteLeadRepository = async (id: string, deletedBy: string) => {
  await Lead.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy });
};

export const findSalesStaffRepository = async (hotelId: string, userId: string) => {
  return HotelStaff.findOne({
    hotelId,
    userId,
    role: { $in: ['sales_staff', 'reception_staff', 'hotel_manager'] },
    isDeleted: { $ne: true },
    status: { $nin: ['inactive', 'suspended', 'resigned'] },
  });
};

export const findUserByIdRepository = async (userId: string) => {
  return User.findOne({ _id: userId, isDeleted: { $ne: true } });
};

export const generateLeadNumberRepository = async (hotelId: string): Promise<string> => {
  const prefix = `LD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const count = await Lead.countDocuments({ hotelId, leadNumber: { $regex: `^${prefix}` } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

export const getLeadStatsRepository = async (hotelId: string) => {
  const baseFilter = { hotelId, isDeleted: { $ne: true } };
  const now = new Date();
  const [statusAgg, sourceAgg, typeAgg, hotLeads, pendingFollowUps, pipelineAgg, workloadAgg] = await Promise.all([
    Lead.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Lead.aggregate([{ $match: baseFilter }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
    Lead.aggregate([{ $match: baseFilter }, { $group: { _id: '$leadType', count: { $sum: 1 } } }]),
    Lead.countDocuments({ ...baseFilter, priority: 'hot', status: { $nin: ['converted', 'lost', 'not_interested'] } }),
    Lead.countDocuments({ ...baseFilter, followUpDate: { $lte: now }, status: { $nin: ['converted', 'lost', 'not_interested'] } }),
    Lead.aggregate([
      { $match: { ...baseFilter, status: { $nin: ['converted', 'lost', 'not_interested'] } } },
      { $group: { _id: null, value: { $sum: '$estimatedValue' } } },
    ]),
    Lead.aggregate([
      { $match: { ...baseFilter, assignedTo: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$assignedTo',
          openLeads: { $sum: { $cond: [{ $not: [{ $in: ['$status', ['converted', 'lost', 'not_interested']] }] }, 1, 0] } },
          followUpsDue: { $sum: { $cond: [{ $and: [{ $lte: ['$followUpDate', now] }, { $not: [{ $in: ['$status', ['converted', 'lost', 'not_interested']] }] }] }, 1, 0] } },
        },
      },
      { $sort: { openLeads: -1 } },
      { $limit: 8 },
    ]),
  ]);
  const staffDocs = await User.find({ _id: { $in: workloadAgg.map((item) => item._id) } }).select('name email');
  const nameMap = new Map(staffDocs.map((user) => [user._id.toString(), user.name || user.email]));
  return {
    statusAgg,
    sourceAgg,
    typeAgg,
    hotLeads,
    pendingFollowUps,
    estimatedPipelineValue: pipelineAgg[0]?.value ?? 0,
    assignedWorkload: workloadAgg.map((item) => ({
      staffId: item._id.toString(),
      name: nameMap.get(item._id.toString()) ?? 'Staff',
      openLeads: item.openLeads,
      followUpsDue: item.followUpsDue,
    })),
  };
};

export const findGuestByPhoneRepository = async (hotelId: string, phone: string) => {
  return Guest.findOne({ hotelId, phone, isDeleted: { $ne: true } });
};

export const createGuestRepository = async (data: Record<string, unknown>) => Guest.create(data);
export const createBookingRepository = async (data: Record<string, unknown>) => Booking.create(data);

export const createFollowUpTaskRepository = async (lead: ILead, assignedTo?: Types.ObjectId) => {
  if (!lead.followUpDate) return;
  await Task.create({
    hotelId: lead.hotelId,
    title: `Follow up: ${lead.fullName}`,
    description: lead.notes,
    assignedTo: assignedTo ?? lead.assignedTo,
    dueDate: lead.followUpDate,
    priority: lead.priority === 'hot' ? 'high' : lead.priority === 'low' ? 'low' : 'medium',
    status: 'pending',
    relatedTo: { type: 'Lead', id: lead._id },
    createdBy: lead.updatedBy ?? lead.createdBy,
    updatedBy: lead.updatedBy ?? lead.createdBy,
  });
};

export const findAuditLogsByLeadIdRepository = async (leadId: Types.ObjectId) => {
  return AuditLog.find({ entity: 'Lead', entityId: leadId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId', 'name email');
};

export const createAuditLogRepository = async (data: Record<string, unknown>) => {
  await AuditLog.create(data);
};
