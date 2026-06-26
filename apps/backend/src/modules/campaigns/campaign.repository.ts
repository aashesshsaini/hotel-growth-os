import { FilterQuery, Types } from 'mongoose';
import {
  AuditLog,
  Booking,
  Campaign,
  CampaignLog,
  Enquiry,
  Guest,
  HotelStaff,
  Lead,
  User,
} from '../../models';
import { ICampaign } from '../../models/Campaign';
import { ICampaignAudienceFilters } from '../../models/Campaign';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { AudiencePreviewResult, AudienceRecipient, CampaignStatsResult } from './campaign.types';

const guestBaseFilter = (hotelId: string) => ({
  hotelId,
  isDeleted: { $ne: true },
  isBlacklisted: { $ne: true },
  phone: { $exists: true, $ne: '' },
});

export const findCampaignsRepository = async (
  baseFilter: FilterQuery<ICampaign>,
  options: PaginationOptions
): Promise<PaginatedResponse<ICampaign>> => {
  const result = await paginate(Campaign, options, baseFilter);
  await Campaign.populate(result.data, [
    { path: 'assignedTo', select: 'name email role' },
    { path: 'createdBy', select: 'name email' },
  ]);
  return result;
};

export const findCampaignByIdRepository = async (id: string) => {
  return Campaign.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .populate('timeline.createdBy', 'name email')
    .populate('notes.createdBy', 'name email');
};

export const createCampaignRepository = async (data: Record<string, unknown>) => Campaign.create(data);

export const updateCampaignRepository = async (campaign: ICampaign) => {
  await campaign.save();
  return campaign;
};

export const softDeleteCampaignRepository = async (id: string, deletedBy: string) => {
  await Campaign.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy,
    updatedBy: deletedBy,
  });
};

export const findUserByIdRepository = async (userId: string) => {
  return User.findOne({ _id: userId, isDeleted: { $ne: true } });
};

export const findMarketingStaffRepository = async (hotelId: string, userId: string) => {
  return HotelStaff.findOne({
    hotelId,
    userId,
    role: { $in: ['sales_staff', 'hotel_manager', 'hotel_owner', 'reception_staff'] },
    isDeleted: { $ne: true },
    status: { $nin: ['inactive', 'suspended', 'resigned'] },
  });
};

export const createAuditLogRepository = async (payload: Record<string, unknown>) => AuditLog.create(payload);

export const findAuditLogsByCampaignIdRepository = async (campaignId: Types.ObjectId) => {
  return AuditLog.find({ entity: 'Campaign', entityId: campaignId }).sort({ createdAt: -1 }).limit(30);
};

export const findCampaignLogsRepository = async (
  campaignId: string,
  options: PaginationOptions,
  status?: string
) => {
  const filter: FilterQuery<typeof CampaignLog> = { campaignId };
  if (status) filter.status = status;
  return paginate(CampaignLog, options, filter);
};

export const createCampaignLogsBulkRepository = async (logs: Record<string, unknown>[]) => {
  if (logs.length === 0) return [];
  return CampaignLog.insertMany(logs, { ordered: false });
};

export const syncCampaignStatsFromLogsRepository = async (campaignId: string) => {
  const statsAgg = await CampaignLog.aggregate([
    { $match: { campaignId: new Types.ObjectId(campaignId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'responded']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'responded']] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        responded: { $sum: { $cond: [{ $eq: ['$status', 'responded'] }, 1, 0] } },
      },
    },
  ]);

  const performanceAgg = await Promise.all([
    Lead.countDocuments({ campaignId, isDeleted: { $ne: true } }),
    Booking.countDocuments({ campaignId, isDeleted: { $ne: true } }),
    Booking.aggregate([
      { $match: { campaignId: new Types.ObjectId(campaignId), isDeleted: { $ne: true } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
    ]),
  ]);

  const stats = statsAgg[0] ?? { total: 0, sent: 0, delivered: 0, failed: 0, responded: 0 };
  return {
    ...stats,
    leadsGenerated: performanceAgg[0],
    bookingsGenerated: performanceAgg[1],
    revenueGenerated: performanceAgg[2][0]?.revenue ?? 0,
  };
};

const mapGuestRecipient = (guest: {
  _id: Types.ObjectId;
  fullName?: string;
  name?: string;
  phone: string;
  email?: string;
}): AudienceRecipient => ({
  guestId: guest._id.toString(),
  name: guest.fullName || guest.name || 'Guest',
  phone: guest.phone,
  email: guest.email,
});

const mapLeadRecipient = (lead: {
  _id: Types.ObjectId;
  fullName: string;
  phone: string;
  email?: string;
}): AudienceRecipient => ({
  leadId: lead._id.toString(),
  name: lead.fullName,
  phone: lead.phone,
  email: lead.email,
});

const mapEnquiryRecipient = (enquiry: {
  _id: Types.ObjectId;
  guestName: string;
  phone: string;
  email?: string;
}): AudienceRecipient => ({
  enquiryId: enquiry._id.toString(),
  name: enquiry.guestName,
  phone: enquiry.phone,
  email: enquiry.email,
});

export const resolveCampaignAudienceRepository = async (
  hotelId: string,
  segment: string,
  filters: ICampaignAudienceFilters = {},
  limit?: number
): Promise<AudienceRecipient[]> => {
  const baseGuest = guestBaseFilter(hotelId);
  const now = new Date();
  let recipients: AudienceRecipient[] = [];

  switch (segment) {
    case 'all_guests': {
      const guests = await Guest.find({
        ...baseGuest,
        marketingConsent: { $ne: false },
      })
        .select('fullName name phone email')
        .limit(limit ?? 5000)
        .lean();
      recipients = guests.map(mapGuestRecipient);
      break;
    }
    case 'new_guests': {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      const guests = await Guest.find({
        ...baseGuest,
        createdAt: { $gte: cutoff },
      })
        .select('fullName name phone email')
        .limit(limit ?? 5000)
        .lean();
      recipients = guests.map(mapGuestRecipient);
      break;
    }
    case 'repeat_guests': {
      const guests = await Guest.find({ ...baseGuest, isRepeatGuest: true })
        .select('fullName name phone email')
        .limit(limit ?? 5000)
        .lean();
      recipients = guests.map(mapGuestRecipient);
      break;
    }
    case 'vip_guests': {
      const guests = await Guest.find({ ...baseGuest, isVip: true })
        .select('fullName name phone email')
        .limit(limit ?? 5000)
        .lean();
      recipients = guests.map(mapGuestRecipient);
      break;
    }
    case 'corporate_guests': {
      const guests = await Guest.find({
        ...baseGuest,
        $or: [{ guestType: 'corporate' }, { tags: 'corporate' }],
      })
        .select('fullName name phone email')
        .limit(limit ?? 5000)
        .lean();
      recipients = guests.map(mapGuestRecipient);
      break;
    }
    case 'past_guests': {
      const days = filters.lastBookingDays ?? 90;
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      const guests = await Guest.find({
        ...baseGuest,
        totalBookings: { $gt: 0 },
        lastBookingDate: { $lte: cutoff },
      })
        .select('fullName name phone email')
        .limit(limit ?? 5000)
        .lean();
      recipients = guests.map(mapGuestRecipient);
      break;
    }
    case 'inactive_guests': {
      const days = filters.inactiveDays ?? 180;
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      const guests = await Guest.find({
        ...baseGuest,
        $or: [{ lastBookingDate: { $lte: cutoff } }, { lastBookingDate: { $exists: false } }],
      })
        .select('fullName name phone email')
        .limit(limit ?? 5000)
        .lean();
      recipients = guests.map(mapGuestRecipient);
      break;
    }
    case 'leads': {
      const leads = await Lead.find({
        hotelId,
        isDeleted: { $ne: true },
        status: { $nin: ['converted', 'lost', 'not_interested'] },
        phone: { $exists: true, $ne: '' },
      })
        .select('fullName phone email')
        .limit(limit ?? 5000)
        .lean();
      recipients = leads.map(mapLeadRecipient);
      break;
    }
    case 'enquiries': {
      const enquiries = await Enquiry.find({
        hotelId,
        isDeleted: { $ne: true },
        status: { $nin: ['converted_to_booking', 'closed', 'lost', 'spam', 'booked'] },
        phone: { $exists: true, $ne: '' },
      })
        .select('guestName phone email')
        .limit(limit ?? 5000)
        .lean();
      recipients = enquiries.map(mapEnquiryRecipient);
      break;
    }
    case 'custom_segment': {
      const [guests, leads, enquiries] = await Promise.all([
        filters.customGuestIds?.length
          ? Guest.find({ ...baseGuest, _id: { $in: filters.customGuestIds } })
              .select('fullName name phone email')
              .lean()
          : Promise.resolve([]),
        filters.customLeadIds?.length
          ? Lead.find({ hotelId, isDeleted: { $ne: true }, _id: { $in: filters.customLeadIds } })
              .select('fullName phone email')
              .lean()
          : Promise.resolve([]),
        filters.customEnquiryIds?.length
          ? Enquiry.find({ hotelId, isDeleted: { $ne: true }, _id: { $in: filters.customEnquiryIds } })
              .select('guestName phone email')
              .lean()
          : Promise.resolve([]),
      ]);
      recipients = [
        ...guests.map(mapGuestRecipient),
        ...leads.map(mapLeadRecipient),
        ...enquiries.map(mapEnquiryRecipient),
      ];
      break;
    }
    default:
      recipients = [];
  }

  if (filters.city) {
    const city = filters.city.toLowerCase();
    const guestIds = new Set(
      (
        await Guest.find({ ...baseGuest, city: new RegExp(filters.city, 'i') })
          .select('_id phone')
          .lean()
      ).map((guest) => guest._id.toString())
    );
    recipients = recipients.filter(
      (recipient) => recipient.guestId && guestIds.has(recipient.guestId)
    );
  }

  const unique = new Map<string, AudienceRecipient>();
  recipients.forEach((recipient) => {
    const key = recipient.phone.replace(/\D/g, '');
    if (key && !unique.has(key)) unique.set(key, recipient);
  });

  const deduped = Array.from(unique.values());
  return limit ? deduped.slice(0, limit) : deduped;
};

export const previewCampaignAudienceRepository = async (
  hotelId: string,
  segment: string,
  filters: ICampaignAudienceFilters = {}
): Promise<AudiencePreviewResult> => {
  const all = await resolveCampaignAudienceRepository(hotelId, segment, filters);
  return {
    segment,
    totalCount: all.length,
    sample: all.slice(0, 10),
  };
};

export const getCampaignStatsRepository = async (hotelId: string): Promise<CampaignStatsResult> => {
  const baseFilter = { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } };
  const [statusAgg, typeAgg, channelAgg, audienceAgg, performanceAgg] = await Promise.all([
    Campaign.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Campaign.aggregate([{ $match: baseFilter }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    Campaign.aggregate([{ $match: baseFilter }, { $group: { _id: '$channel', count: { $sum: 1 } } }]),
    Campaign.aggregate([{ $match: baseFilter }, { $group: { _id: '$audienceSegment', count: { $sum: 1 } } }]),
    Campaign.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          totalSent: { $sum: '$stats.sent' },
          totalDelivered: { $sum: '$stats.delivered' },
          totalResponded: { $sum: '$stats.responded' },
          totalLeadsGenerated: { $sum: '$stats.leadsGenerated' },
          totalBookingsGenerated: { $sum: '$stats.bookingsGenerated' },
          totalRevenueGenerated: { $sum: '$stats.revenueGenerated' },
        },
      },
    ]),
  ]);

  const byStatus = statusAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});

  const totalCampaigns = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return {
    totalCampaigns,
    draftCampaigns: byStatus.draft ?? 0,
    scheduledCampaigns: byStatus.scheduled ?? 0,
    runningCampaigns: byStatus.running ?? 0,
    pausedCampaigns: byStatus.paused ?? 0,
    completedCampaigns: byStatus.completed ?? 0,
    cancelledCampaigns: byStatus.cancelled ?? 0,
    failedCampaigns: byStatus.failed ?? 0,
    activeCampaigns: (byStatus.scheduled ?? 0) + (byStatus.running ?? 0),
    totalSent: performanceAgg[0]?.totalSent ?? 0,
    totalDelivered: performanceAgg[0]?.totalDelivered ?? 0,
    totalResponded: performanceAgg[0]?.totalResponded ?? 0,
    totalLeadsGenerated: performanceAgg[0]?.totalLeadsGenerated ?? 0,
    totalBookingsGenerated: performanceAgg[0]?.totalBookingsGenerated ?? 0,
    totalRevenueGenerated: performanceAgg[0]?.totalRevenueGenerated ?? 0,
    byStatus,
    byType: typeAgg.reduce<Record<string, number>>((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
    byChannel: channelAgg.reduce<Record<string, number>>((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
    byAudience: audienceAgg.reduce<Record<string, number>>((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {}),
  };
};

export const markCampaignLogsDeliveredRepository = async (campaignId: string) => {
  const now = new Date();
  await CampaignLog.updateMany(
    { campaignId, status: 'sent' },
    { $set: { status: 'delivered', deliveredAt: now } }
  );
};

export const processPendingCampaignLogsRepository = async (
  campaignId: string,
  hotelId: string,
  channel: string
) => {
  const now = new Date();
  const pendingLogs = await CampaignLog.find({ campaignId, status: 'pending' }).limit(500);
  if (pendingLogs.length === 0) return 0;

  await CampaignLog.updateMany(
    { _id: { $in: pendingLogs.map((log) => log._id) } },
    { $set: { status: 'sent', sentAt: now, channel } }
  );

  await markCampaignLogsDeliveredRepository(campaignId);
  return pendingLogs.length;
};

export const getRecentCampaignsRepository = async (hotelId: string, limit = 5) => {
  return Campaign.find({ hotelId, isDeleted: { $ne: true } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('name campaignNumber type status channel stats scheduledAt launchedAt createdAt')
    .lean();
};
