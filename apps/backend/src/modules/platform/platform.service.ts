import { Types } from 'mongoose';
import { AuditLog, Booking, Hotel, HotelStaff, ImpersonationSession, Invoice, Notification, Payment, Plan, Room, Subscription, SupportTicket, SystemHealthMetric, SystemIncident, User } from '../../models';
import { config } from '../../config';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { generateToken } from '../../utils/jwt';
import { hashPassword } from '../../utils/password';
import {
  ImpersonateInput,
  PlatformHotelBulkActionInput,
  PlatformHotelCreateInput,
  PlatformHotelListQuery,
  PlatformHotelResetPasswordInput,
  PlatformHotelSendEmailInput,
  PlatformHotelStatusInput,
  PlatformHotelUpdateInput,
  PlatformPlanCreateInput,
  PlatformPlanListQuery,
  PlatformPlanStatusInput,
  PlatformPlanUpdateInput,
  PlatformSubscriptionActionInput,
  PlatformSubscriptionAssignInput,
  PlatformSubscriptionListQuery,
  PlatformInvoiceActionInput,
  PlatformInvoiceGenerateInput,
  PlatformInvoiceListQuery,
  PlatformAnalyticsQuery,
  PlatformTicketActionInput,
  PlatformTicketCreateInput,
  PlatformTicketListQuery,
  PlatformIncidentListQuery,
  PlatformSystemHealthQuery,
} from './platform.validation';

interface Viewer {
  userId: string;
  role: string;
}

const activeFilter = { isDeleted: { $ne: true } };

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const monthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const previousMonths = (count: number) => {
  const now = new Date();
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - index - 1), 1);
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { label: date.toLocaleString('en-US', { month: 'short' }), from: date, to: next };
  });
};

const logPlatformActivity = async (
  viewer: Viewer,
  action: string,
  entity: string,
  entityId?: unknown,
  changes?: Record<string, unknown>
) => {
  const normalizedEntityId = entityId ? new Types.ObjectId(String(entityId)) : undefined;
  await AuditLog.create({
    userId: new Types.ObjectId(viewer.userId),
    action,
    entity,
    entityId: normalizedEntityId,
    hotelId: entity === 'Hotel' ? normalizedEntityId : undefined,
    changes,
  });
};

const getHotelOwner = async (hotelId: unknown) =>
  User.findOne({ hotelId, role: 'hotel_owner', ...activeFilter }).select('name email phone role isActive lastLoginAt').lean();

interface HotelMetrics {
  owners?: Map<string, any>;
  staff?: Map<string, number>;
  rooms?: Map<string, number>;
  activeBookings?: Map<string, number>;
}

const countByHotel = async (model: typeof HotelStaff | typeof Room | typeof Booking, hotelIds: Types.ObjectId[], extraFilter: Record<string, unknown> = {}) => {
  const rows = await model.aggregate([
    { $match: { hotelId: { $in: hotelIds }, ...activeFilter, ...extraFilter } },
    { $group: { _id: '$hotelId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
};

const getHotelMetrics = async (hotelIds: Types.ObjectId[]): Promise<HotelMetrics> => {
  const [owners, staff, rooms, activeBookings] = await Promise.all([
    User.find({ hotelId: { $in: hotelIds }, role: 'hotel_owner', ...activeFilter }).select('name email phone role isActive lastLoginAt hotelId').lean(),
    countByHotel(HotelStaff, hotelIds, { isActive: true }),
    countByHotel(Room, hotelIds),
    countByHotel(Booking, hotelIds, { status: { $in: ['reserved', 'pending', 'confirmed', 'checked_in'] } }),
  ]);

  return {
    owners: new Map(owners.map((owner: any) => [String(owner.hotelId), owner])),
    staff,
    rooms,
    activeBookings,
  };
};

const getSubscription = (hotel: any) => {
  const status = hotel.subscription?.status ?? (hotel.isActive ? 'active' : 'suspended');
  return {
    plan: hotel.subscription?.plan ?? (hotel.settings as { plan?: string } | undefined)?.plan ?? 'starter',
    status,
    billingType: hotel.subscription?.billingType ?? (status === 'trial' ? 'trial' : 'paid'),
    renewalDate: hotel.subscription?.renewalDate,
  };
};

const mapHotel = async (hotel: any, metrics?: HotelMetrics) => {
  const hotelId = String(hotel._id);
  const [owner, totalStaff, totalRooms, activeBookings] = metrics
    ? [
        metrics.owners?.get(hotelId),
        metrics.staff?.get(hotelId) ?? 0,
        metrics.rooms?.get(hotelId) ?? 0,
        metrics.activeBookings?.get(hotelId) ?? 0,
      ]
    : await Promise.all([
        getHotelOwner(hotel._id),
        HotelStaff.countDocuments({ hotelId: hotel._id, ...activeFilter, isActive: true }),
        Room.countDocuments({ hotelId: hotel._id, ...activeFilter }),
        Booking.countDocuments({ hotelId: hotel._id, ...activeFilter, status: { $in: ['reserved', 'pending', 'confirmed', 'checked_in'] } }),
      ]);

  const subscription = getSubscription(hotel);
  return {
    id: String(hotel._id),
    logo: hotel.settings?.logo,
    name: hotel.name,
    slug: hotel.slug,
    owner: owner?.name ?? 'Owner not assigned',
    ownerEmail: owner?.email,
    ownerPhone: owner?.phone,
    email: hotel.email,
    phone: hotel.phone,
    city: hotel.address?.city,
    state: hotel.address?.state,
    country: hotel.address?.country,
    timezone: hotel.settings?.timezone ?? 'Asia/Kolkata',
    currency: hotel.settings?.currency ?? 'INR',
    plan: subscription.plan,
    billingType: subscription.billingType,
    subscriptionStatus: subscription.status,
    renewalDate: subscription.renewalDate,
    createdAt: hotel.createdAt,
    totalStaff,
    totalRooms,
    currentOccupancy: totalRooms > 0 ? Math.round((activeBookings / totalRooms) * 100) : 0,
    healthScore: hotel.platformMetadata?.healthScore ?? 82,
    lastLoginAt: owner?.lastLoginAt,
    isActive: hotel.isActive,
    status: hotel.isActive ? subscription.status : 'suspended',
  };
};

export const getPlatformDashboard = async () => {
  const start = monthStart();
  const [totalHotels, activeHotels, inactiveHotels, totalUsers, activeUsers, platformRevenue, monthlyHotels, auditLogs] =
    await Promise.all([
      Hotel.countDocuments(activeFilter),
      Hotel.countDocuments({ ...activeFilter, isActive: true }),
      Hotel.countDocuments({ ...activeFilter, isActive: false }),
      User.countDocuments(activeFilter),
      User.countDocuments({ ...activeFilter, isActive: true }),
      Payment.aggregate([
        { $match: { ...activeFilter, status: { $in: ['paid', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Hotel.countDocuments({ ...activeFilter, createdAt: { $gte: start } }),
      AuditLog.find({}).sort({ createdAt: -1 }).limit(8).populate('userId', 'name email role').populate('hotelId', 'name').lean(),
    ]);

  const trend = await Promise.all(
    previousMonths(6).map(async ({ label, from, to }) => ({
      label,
      hotels: await Hotel.countDocuments({ ...activeFilter, createdAt: { $gte: from, $lt: to } }),
      users: await User.countDocuments({ ...activeFilter, createdAt: { $gte: from, $lt: to } }),
      subscriptions: await Hotel.countDocuments({ ...activeFilter, isActive: true, createdAt: { $lt: to } }),
    }))
  );

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      totalHotels,
      activeHotels,
      inactiveHotels,
      trialHotels: 0,
      expiredHotels: inactiveHotels,
      totalUsers,
      activeUsers,
      platformRevenue: platformRevenue[0]?.total ?? 0,
      monthlySignups: monthlyHotels,
      newHotelsThisMonth: monthlyHotels,
      activeSessions: activeUsers,
      storageUsage: 'Not configured',
    },
    health: {
      api: 'healthy',
      queue: process.env.ENABLE_WORKERS === 'true' ? 'enabled' : 'not_configured',
      backgroundJobs: process.env.ENABLE_WORKERS === 'true' ? 'running' : 'not_configured',
      email: process.env.SMTP_HOST ? 'configured' : 'not_configured',
      whatsapp: config.whatsapp.accessToken ? 'configured' : 'not_configured',
    },
    charts: {
      hotelGrowth: trend.map((item) => ({ label: item.label, value: item.hotels })),
      userGrowth: trend.map((item) => ({ label: item.label, value: item.users })),
      subscriptionGrowth: trend.map((item) => ({ label: item.label, value: item.subscriptions })),
      platformUsage: trend.map((item) => ({ label: item.label, value: item.hotels + item.users })),
      apiRequests: trend.map((item) => ({ label: item.label, value: 0 })),
      activeHotels: trend.map((item) => ({ label: item.label, value: item.subscriptions })),
    },
    recentActivities: auditLogs.map((log: any) => ({
      id: String(log._id),
      action: log.action,
      entity: log.entity,
      actor: log.userId?.name ?? 'System',
      hotel: log.hotelId?.name,
      createdAt: log.createdAt,
    })),
  };
};

export const listPlatformHotels = async (query: PlatformHotelListQuery) => {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 10));
  const filter: Record<string, unknown> = { ...activeFilter };

  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'inactive' || query.status === 'suspended') filter.isActive = false;
  if (query.status === 'trial' || query.status === 'expired') filter['subscription.status'] = query.status;
  if (query.subscriptionStatus) filter['subscription.status'] = query.subscriptionStatus;
  if (query.billingType) filter['subscription.billingType'] = query.billingType;
  if (query.plan) filter['subscription.plan'] = query.plan;
  if (query.city) filter['address.city'] = { $regex: query.city, $options: 'i' };
  if (query.country) filter['address.country'] = { $regex: query.country, $options: 'i' };
  if (query.createdFrom || query.createdTo) {
    filter.createdAt = {
      ...(query.createdFrom ? { $gte: query.createdFrom } : {}),
      ...(query.createdTo ? { $lte: query.createdTo } : {}),
    };
  }
  if (query.renewalFrom || query.renewalTo) {
    filter['subscription.renewalDate'] = {
      ...(query.renewalFrom ? { $gte: query.renewalFrom } : {}),
      ...(query.renewalTo ? { $lte: query.renewalTo } : {}),
    };
  }
  if (query.search) {
    const ownerMatches = await User.find({
      role: 'hotel_owner',
      ...activeFilter,
      $or: ['name', 'email', 'phone'].map((field) => ({ [field]: { $regex: query.search, $options: 'i' } })),
    }).select('hotelId').lean();
    filter.$or = ['name', 'email', 'phone', 'slug', 'address.city', 'address.country'].map((field) => ({
      [field]: { $regex: query.search, $options: 'i' },
    })).concat(ownerMatches.map((owner: any) => ({ _id: owner.hotelId })));
  }

  const sortMap: Record<string, { field: string; order: 1 | -1 }> = {
    newest: { field: 'createdAt', order: -1 },
    oldest: { field: 'createdAt', order: 1 },
    name: { field: 'name', order: 1 },
    renewal: { field: 'subscription.renewalDate', order: 1 },
    hotels_count: { field: 'createdAt', order: -1 },
  };
  const preset = query.sortPreset ? sortMap[query.sortPreset] : undefined;
  const sortBy = preset?.field || query.sortBy || 'createdAt';
  const sortOrder = preset?.order || (query.sortOrder === 'asc' ? 1 : -1);
  const [hotels, total] = await Promise.all([
    Hotel.find(filter).sort({ [sortBy]: sortOrder }).skip((page - 1) * limit).limit(limit).lean(),
    Hotel.countDocuments(filter),
  ]);
  const hotelIds = hotels.map((hotel: any) => hotel._id as Types.ObjectId);
  const metrics = await getHotelMetrics(hotelIds);

  return {
    data: await Promise.all(hotels.map((hotel) => mapHotel(hotel, metrics))),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getPlatformHotel = async (id: string) => {
  const hotel = await Hotel.findOne({ _id: id, ...activeFilter }).lean();
  if (!hotel) throw new NotFoundError('Hotel not found');
  const [summary, users, roomsSummary, auditHistory, integrations] = await Promise.all([
    mapHotel(hotel),
    User.find({ hotelId: hotel._id, ...activeFilter }).select('name email phone role isActive lastLoginAt createdAt').sort({ createdAt: -1 }).limit(20).lean(),
    Room.aggregate([
      { $match: { hotelId: hotel._id, ...activeFilter } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    AuditLog.find({ $or: [{ hotelId: hotel._id }, { entity: 'Hotel', entityId: hotel._id }] })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'name email role')
      .lean(),
    Promise.resolve([
      { name: 'WhatsApp', status: config.whatsapp.accessToken ? 'configured' : 'not_configured' },
      { name: 'Storage', status: config.aws.s3Bucket || config.cloudinary.cloudName ? 'configured' : 'not_configured' },
      { name: 'Payments', status: config.razorpay.keyId ? 'configured' : 'not_configured' },
    ]),
  ]);

  return {
    ...summary,
    businessInfo: {
      slug: hotel.slug,
      amenities: hotel.amenities ?? [],
      policies: hotel.policies ?? {},
      brandName: hotel.platformMetadata?.brandName,
      chainId: hotel.platformMetadata?.chainId,
      groupId: hotel.platformMetadata?.groupId,
      franchiseId: hotel.platformMetadata?.franchiseId,
      whiteLabelDomain: hotel.platformMetadata?.whiteLabelDomain,
      marketplaceEnabled: hotel.platformMetadata?.marketplaceEnabled ?? false,
    },
    users,
    roomsSummary,
    activityTimeline: auditHistory.map((log: any) => ({
      id: String(log._id),
      action: log.action,
      entity: log.entity,
      actor: log.userId?.name ?? 'System',
      createdAt: log.createdAt,
      changes: log.changes,
    })),
    integrations,
    auditHistory,
    futureReady: {
      bookings: 'reserved',
      revenue: 'reserved',
      analytics: 'reserved',
      reviews: 'reserved',
      crm: 'reserved',
    },
  };
};

export const createPlatformHotel = async (input: PlatformHotelCreateInput, viewer: Viewer) => {
  const ownerExists = await User.findOne({ email: input.ownerEmail.toLowerCase(), ...activeFilter });
  if (ownerExists) throw new ConflictError('Owner email already exists');

  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  const existingSlug = await Hotel.findOne({ slug, ...activeFilter });
  if (existingSlug) throw new ConflictError('Hotel slug already exists');

  const ownerPassword = await hashPassword('Owner@123456');
  const owner = await User.create({
    name: input.ownerName,
    email: input.ownerEmail.toLowerCase(),
    phone: input.ownerPhone,
    password: ownerPassword,
    role: 'hotel_owner',
    isActive: true,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });

  const hotel = await Hotel.create({
    name: input.name,
    slug,
    email: input.email || input.ownerEmail,
    phone: input.phone || input.ownerPhone || 'Not provided',
    address: {
      city: input.city,
      state: input.state,
      country: input.country,
    },
    settings: {
      currency: input.currency ?? 'INR',
      timezone: input.timezone ?? 'Asia/Kolkata',
      logo: input.logo,
    },
    subscription: {
      plan: input.plan ?? 'starter',
      status: input.subscriptionStatus ?? 'trial',
      billingType: input.billingType ?? (input.subscriptionStatus === 'trial' ? 'trial' : 'paid'),
      renewalDate: input.renewalDate,
    },
    platformMetadata: {
      healthScore: input.healthScore ?? 82,
    },
    ownerId: owner._id,
    isActive: input.isActive ?? !['inactive', 'suspended'].includes(input.subscriptionStatus ?? 'trial'),
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });

  owner.hotelId = hotel._id as Types.ObjectId;
  await hotel.save();
  await owner.save();
  await logPlatformActivity(viewer, 'platform.hotel_created', 'Hotel', hotel._id, { hotelName: hotel.name });
  return mapHotel(hotel.toObject());
};

export const updatePlatformHotel = async (id: string, input: PlatformHotelUpdateInput, viewer: Viewer) => {
  const hotel = await Hotel.findOne({ _id: id, ...activeFilter });
  if (!hotel) throw new NotFoundError('Hotel not found');

  if (input.name !== undefined) hotel.name = input.name;
  if (input.slug !== undefined) hotel.slug = slugify(input.slug);
  if (input.email !== undefined) hotel.email = input.email;
  if (input.phone !== undefined) hotel.phone = input.phone;
  if (input.city !== undefined) hotel.address.city = input.city;
  if (input.state !== undefined) hotel.address.state = input.state;
  if (input.country !== undefined) hotel.address.country = input.country;
  if (input.timezone !== undefined) hotel.settings.timezone = input.timezone;
  if (input.currency !== undefined) hotel.settings.currency = input.currency;
  if (input.logo !== undefined) hotel.settings.logo = input.logo;
  if (!hotel.subscription) {
    hotel.subscription = { plan: 'starter', status: 'trial', billingType: 'trial' };
  }
  if (input.plan !== undefined) hotel.subscription.plan = input.plan;
  if (input.subscriptionStatus !== undefined) hotel.subscription.status = input.subscriptionStatus;
  if (input.billingType !== undefined) hotel.subscription.billingType = input.billingType;
  if (input.renewalDate !== undefined) hotel.subscription.renewalDate = input.renewalDate;
  if (!hotel.platformMetadata) hotel.platformMetadata = {};
  if (input.healthScore !== undefined) hotel.platformMetadata.healthScore = input.healthScore;
  if (input.isActive !== undefined) hotel.isActive = input.isActive;
  (hotel as unknown as { updatedBy?: Types.ObjectId }).updatedBy = new Types.ObjectId(viewer.userId);
  await hotel.save();

  const owner = await User.findOne({ hotelId: hotel._id, role: 'hotel_owner', ...activeFilter });
  if (owner) {
    if (input.ownerName !== undefined) owner.name = input.ownerName;
    if (input.ownerPhone !== undefined) owner.phone = input.ownerPhone;
    await owner.save();
  }

  await logPlatformActivity(viewer, input.plan || input.subscriptionStatus ? 'platform.subscription_changed' : 'platform.hotel_updated', 'Hotel', hotel._id, {
    hotelName: hotel.name,
  });
  return mapHotel(hotel.toObject());
};

export const updatePlatformHotelStatus = async (id: string, input: PlatformHotelStatusInput, viewer: Viewer) => {
  const hotel = await Hotel.findOne({ _id: id, ...activeFilter });
  if (!hotel) throw new NotFoundError('Hotel not found');
  hotel.isActive = input.isActive;
  if (!hotel.subscription) {
    hotel.subscription = { plan: 'starter', status: 'trial', billingType: 'trial' };
  }
  hotel.subscription.status = input.isActive ? (hotel.subscription.status === 'suspended' ? 'active' : hotel.subscription.status) : 'suspended';
  (hotel as unknown as { updatedBy?: Types.ObjectId }).updatedBy = new Types.ObjectId(viewer.userId);
  await hotel.save();
  await logPlatformActivity(viewer, input.isActive ? 'platform.hotel_activated' : 'platform.hotel_suspended', 'Hotel', hotel._id, {
    reason: input.reason,
  });
  return mapHotel(hotel.toObject());
};

export const deletePlatformHotel = async (id: string, viewer: Viewer) => {
  const hotel = await Hotel.findOne({ _id: id, ...activeFilter });
  if (!hotel) throw new NotFoundError('Hotel not found');
  hotel.isDeleted = true;
  (hotel as unknown as { deletedAt?: Date; deletedBy?: Types.ObjectId }).deletedAt = new Date();
  (hotel as unknown as { deletedAt?: Date; deletedBy?: Types.ObjectId }).deletedBy = new Types.ObjectId(viewer.userId);
  await hotel.save();
  await logPlatformActivity(viewer, 'platform.hotel_deleted', 'Hotel', hotel._id, { hotelName: hotel.name });
};

export const bulkPlatformHotelAction = async (input: PlatformHotelBulkActionInput, viewer: Viewer) => {
  const ids = input.ids.map((id) => new Types.ObjectId(id));
  const hotels = await Hotel.find({ _id: { $in: ids }, ...activeFilter });
  if (!hotels.length) throw new NotFoundError('No hotels found');

  if (input.action === 'export') {
    const rows = await Promise.all(hotels.map((hotel) => mapHotel(hotel.toObject())));
    await logPlatformActivity(viewer, 'platform.hotels_bulk_exported', 'Hotel', undefined, { count: rows.length });
    return { action: input.action, affected: rows.length, rows };
  }

  await Promise.all(
    hotels.map(async (hotel) => {
      if (input.action === 'activate') {
        hotel.isActive = true;
        if (!hotel.subscription) hotel.subscription = { plan: 'starter', status: 'active', billingType: 'paid' };
        hotel.subscription.status = hotel.subscription.status === 'suspended' ? 'active' : hotel.subscription.status;
      }
      if (input.action === 'suspend') {
        hotel.isActive = false;
        if (!hotel.subscription) hotel.subscription = { plan: 'starter', status: 'suspended', billingType: 'paid' };
        hotel.subscription.status = 'suspended';
      }
      if (input.action === 'delete') {
        hotel.isDeleted = true;
        (hotel as unknown as { deletedAt?: Date; deletedBy?: Types.ObjectId }).deletedAt = new Date();
        (hotel as unknown as { deletedAt?: Date; deletedBy?: Types.ObjectId }).deletedBy = new Types.ObjectId(viewer.userId);
      }
      if (input.action === 'assign_plan') {
        if (!input.plan) throw new ValidationError('Plan is required for bulk assign');
        if (!hotel.subscription) hotel.subscription = { plan: input.plan, status: 'active', billingType: 'paid' };
        hotel.subscription.plan = input.plan;
        hotel.subscription.billingType = input.plan === 'starter' ? 'trial' : 'paid';
      }
      (hotel as unknown as { updatedBy?: Types.ObjectId }).updatedBy = new Types.ObjectId(viewer.userId);
      await hotel.save();
    })
  );

  await logPlatformActivity(viewer, `platform.hotels_bulk_${input.action}`, 'Hotel', undefined, {
    hotelIds: input.ids,
    plan: input.plan,
    reason: input.reason,
  });

  return { action: input.action, affected: hotels.length };
};

export const resetHotelOwnerPassword = async (hotelId: string, input: PlatformHotelResetPasswordInput, viewer: Viewer) => {
  const owner = await User.findOne({ hotelId, role: 'hotel_owner', ...activeFilter }).select('+password');
  if (!owner) throw new NotFoundError('Hotel owner not found');
  const temporaryPassword = input.temporaryPassword ?? `Owner@${Math.random().toString(36).slice(2, 8)}1`;
  owner.password = await hashPassword(temporaryPassword);
  await owner.save();
  await logPlatformActivity(viewer, 'platform.owner_password_reset', 'Hotel', hotelId, { ownerId: owner._id.toString() });
  return { temporaryPassword };
};

export const sendHotelOwnerEmail = async (hotelId: string, input: PlatformHotelSendEmailInput, viewer: Viewer) => {
  const owner = await User.findOne({ hotelId, role: 'hotel_owner', ...activeFilter });
  if (!owner) throw new NotFoundError('Hotel owner not found');
  await logPlatformActivity(viewer, 'platform.owner_email_queued', 'Hotel', hotelId, {
    ownerId: owner._id.toString(),
    subject: input.subject,
  });
  return { queued: true, recipient: owner.email };
};

export const exportPlatformHotel = async (hotelId: string, viewer: Viewer) => {
  const hotel = await getPlatformHotel(hotelId);
  await logPlatformActivity(viewer, 'platform.hotel_exported', 'Hotel', hotelId);
  return hotel;
};

const planCode = (planName: string): 'starter' | 'professional' | 'enterprise' | 'growth' =>
  planName === 'Enterprise' ? 'enterprise' : planName === 'Pro' ? 'professional' : planName === 'Custom' ? 'growth' : 'starter';

const mapPlan = (plan: any) => ({
  id: String(plan._id),
  name: plan.name,
  description: plan.description,
  priceMonthly: plan.priceMonthly,
  priceYearly: plan.priceYearly,
  currency: plan.currency,
  trialDays: plan.trialDays,
  maxHotelsAllowed: plan.maxHotelsAllowed,
  maxStaffAllowed: plan.maxStaffAllowed,
  maxRoomsAllowed: plan.maxRoomsAllowed,
  features: plan.features,
  isActive: plan.isActive,
  isDefault: plan.isDefault,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
});

export const listPlatformPlans = async (query: PlatformPlanListQuery) => {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 10));
  const filter: Record<string, unknown> = { ...activeFilter };
  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'inactive') filter.isActive = false;
  if (query.currency) filter.currency = query.currency.toUpperCase();
  if (query.search) {
    filter.$or = ['name', 'description', 'currency'].map((field) => ({ [field]: { $regex: query.search, $options: 'i' } }));
  }

  const [plans, total] = await Promise.all([
    Plan.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Plan.countDocuments(filter),
  ]);

  return {
    data: plans.map(mapPlan),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

export const createPlatformPlan = async (input: PlatformPlanCreateInput, viewer: Viewer) => {
  if (input.isDefault) {
    await Plan.updateMany({ isDefault: true }, { isDefault: false });
  }
  const plan = await Plan.create({ ...input, currency: input.currency.toUpperCase(), createdBy: viewer.userId, updatedBy: viewer.userId });
  await logPlatformActivity(viewer, 'platform.plan_created', 'Plan', plan._id, { newValue: mapPlan(plan.toObject()) });
  return mapPlan(plan.toObject());
};

export const updatePlatformPlan = async (id: string, input: PlatformPlanUpdateInput, viewer: Viewer) => {
  const plan = await Plan.findOne({ _id: id, ...activeFilter });
  if (!plan) throw new NotFoundError('Plan not found');
  const oldValue = mapPlan(plan.toObject());
  if (input.isDefault) await Plan.updateMany({ _id: { $ne: plan._id }, isDefault: true }, { isDefault: false });
  Object.assign(plan, { ...input, currency: input.currency?.toUpperCase() ?? plan.currency, updatedBy: viewer.userId });
  await plan.save();
  await logPlatformActivity(viewer, 'platform.plan_updated', 'Plan', plan._id, { oldValue, newValue: mapPlan(plan.toObject()) });
  return mapPlan(plan.toObject());
};

export const duplicatePlatformPlan = async (id: string, viewer: Viewer) => {
  const plan = await Plan.findOne({ _id: id, ...activeFilter }).lean();
  if (!plan) throw new NotFoundError('Plan not found');
  const copy = await Plan.create({
    name: 'Custom',
    description: `${plan.description ?? plan.name} (Copy)`,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    currency: plan.currency,
    trialDays: plan.trialDays,
    maxHotelsAllowed: plan.maxHotelsAllowed,
    maxStaffAllowed: plan.maxStaffAllowed,
    maxRoomsAllowed: plan.maxRoomsAllowed,
    features: plan.features,
    isActive: false,
    isDefault: false,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  await logPlatformActivity(viewer, 'platform.plan_duplicated', 'Plan', copy._id, { sourcePlanId: id });
  return mapPlan(copy.toObject());
};

export const updatePlatformPlanStatus = async (id: string, input: PlatformPlanStatusInput, viewer: Viewer) => {
  const plan = await Plan.findOne({ _id: id, ...activeFilter });
  if (!plan) throw new NotFoundError('Plan not found');
  const oldValue = { isActive: plan.isActive };
  plan.isActive = input.isActive;
  await plan.save();
  await logPlatformActivity(viewer, input.isActive ? 'platform.plan_activated' : 'platform.plan_deactivated', 'Plan', plan._id, {
    oldValue,
    newValue: { isActive: plan.isActive },
  });
  return mapPlan(plan.toObject());
};

export const deletePlatformPlan = async (id: string, viewer: Viewer) => {
  const plan = await Plan.findOne({ _id: id, ...activeFilter });
  if (!plan) throw new NotFoundError('Plan not found');
  plan.isDeleted = true;
  plan.deletedAt = new Date();
  plan.deletedBy = new Types.ObjectId(viewer.userId);
  await plan.save();
  await logPlatformActivity(viewer, 'platform.plan_deleted', 'Plan', plan._id, { oldValue: mapPlan(plan.toObject()) });
};

const syncHotelSubscription = async (subscription: any, plan: any) => {
  const hotel = await Hotel.findById(subscription.hotelId);
  if (!hotel) return;
  hotel.subscription = {
    plan: planCode(plan.name),
    status: subscription.status === 'cancelled' ? 'inactive' : subscription.status,
    billingType: subscription.status === 'trial' ? 'trial' : 'paid',
    renewalDate: subscription.renewalDate,
    trialEndsAt: subscription.status === 'trial' ? subscription.endDate : undefined,
  };
  hotel.isActive = !['suspended', 'cancelled', 'expired'].includes(subscription.status);
  await hotel.save();
};

const mapSubscription = (subscription: any) => ({
  id: String(subscription._id),
  hotelId: String(subscription.hotelId?._id ?? subscription.hotelId),
  hotelName: subscription.hotelId?.name ?? 'Unknown hotel',
  ownerEmail: subscription.hotelId?.ownerId?.email,
  planId: String(subscription.planId?._id ?? subscription.planId),
  planName: subscription.planId?.name ?? 'Unknown plan',
  status: subscription.status,
  startDate: subscription.startDate,
  endDate: subscription.endDate,
  renewalDate: subscription.renewalDate,
  autoRenew: subscription.autoRenew,
  billingCycle: subscription.billingCycle,
  usageStats: subscription.usageStats ?? {},
  updatedAt: subscription.updatedAt,
});

export const listPlatformSubscriptions = async (query: PlatformSubscriptionListQuery) => {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 10));
  const filter: Record<string, unknown> = { ...activeFilter };
  if (query.planId) filter.planId = new Types.ObjectId(query.planId);
  if (query.status) filter.status = query.status;
  if (query.billingCycle) filter.billingCycle = query.billingCycle;
  if (query.fromDate || query.toDate) {
    filter.renewalDate = {
      ...(query.fromDate ? { $gte: query.fromDate } : {}),
      ...(query.toDate ? { $lte: query.toDate } : {}),
    };
  }

  if (query.search) {
    const hotels = await Hotel.find({
      ...activeFilter,
      $or: [{ name: { $regex: query.search, $options: 'i' } }, { email: { $regex: query.search, $options: 'i' } }],
    }).select('_id').lean();
    const owners = await User.find({
      ...activeFilter,
      role: 'hotel_owner',
      email: { $regex: query.search, $options: 'i' },
    }).select('hotelId').lean();
    filter.hotelId = { $in: [...hotels.map((hotel: any) => hotel._id), ...owners.map((owner: any) => owner.hotelId)].filter(Boolean) };
  }

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'hotelId', select: 'name email ownerId', populate: { path: 'ownerId', select: 'email name' } })
      .populate('planId', 'name')
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  return {
    data: subscriptions.map(mapSubscription),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

export const assignPlatformSubscription = async (input: PlatformSubscriptionAssignInput, viewer: Viewer) => {
  const [hotel, plan] = await Promise.all([
    Hotel.findOne({ _id: input.hotelId, ...activeFilter }),
    Plan.findOne({ _id: input.planId, ...activeFilter }),
  ]);
  if (!hotel) throw new NotFoundError('Hotel not found');
  if (!plan) throw new NotFoundError('Plan not found');

  const previous = await Subscription.findOne({ hotelId: hotel._id, ...activeFilter });
  if (previous) {
    previous.isDeleted = true;
    previous.deletedAt = new Date();
    previous.deletedBy = new Types.ObjectId(viewer.userId);
    await previous.save();
  }

  const subscription = await Subscription.create({
    hotelId: hotel._id,
    planId: plan._id,
    status: input.status,
    startDate: input.startDate ?? new Date(),
    endDate: input.endDate,
    renewalDate: input.renewalDate,
    autoRenew: input.autoRenew,
    billingCycle: input.billingCycle,
    usageStats: {},
    history: [{ action: 'created', actorId: new Types.ObjectId(viewer.userId), newValue: input }],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  await syncHotelSubscription(subscription, plan);
  await logPlatformActivity(viewer, 'platform.subscription_created', 'Hotel', hotel._id, { newValue: mapSubscription({ ...subscription.toObject(), hotelId: hotel, planId: plan }) });
  return mapSubscription({ ...subscription.toObject(), hotelId: hotel, planId: plan });
};

export const updatePlatformSubscriptionAction = async (id: string, input: PlatformSubscriptionActionInput, viewer: Viewer) => {
  const subscription = await Subscription.findOne({ _id: id, ...activeFilter });
  if (!subscription) throw new NotFoundError('Subscription not found');
  const oldValue = {
    planId: subscription.planId.toString(),
    status: subscription.status,
    renewalDate: subscription.renewalDate,
    endDate: subscription.endDate,
    autoRenew: subscription.autoRenew,
  };

  if (input.action === 'change_plan') {
    if (!input.planId) throw new ValidationError('Plan is required');
    subscription.planId = new Types.ObjectId(input.planId);
  }
  if (input.action === 'extend_trial') {
    subscription.status = 'trial';
    const base = subscription.endDate ?? new Date();
    subscription.endDate = new Date(base.getTime() + (input.trialDays ?? 7) * 24 * 60 * 60 * 1000);
    subscription.renewalDate = subscription.endDate;
  }
  if (input.action === 'suspend') subscription.status = 'suspended';
  if (input.action === 'reactivate') subscription.status = 'active';
  if (input.action === 'cancel') {
    subscription.status = 'cancelled';
    subscription.endDate = input.endDate ?? new Date();
  }
  if (input.action === 'force_expire') {
    subscription.status = 'expired';
    subscription.endDate = new Date();
  }
  if (input.action === 'toggle_auto_renew') subscription.autoRenew = input.autoRenew ?? !subscription.autoRenew;
  if (input.renewalDate) subscription.renewalDate = input.renewalDate;

  subscription.history.push({
    action: input.action,
    actorId: new Types.ObjectId(viewer.userId),
    oldValue,
    newValue: input,
    createdAt: new Date(),
  });
  await subscription.save();
  const plan = await Plan.findById(subscription.planId);
  if (plan) await syncHotelSubscription(subscription, plan);
  await logPlatformActivity(viewer, `platform.subscription_${input.action}`, 'Hotel', subscription.hotelId, {
    oldValue,
    newValue: input,
    reason: input.reason,
  });
  const populated = await Subscription.findById(subscription._id)
    .populate({ path: 'hotelId', select: 'name email ownerId', populate: { path: 'ownerId', select: 'email name' } })
    .populate('planId', 'name')
    .lean();
  return mapSubscription(populated);
};

const nextInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const latest = await Invoice.findOne({ invoiceNumber: { $regex: `^INV-${year}-` } }).sort({ createdAt: -1 }).select('invoiceNumber').lean();
  const sequence = latest?.invoiceNumber ? Number(latest.invoiceNumber.split('-').pop()) + 1 : 1;
  return `INV-${year}-${String(sequence).padStart(5, '0')}`;
};

const mapInvoice = (invoice: any) => ({
  id: String(invoice._id),
  invoiceId: invoice.invoiceId,
  invoiceNumber: invoice.invoiceNumber,
  hotelId: String(invoice.hotelId?._id ?? invoice.hotelId),
  hotelName: invoice.hotelId?.name ?? 'Unknown hotel',
  ownerEmail: invoice.hotelId?.ownerId?.email,
  subscriptionId: String(invoice.subscriptionId?._id ?? invoice.subscriptionId),
  planId: String(invoice.planId?._id ?? invoice.planId),
  planName: invoice.planId?.name ?? 'Unknown plan',
  billingCycle: invoice.billingCycle,
  status: invoice.status,
  amountSubtotal: invoice.amountSubtotal,
  taxAmount: invoice.taxAmount,
  totalAmount: invoice.totalAmount,
  currency: invoice.currency,
  issuedDate: invoice.issuedDate,
  dueDate: invoice.dueDate,
  paidDate: invoice.paidDate,
  paymentMethod: invoice.paymentMethod,
  paymentStatus: invoice.paymentStatus,
  transactionId: invoice.transactionId,
  gateway: invoice.gateway,
  paymentDate: invoice.paymentDate,
  failureReason: invoice.failureReason,
  retryAttempts: invoice.retryAttempts,
  items: invoice.items ?? [],
  refunds: invoice.refunds ?? [],
  history: invoice.history ?? [],
  createdAt: invoice.createdAt,
  updatedAt: invoice.updatedAt,
});

export const getPlatformBillingSummary = async () => {
  const [summary] = await Invoice.aggregate([
    { $match: activeFilter },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalBilled: { $sum: '$totalAmount' },
        paidAmount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0] } },
        overdueAmount: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$totalAmount', 0] } },
        failedAmount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, '$totalAmount', 0] } },
      },
    },
  ]);
  const [draft, issued, paid, overdue, failed, cancelled] = await Promise.all(
    ['draft', 'issued', 'paid', 'overdue', 'failed', 'cancelled'].map((status) => Invoice.countDocuments({ ...activeFilter, status }))
  );
  return {
    totalInvoices: summary?.totalInvoices ?? 0,
    totalBilled: summary?.totalBilled ?? 0,
    paidAmount: summary?.paidAmount ?? 0,
    overdueAmount: summary?.overdueAmount ?? 0,
    failedAmount: summary?.failedAmount ?? 0,
    statusCounts: { draft, issued, paid, overdue, failed, cancelled },
  };
};

export const listPlatformInvoices = async (query: PlatformInvoiceListQuery) => {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 10));
  const filter: Record<string, unknown> = { ...activeFilter };
  if (query.status) filter.status = query.status;
  if (query.planId) filter.planId = new Types.ObjectId(query.planId);
  if (query.hotelId) filter.hotelId = new Types.ObjectId(query.hotelId);
  if (query.fromDate || query.toDate) {
    filter.issuedDate = { ...(query.fromDate ? { $gte: query.fromDate } : {}), ...(query.toDate ? { $lte: query.toDate } : {}) };
  }
  if (query.minAmount || query.maxAmount) {
    filter.totalAmount = { ...(query.minAmount ? { $gte: query.minAmount } : {}), ...(query.maxAmount ? { $lte: query.maxAmount } : {}) };
  }
  if (query.search) {
    const hotels = await Hotel.find({
      ...activeFilter,
      $or: [{ name: { $regex: query.search, $options: 'i' } }, { email: { $regex: query.search, $options: 'i' } }],
    }).select('_id').lean();
    const owners = await User.find({ ...activeFilter, role: 'hotel_owner', email: { $regex: query.search, $options: 'i' } }).select('hotelId').lean();
    filter.$or = [
      { invoiceNumber: { $regex: query.search, $options: 'i' } },
      { hotelId: { $in: [...hotels.map((hotel: any) => hotel._id), ...owners.map((owner: any) => owner.hotelId)].filter(Boolean) } },
    ];
  }

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ issuedDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'hotelId', select: 'name email ownerId', populate: { path: 'ownerId', select: 'email name' } })
      .populate('planId', 'name')
      .populate('subscriptionId', 'billingCycle status renewalDate')
      .lean(),
    Invoice.countDocuments(filter),
  ]);
  return { data: invoices.map(mapInvoice), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

export const getPlatformInvoice = async (id: string) => {
  const invoice = await Invoice.findOne({ _id: id, ...activeFilter })
    .populate({ path: 'hotelId', select: 'name email phone address ownerId', populate: { path: 'ownerId', select: 'name email phone' } })
    .populate('planId', 'name priceMonthly priceYearly currency')
    .populate('subscriptionId', 'status startDate endDate renewalDate autoRenew billingCycle')
    .lean();
  if (!invoice) throw new NotFoundError('Invoice not found');
  const auditHistory = await AuditLog.find({ entity: 'Invoice', entityId: invoice._id }).sort({ createdAt: -1 }).limit(20).populate('userId', 'name email role').lean();
  return {
    ...mapInvoice(invoice),
    hotel: invoice.hotelId,
    subscription: invoice.subscriptionId,
    plan: invoice.planId,
    taxBreakdown: [{ label: 'Platform GST/Tax', amount: invoice.taxAmount }],
    paymentTimeline: [
      { label: 'Invoice created', date: invoice.createdAt, status: 'completed' },
      { label: invoice.status === 'paid' ? 'Payment received' : 'Payment pending', date: invoice.paidDate ?? invoice.dueDate, status: invoice.paymentStatus },
    ],
    billingHistory: auditHistory.map((log: any) => ({
      id: String(log._id),
      actor: log.userId?.name ?? 'System',
      action: log.action,
      createdAt: log.createdAt,
      changes: log.changes,
    })),
  };
};

export const generatePlatformInvoice = async (input: PlatformInvoiceGenerateInput, viewer: Viewer) => {
  const subscription = await Subscription.findOne({ _id: input.subscriptionId, ...activeFilter }).populate('hotelId').populate('planId');
  if (!subscription) throw new NotFoundError('Subscription not found');
  const plan: any = subscription.planId;
  const hotel: any = subscription.hotelId;
  const issuedDate = input.issuedDate ?? new Date();
  const dueDate = input.dueDate ?? new Date(issuedDate.getTime() + 15 * 24 * 60 * 60 * 1000);
  const unitPrice = subscription.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  const amountSubtotal = unitPrice;
  const taxAmount = Math.round((amountSubtotal * input.taxRate) / 100);
  const invoice = await Invoice.create({
    invoiceId: new Types.ObjectId().toString(),
    invoiceNumber: await nextInvoiceNumber(),
    hotelId: hotel._id,
    subscriptionId: subscription._id,
    planId: plan._id,
    billingCycle: subscription.billingCycle,
    status: input.status,
    amountSubtotal,
    taxAmount,
    totalAmount: amountSubtotal + taxAmount,
    currency: plan.currency,
    issuedDate,
    dueDate,
    paymentStatus: 'pending',
    gateway: 'none',
    retryAttempts: 0,
    items: [{ description: `${plan.name} plan - ${subscription.billingCycle} subscription`, quantity: 1, unitPrice, totalPrice: unitPrice }],
    refunds: [],
    history: [{ action: 'created', actorId: new Types.ObjectId(viewer.userId), newValue: input }],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });
  await logPlatformActivity(viewer, 'platform.invoice_created', 'Invoice', invoice._id, { newValue: mapInvoice({ ...invoice.toObject(), hotelId: hotel, planId: plan, subscriptionId: subscription }) });
  return mapInvoice({ ...invoice.toObject(), hotelId: hotel, planId: plan, subscriptionId: subscription });
};

export const runPlatformInvoiceAction = async (id: string, input: PlatformInvoiceActionInput, viewer: Viewer) => {
  const invoice = await Invoice.findOne({ _id: id, ...activeFilter });
  if (!invoice) throw new NotFoundError('Invoice not found');
  const oldValue = { status: invoice.status, paymentStatus: invoice.paymentStatus, totalAmount: invoice.totalAmount };

  if (input.action === 'mark_paid') {
    invoice.status = 'paid';
    invoice.paymentStatus = 'paid';
    invoice.paidDate = new Date();
    invoice.paymentDate = invoice.paidDate;
    invoice.paymentMethod = input.paymentMethod ?? 'manual';
    invoice.gateway = input.gateway ?? 'manual';
    invoice.transactionId = input.transactionId;
  }
  if (input.action === 'mark_failed') {
    invoice.status = 'failed';
    invoice.paymentStatus = 'failed';
    invoice.failureReason = input.failureReason;
    invoice.retryAttempts += 1;
  }
  if (input.action === 'mark_overdue') invoice.status = 'overdue';
  if (input.action === 'cancel') {
    invoice.status = 'cancelled';
    invoice.paymentStatus = 'cancelled';
  }
  if (input.action === 'regenerate') {
    invoice.status = 'issued';
    invoice.issuedDate = new Date();
    invoice.dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  }
  if (input.action === 'send_email' || input.action === 'export') {
    // Stub-only action for future provider/export services.
  }

  invoice.history.push({ action: input.action, actorId: new Types.ObjectId(viewer.userId), oldValue, newValue: input, createdAt: new Date() });
  await invoice.save();
  await logPlatformActivity(viewer, `platform.invoice_${input.action}`, 'Invoice', invoice._id, { oldValue, newValue: input, reason: input.reason });
  const populated = await Invoice.findById(invoice._id)
    .populate({ path: 'hotelId', select: 'name email ownerId', populate: { path: 'ownerId', select: 'email name' } })
    .populate('planId', 'name')
    .populate('subscriptionId', 'billingCycle status renewalDate')
    .lean();
  return mapInvoice(populated);
};

const trendBuckets = (fromDate?: Date, toDate?: Date) => {
  if (fromDate && toDate) {
    const buckets: Array<{ label: string; from: Date; to: Date }> = [];
    const cursor = new Date(fromDate);
    while (cursor <= toDate && buckets.length < 12) {
      const from = new Date(cursor);
      const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      buckets.push({ label: from.toLocaleString('en-US', { month: 'short' }), from, to });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }
  return previousMonths(6);
};

const objectFromAggregation = (rows: Array<{ _id: string; value?: number; count?: number }>) =>
  Object.fromEntries(rows.map((row) => [row._id || 'unknown', row.value ?? row.count ?? 0]));

export const getPlatformAnalytics = async (query: PlatformAnalyticsQuery) => {
  const dateFilter = query.fromDate || query.toDate
    ? { issuedDate: { ...(query.fromDate ? { $gte: query.fromDate } : {}), ...(query.toDate ? { $lte: query.toDate } : {}) } }
    : {};
  const hotelFilter: Record<string, unknown> = { ...activeFilter };
  if (query.country) hotelFilter['address.country'] = { $regex: query.country, $options: 'i' };
  if (query.status === 'inactive') hotelFilter.isActive = false;
  if (query.status && query.status !== 'inactive') hotelFilter['subscription.status'] = query.status;

  const [hotels, totalHotels, activeHotels, inactiveHotels, trialHotels, paidHotels, suspendedHotels, totalRooms, activeRooms, staffCount, activeUsers] =
    await Promise.all([
      Hotel.find(hotelFilter).select('_id name address subscription settings isActive createdAt').lean(),
      Hotel.countDocuments(activeFilter),
      Hotel.countDocuments({ ...activeFilter, isActive: true }),
      Hotel.countDocuments({ ...activeFilter, isActive: false }),
      Hotel.countDocuments({ ...activeFilter, 'subscription.status': 'trial' }),
      Hotel.countDocuments({ ...activeFilter, 'subscription.billingType': 'paid' }),
      Hotel.countDocuments({ ...activeFilter, 'subscription.status': 'suspended' }),
      Room.countDocuments(activeFilter),
      Room.countDocuments({ ...activeFilter, isBookable: true }),
      HotelStaff.countDocuments({ ...activeFilter, isActive: true }),
      User.countDocuments({ ...activeFilter, isActive: true }),
    ]);

  const scopedHotelIds = hotels.map((hotel: any) => hotel._id);
  const invoiceBase: Record<string, unknown> = { ...activeFilter, ...dateFilter };
  if (scopedHotelIds.length) invoiceBase.hotelId = { $in: scopedHotelIds };
  if (query.planId) invoiceBase.planId = new Types.ObjectId(query.planId);
  if (query.minRevenue || query.maxRevenue) {
    invoiceBase.totalAmount = { ...(query.minRevenue ? { $gte: query.minRevenue } : {}), ...(query.maxRevenue ? { $lte: query.maxRevenue } : {}) };
  }

  const [paidInvoices, totalInvoicesGenerated, totalPaidInvoices, overdueInvoices, revenueByPlanRows, revenueByHotelRows, revenueByCountryRows, planDistributionRows, subscriptions, auditLogs] =
    await Promise.all([
      Invoice.find({ ...invoiceBase, status: 'paid' }).populate('planId', 'name').populate('hotelId', 'name address').lean(),
      Invoice.countDocuments(invoiceBase),
      Invoice.countDocuments({ ...invoiceBase, status: 'paid' }),
      Invoice.countDocuments({ ...invoiceBase, status: 'overdue' }),
      Invoice.aggregate([{ $match: { ...invoiceBase, status: 'paid' } }, { $group: { _id: '$planId', value: { $sum: '$totalAmount' } } }]),
      Invoice.aggregate([{ $match: { ...invoiceBase, status: 'paid' } }, { $group: { _id: '$hotelId', value: { $sum: '$totalAmount' } } }, { $sort: { value: -1 } }, { $limit: 8 }]),
      Invoice.aggregate([
        { $match: { ...invoiceBase, status: 'paid' } },
        { $lookup: { from: 'hotels', localField: 'hotelId', foreignField: '_id', as: 'hotel' } },
        { $unwind: '$hotel' },
        { $group: { _id: '$hotel.address.country', value: { $sum: '$totalAmount' } } },
      ]),
      Subscription.aggregate([{ $match: activeFilter }, { $group: { _id: '$planId', count: { $sum: 1 } } }]),
      Subscription.find({ ...activeFilter, ...(query.planId ? { planId: new Types.ObjectId(query.planId) } : {}) }).populate('planId', 'name').lean(),
      AuditLog.find({}).sort({ createdAt: -1 }).limit(15).populate('userId', 'name email role').populate('hotelId', 'name').lean(),
    ]);

  const revenue = paidInvoices.reduce((sum: number, invoice: any) => sum + (invoice.totalAmount || 0), 0);
  const monthlySubscriptionValue = subscriptions.reduce((sum: number, subscription: any) => {
    const plan = subscription.planId as any;
    const amount = subscription.billingCycle === 'yearly' ? (plan?.priceYearly || 0) / 12 : plan?.priceMonthly || 0;
    return ['active', 'trial'].includes(subscription.status) ? sum + amount : sum;
  }, 0);
  const cancelledSubscriptions = subscriptions.filter((subscription: any) => subscription.status === 'cancelled').length;
  const churnRate = subscriptions.length ? Math.round((cancelledSubscriptions / subscriptions.length) * 100) : 0;

  const buckets = trendBuckets(query.fromDate, query.toDate);
  const revenueTrend = await Promise.all(
    buckets.map(async (bucket) => {
      const [row] = await Invoice.aggregate([
        { $match: { ...invoiceBase, status: 'paid', issuedDate: { $gte: bucket.from, $lt: bucket.to } } },
        { $group: { _id: null, value: { $sum: '$totalAmount' } } },
      ]);
      return { label: bucket.label, value: row?.value ?? 0 };
    })
  );

  const plans = await Plan.find(activeFilter).select('name').lean();
  const planNameById = new Map(plans.map((plan: any) => [String(plan._id), plan.name]));
  const hotelNameById = new Map(hotels.map((hotel: any) => [String(hotel._id), hotel.name]));

  const hotelMetrics = await getHotelMetrics(scopedHotelIds as Types.ObjectId[]);
  const hotelPerformance = await Promise.all(
    hotels.slice(0, 20).map(async (hotel: any) => {
      const mapped = await mapHotel(hotel, hotelMetrics);
      return {
        hotelId: mapped.id,
        hotelName: mapped.name,
        planName: planNameById.get(String(hotel.subscription?.planId)) ?? mapped.plan,
        subscriptionStatus: mapped.subscriptionStatus,
        totalRooms: mapped.totalRooms,
        activeRooms: mapped.totalRooms,
        occupancyRate: mapped.currentOccupancy,
        staffCount: mapped.totalStaff,
        activeUsers: mapped.totalStaff,
        lastLogin: mapped.lastLoginAt,
        engagementScore: mapped.healthScore,
      };
    })
  );

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      totalHotels,
      activeHotels,
      inactiveHotels,
      trialHotels,
      paidHotels,
      suspendedHotels,
      totalRevenue: revenue,
      monthlyRevenue: revenueTrend.at(-1)?.value ?? 0,
      yearlyRevenue: revenue,
      mrr: Math.round(monthlySubscriptionValue),
      arr: Math.round(monthlySubscriptionValue * 12),
      churnRate,
      retentionRate: Math.max(0, 100 - churnRate),
      growthRate: buckets.length > 1 && revenueTrend[0].value > 0 ? Math.round(((revenueTrend.at(-1)!.value - revenueTrend[0].value) / revenueTrend[0].value) * 100) : 0,
      totalInvoicesGenerated,
      totalPaidInvoices,
      overdueInvoices,
      totalRooms,
      activeRooms,
      staffCount,
      activeUsers,
    },
    revenue: {
      revenueTrend,
      mrrTrend: revenueTrend.map((point) => ({ ...point, value: Math.round(monthlySubscriptionValue) })),
      arrTrend: revenueTrend.map((point) => ({ ...point, value: Math.round(monthlySubscriptionValue * 12) })),
      byPlan: Object.fromEntries(revenueByPlanRows.map((row: any) => [planNameById.get(String(row._id)) ?? 'Unknown', row.value])),
      byHotel: Object.fromEntries(revenueByHotelRows.map((row: any) => [hotelNameById.get(String(row._id)) ?? 'Unknown', row.value])),
      byCountry: objectFromAggregation(revenueByCountryRows),
      growthCurve: revenueTrend.reduce<Array<{ label: string; value: number }>>((acc, point) => {
        const previous = acc.at(-1)?.value ?? 0;
        acc.push({ label: point.label, value: previous + point.value });
        return acc;
      }, []),
    },
    subscriptions: {
      planDistribution: Object.fromEntries(planDistributionRows.map((row: any) => [planNameById.get(String(row._id)) ?? 'Unknown', row.count])),
      trialVsPaid: { trial: trialHotels, paid: paidHotels },
      trialConversionRate: totalHotels ? Math.round((paidHotels / totalHotels) * 100) : 0,
      upgradeRate: 0,
      downgradeRate: 0,
      cancellationRate: churnRate,
      averageSubscriptionLifetimeDays: 0,
    },
    hotelPerformance,
    usage: {
      featureUsage: { crmAccess: 0, analyticsAccess: 0, apiAccess: 0, multiBranchSupport: 0, prioritySupport: 0 },
      apiUsagePerHotel: {},
      loginFrequency: {},
      activeSessions: activeUsers,
      moduleUsageHeatmap: { dashboard: 0, hotels: 0, subscriptions: 0, invoices: 0, analytics: 0 },
    },
    segments: {
      trialUsers: trialHotels,
      paidUsers: paidHotels,
      highValueHotels: hotelPerformance.filter((hotel) => hotel.engagementScore >= 85).length,
      atRiskHotels: hotelPerformance.filter((hotel) => hotel.engagementScore < 50 || hotel.subscriptionStatus === 'suspended').length,
    },
    activityTimeline: auditLogs.map((log: any) => ({
      id: String(log._id),
      actor: log.userId?.name ?? 'System',
      action: log.action,
      entity: log.entity,
      entityAffected: log.hotelId?.name ?? log.entityId?.toString(),
      timestamp: log.createdAt,
    })),
  };
};

const nextTicketNumber = async () => {
  const year = new Date().getFullYear();
  const latest = await SupportTicket.findOne({ ticketNumber: { $regex: `^SUP-${year}-` } }).sort({ createdAt: -1 }).select('ticketNumber').lean();
  const sequence = latest?.ticketNumber ? Number(latest.ticketNumber.split('-').pop()) + 1 : 1;
  return `SUP-${year}-${String(sequence).padStart(5, '0')}`;
};

const mapTicket = (ticket: any) => ({
  id: String(ticket._id),
  ticketId: ticket.ticketId,
  ticketNumber: ticket.ticketNumber,
  hotelId: String(ticket.hotelId?._id ?? ticket.hotelId),
  hotelName: ticket.hotelId?.name ?? 'Unknown hotel',
  createdBy: ticket.createdBy ? String(ticket.createdBy?._id ?? ticket.createdBy) : undefined,
  createdByName: ticket.createdBy?.name,
  createdByRole: ticket.createdByRole,
  subject: ticket.subject,
  description: ticket.description,
  category: ticket.category,
  priority: ticket.priority,
  status: ticket.status,
  assignedTo: ticket.assignedTo ? String(ticket.assignedTo?._id ?? ticket.assignedTo) : undefined,
  assignedToName: ticket.assignedTo?.name,
  tags: ticket.tags ?? [],
  attachments: ticket.attachments ?? [],
  resolutionNotes: ticket.resolutionNotes,
  sla: ticket.sla,
  escalation: ticket.escalation,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  resolvedAt: ticket.resolvedAt,
});

export const listPlatformTickets = async (query: PlatformTicketListQuery) => {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 10));
  const filter: Record<string, unknown> = { ...activeFilter };
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.category) filter.category = query.category;
  if (query.assignedTo) filter.assignedTo = new Types.ObjectId(query.assignedTo);
  if (query.hotelId) filter.hotelId = new Types.ObjectId(query.hotelId);
  if (query.fromDate || query.toDate) {
    filter.createdAt = { ...(query.fromDate ? { $gte: query.fromDate } : {}), ...(query.toDate ? { $lte: query.toDate } : {}) };
  }
  if (query.search) {
    const hotels = await Hotel.find({ ...activeFilter, name: { $regex: query.search, $options: 'i' } }).select('_id').lean();
    filter.$or = [
      { ticketNumber: { $regex: query.search, $options: 'i' } },
      { subject: { $regex: query.search, $options: 'i' } },
      { hotelId: { $in: hotels.map((hotel: any) => hotel._id) } },
    ];
  }

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('hotelId', 'name email')
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .lean(),
    SupportTicket.countDocuments(filter),
  ]);

  return {
    data: tickets.map(mapTicket),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

export const getPlatformTicket = async (id: string) => {
  const ticket = await SupportTicket.findOne({ _id: id, ...activeFilter })
    .populate('hotelId', 'name email phone address subscription')
    .populate('createdBy', 'name email role phone')
    .populate('assignedTo', 'name email role')
    .lean();
  if (!ticket) throw new NotFoundError('Ticket not found');
  const auditHistory = await AuditLog.find({ entity: 'SupportTicket', entityId: ticket._id }).sort({ createdAt: -1 }).limit(20).populate('userId', 'name email role').lean();
  return {
    ...mapTicket(ticket),
    hotel: ticket.hotelId,
    createdByUser: ticket.createdBy,
    assignedAgent: ticket.assignedTo,
    thread: ticket.thread ?? [],
    internalNotes: ticket.internalNotes ?? [],
    activity: ticket.activity ?? [],
    auditHistory: auditHistory.map((log: any) => ({
      id: String(log._id),
      actor: log.userId?.name ?? 'System',
      action: log.action,
      createdAt: log.createdAt,
      changes: log.changes,
    })),
    mergeDesign: { enabled: false, note: 'Merge workflow reserved for future support operations.' },
    agentMetrics: { loadBalancing: 'future_ready', performanceScore: 'future_ready' },
  };
};

export const createPlatformTicket = async (input: PlatformTicketCreateInput, viewer: Viewer) => {
  const hotel = await Hotel.findOne({ _id: input.hotelId, ...activeFilter });
  if (!hotel) throw new NotFoundError('Hotel not found');
  const ticket = await SupportTicket.create({
    ticketId: new Types.ObjectId().toString(),
    ticketNumber: await nextTicketNumber(),
    hotelId: hotel._id,
    createdBy: new Types.ObjectId(viewer.userId),
    createdByRole: viewer.role === 'super_admin' ? 'super_admin' : 'admin',
    subject: input.subject,
    description: input.description,
    category: input.category,
    priority: input.priority,
    status: 'open',
    assignedTo: input.assignedTo ? new Types.ObjectId(input.assignedTo) : undefined,
    tags: input.tags,
    attachments: [],
    thread: [{ type: 'public_reply', message: input.description, authorId: new Types.ObjectId(viewer.userId), authorName: 'Super Admin', attachments: [] }],
    internalNotes: [],
    sla: { startedAt: new Date(), breached: false },
    escalation: { isEscalated: false },
    activity: [{ action: 'ticket_created', actorId: new Types.ObjectId(viewer.userId), actorName: 'Super Admin', newValue: input, createdAt: new Date() }],
    updatedBy: viewer.userId,
  });
  await logPlatformActivity(viewer, 'platform.ticket_created', 'SupportTicket', ticket._id, { newValue: input });
  return mapTicket({ ...ticket.toObject(), hotelId: hotel });
};

export const runPlatformTicketAction = async (id: string, input: PlatformTicketActionInput, viewer: Viewer) => {
  const ticket = await SupportTicket.findOne({ _id: id, ...activeFilter });
  if (!ticket) throw new NotFoundError('Ticket not found');
  const oldValue = {
    status: ticket.status,
    priority: ticket.priority,
    assignedTo: ticket.assignedTo?.toString(),
    escalation: ticket.escalation,
  };

  const actorId = new Types.ObjectId(viewer.userId);
  const actorName = 'Super Admin';
  if (input.action === 'assign') {
    if (!input.assignedTo) throw new ValidationError('Assigned agent is required');
    ticket.assignedTo = new Types.ObjectId(input.assignedTo);
    if (ticket.status === 'open') ticket.status = 'in_progress';
  }
  if (input.action === 'change_priority') {
    if (!input.priority) throw new ValidationError('Priority is required');
    ticket.priority = input.priority;
  }
  if (input.action === 'change_status') {
    if (!input.status) throw new ValidationError('Status is required');
    if (['in_progress', 'pending'].includes(input.status) && !ticket.assignedTo && !input.assignedTo) {
      throw new ValidationError('Assignment is required for active tickets');
    }
    ticket.status = input.status;
    if (input.status === 'resolved') ticket.resolvedAt = new Date();
    if (input.status === 'closed') ticket.closedAt = new Date();
  }
  if (input.action === 'add_internal_note') {
    if (!input.message) throw new ValidationError('Internal note is required');
    ticket.internalNotes.push({ type: 'internal_note', message: input.message, authorId: actorId, authorName: actorName, createdAt: new Date(), attachments: [] });
  }
  if (input.action === 'add_public_reply') {
    if (!input.message) throw new ValidationError('Reply is required');
    ticket.thread.push({ type: 'public_reply', message: input.message, authorId: actorId, authorName: actorName, createdAt: new Date(), attachments: [] });
    if (!ticket.sla.firstRespondedAt) ticket.sla.firstRespondedAt = new Date();
  }
  if (input.action === 'escalate') {
    ticket.escalation = { isEscalated: true, escalatedAt: new Date(), escalatedBy: actorId, reason: input.reason };
    ticket.priority = ticket.priority === 'urgent' ? 'urgent' : 'high';
  }
  if (input.action === 'close') {
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.resolutionNotes = input.resolutionNotes ?? ticket.resolutionNotes;
  }
  if (input.action === 'reopen') {
    ticket.status = 'reopened';
    ticket.closedAt = undefined;
  }
  if (input.action === 'merge_design') {
    // Design-only action, recorded for future merge workflow.
  }

  ticket.activity.push({
    action: input.action,
    oldValue,
    newValue: input,
    actorId,
    actorName,
    createdAt: new Date(),
  });
  (ticket as unknown as { updatedBy?: Types.ObjectId }).updatedBy = actorId;
  await ticket.save();
  await logPlatformActivity(viewer, `platform.ticket_${input.action}`, 'SupportTicket', ticket._id, { oldValue, newValue: input });
  const populated = await SupportTicket.findById(ticket._id).populate('hotelId', 'name email').populate('createdBy', 'name email role').populate('assignedTo', 'name email role').lean();
  return mapTicket(populated);
};

export const getPlatformSupportSummary = async () => {
  const [open, inProgress, pending, resolved, closed, urgent, escalated] = await Promise.all([
    SupportTicket.countDocuments({ ...activeFilter, status: 'open' }),
    SupportTicket.countDocuments({ ...activeFilter, status: 'in_progress' }),
    SupportTicket.countDocuments({ ...activeFilter, status: 'pending' }),
    SupportTicket.countDocuments({ ...activeFilter, status: 'resolved' }),
    SupportTicket.countDocuments({ ...activeFilter, status: 'closed' }),
    SupportTicket.countDocuments({ ...activeFilter, priority: 'urgent' }),
    SupportTicket.countDocuments({ ...activeFilter, 'escalation.isEscalated': true }),
  ]);
  return {
    open,
    inProgress,
    pending,
    resolved,
    closed,
    urgent,
    escalated,
    slaBreached: await SupportTicket.countDocuments({ ...activeFilter, 'sla.breached': true }),
  };
};

const monitoringServices = ['auth', 'billing', 'subscription', 'hotel', 'support', 'analytics'] as const;
const monitoringApis = [
  { endpoint: '/api/v1/auth/login', method: 'POST' as const, serviceName: 'auth' },
  { endpoint: '/api/v1/platform/billing/summary', method: 'GET' as const, serviceName: 'billing' },
  { endpoint: '/api/v1/platform/subscriptions', method: 'GET' as const, serviceName: 'subscription' },
  { endpoint: '/api/v1/platform/hotels', method: 'GET' as const, serviceName: 'hotel' },
  { endpoint: '/api/v1/platform/support/tickets', method: 'GET' as const, serviceName: 'support' },
  { endpoint: '/api/v1/platform/analytics', method: 'GET' as const, serviceName: 'analytics' },
];

const serviceActionPrefixes: Record<(typeof monitoringServices)[number], string[]> = {
  auth: ['login', 'auth'],
  billing: ['platform.invoice', 'invoice', 'billing'],
  subscription: ['platform.subscription', 'subscription'],
  hotel: ['platform.hotel', 'hotel'],
  support: ['platform.ticket', 'ticket'],
  analytics: ['analytics', 'platform.analytics'],
};

const serviceStatusFrom = (latency: number, errorRate: number): 'healthy' | 'slow' | 'down' => {
  if (errorRate >= 25) return 'down';
  if (latency >= 900 || errorRate >= 8) return 'slow';
  return 'healthy';
};

const systemStatusFrom = (services: Array<{ status: string }>): 'healthy' | 'degraded' | 'outage' => {
  if (services.some((service) => service.status === 'down')) return 'outage';
  if (services.some((service) => service.status === 'slow')) return 'degraded';
  return 'healthy';
};

const makeTrend = (labelPrefix: string, base: number, variance: number) =>
  Array.from({ length: 8 }).map((_, index) => ({
    label: `${labelPrefix}-${index + 1}`,
    value: Math.max(0, Math.round(base + (index % 3) * variance - (index % 2) * Math.round(variance / 2))),
  }));

export const getPlatformSystemHealth = async (query: PlatformSystemHealthQuery) => {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const latestSnapshot = await SystemHealthMetric.findOne().sort({ createdAt: -1 }).lean();
  const [activeUsers, totalRequests, recentRequests, openIncidents] = await Promise.all([
    User.countDocuments({ ...activeFilter, lastLoginAt: { $gte: fifteenMinutesAgo } }),
    AuditLog.countDocuments({ createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } }),
    AuditLog.countDocuments({ createdAt: { $gte: oneHourAgo } }),
    SystemIncident.find({ status: { $in: ['open', 'acknowledged'] } }).sort({ createdAt: -1 }).limit(5).populate('assignedEngineer', 'name email role').lean(),
  ]);

  const requestsPerMinute = Math.round(recentRequests / 60);
  const criticalIncidents = openIncidents.filter((incident) => incident.severity === 'critical').length;
  const highIncidents = openIncidents.filter((incident) => incident.severity === 'high').length;
  const inferredErrorRate = Math.min(100, criticalIncidents * 12 + highIncidents * 5);
  const serviceMetrics = await Promise.all(
    monitoringServices.map(async (serviceName, index) => {
      const prefixes = serviceActionPrefixes[serviceName];
      const serviceRequests = await AuditLog.countDocuments({
        createdAt: { $gte: oneHourAgo },
        $or: prefixes.map((prefix) => ({ action: { $regex: prefix, $options: 'i' } })),
      });
      const serviceIncidentCount = openIncidents.filter((incident) => incident.affectedService === serviceName).length;
      const errorRate = Math.min(100, serviceIncidentCount * 9);
      const latency = Math.max(80, Math.round(120 + index * 35 + serviceIncidentCount * 220));
      return {
        serviceName,
        status: serviceStatusFrom(latency, errorRate),
        latency,
        errorRate,
        throughput: Math.round(serviceRequests / 60),
        lastUpdatedAt: now,
      };
    })
  );

  const filteredServices = serviceMetrics.filter((service) => {
    if (query.serviceStatus && service.status !== query.serviceStatus) return false;
    if (query.minErrorRate !== undefined && service.errorRate < query.minErrorRate) return false;
    if (query.maxLatency !== undefined && service.latency > query.maxLatency) return false;
    return true;
  });
  const avgResponseTime = Math.round(serviceMetrics.reduce((sum, service) => sum + service.latency, 0) / Math.max(serviceMetrics.length, 1));
  const systemStatus = systemStatusFrom(serviceMetrics);
  const statusCodeDistribution = latestSnapshot?.statusCodeDistribution ?? { '2xx': Math.max(totalRequests - Math.round(totalRequests * inferredErrorRate / 100), 0), '4xx': Math.round(totalRequests * 0.02), '5xx': Math.round(totalRequests * inferredErrorRate / 100) };
  const apiMetrics = latestSnapshot?.apiMetrics?.length
    ? latestSnapshot.apiMetrics
    : monitoringApis.map((api, index) => {
      const service = serviceMetrics.find((item) => item.serviceName === api.serviceName);
      return {
        endpoint: api.endpoint,
        method: api.method,
        responseTime: service?.latency ?? 100,
        statusCodes: index % 2 === 0 ? statusCodeDistribution : { '2xx': Math.max(1, Math.round(totalRequests / 10)), '4xx': 0, '5xx': service?.errorRate ? 1 : 0 },
        errorCount: service?.errorRate ? Math.round(service.errorRate / 5) : 0,
        lastCheckedAt: now,
      };
    });

  const alerts = openIncidents.map((incident) => ({
    id: String(incident._id),
    severity: incident.severity,
    message: incident.message,
    timestamp: incident.createdAt,
    affectedService: incident.affectedService,
    status: incident.status,
  }));

  return {
    generatedAt: now,
    autoRefresh: { enabled: false, intervalSeconds: 60, webSocketReady: true, streamingLogsReady: true, realTimeAlertingReady: true },
    systemMetrics: {
      systemUptime: latestSnapshot?.systemUptime ?? Number(Math.min(99.99, 99 + process.uptime() / 100000).toFixed(2)),
      systemStatus,
      activeUsers,
      totalRequests,
      requestsPerMinute,
      errorRate: latestSnapshot?.errorRate ?? inferredErrorRate,
      successRate: latestSnapshot?.successRate ?? Math.max(0, 100 - inferredErrorRate),
      avgResponseTime: latestSnapshot?.avgResponseTime ?? avgResponseTime,
    },
    serviceMetrics: filteredServices,
    apiMetrics,
    charts: {
      responseTimeTrend: latestSnapshot?.responseTimeTrend?.length ? latestSnapshot.responseTimeTrend : makeTrend('rt', avgResponseTime, 25),
      errorRateTrend: latestSnapshot?.errorRateTrend?.length ? latestSnapshot.errorRateTrend : makeTrend('err', inferredErrorRate, 1),
      requestVolumeTrend: latestSnapshot?.requestVolumeTrend?.length ? latestSnapshot.requestVolumeTrend : makeTrend('rpm', requestsPerMinute, 2),
      serviceLatency: Object.fromEntries(serviceMetrics.map((service) => [service.serviceName, service.latency])),
      statusCodeDistribution,
    },
    apiSummary: {
      slowestApis: [...apiMetrics].sort((a, b) => b.responseTime - a.responseTime).slice(0, 5),
      mostFailedEndpoints: [...apiMetrics].sort((a, b) => b.errorCount - a.errorCount).slice(0, 5),
      heatmap: { enabled: false, note: 'API performance heatmap is ready for route-level telemetry ingestion.' },
    },
    alerts,
    incidents: openIncidents.map((incident) => ({
      id: String(incident._id),
      incidentNumber: incident.incidentNumber,
      severity: incident.severity,
      message: incident.message,
      affectedService: incident.affectedService,
      status: incident.status,
      assignedEngineer: (incident.assignedEngineer as any)?.name,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
    })),
    infrastructure: {
      database: latestSnapshot?.database ?? { status: 'healthy', queryLatency: 0, slowQueries: 0, connectionPool: 'design_ready' },
      backgroundJobs: latestSnapshot?.backgroundJobs ?? { status: 'healthy', queued: 0, succeeded: 0, failed: 0 },
      queueStatus: 'design_ready',
      logStreaming: 'design_ready',
    },
  };
};

export const listPlatformSystemIncidents = async (query: PlatformIncidentListQuery) => {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 10));
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.severity) filter.severity = query.severity;
  if (query.affectedService) filter.affectedService = query.affectedService;
  if (query.search) filter.$or = [{ incidentNumber: { $regex: query.search, $options: 'i' } }, { message: { $regex: query.search, $options: 'i' } }];

  const [incidents, total] = await Promise.all([
    SystemIncident.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('assignedEngineer', 'name email role').lean(),
    SystemIncident.countDocuments(filter),
  ]);

  return {
    data: incidents.map((incident: any) => ({
      id: String(incident._id),
      incidentNumber: incident.incidentNumber,
      severity: incident.severity,
      message: incident.message,
      affectedService: incident.affectedService,
      status: incident.status,
      assignedEngineer: incident.assignedEngineer?.name,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      resolvedAt: incident.resolvedAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

export const getPlatformSystemIncident = async (id: string) => {
  const incident = await SystemIncident.findById(id).populate('assignedEngineer', 'name email role').lean();
  if (!incident) throw new NotFoundError('Incident not found');
  return {
    id: String(incident._id),
    incidentNumber: incident.incidentNumber,
    severity: incident.severity,
    message: incident.message,
    affectedService: incident.affectedService,
    status: incident.status,
    assignedEngineer: incident.assignedEngineer,
    timeline: incident.timeline ?? [],
    errorLogsPreview: incident.errorLogsPreview ?? [],
    resolvedAt: incident.resolvedAt,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
    futureReady: {
      alertRouting: 'design_ready',
      onCallEscalation: 'design_ready',
      streamingLogs: 'design_ready',
      runbookAutomation: 'design_ready',
    },
  };
};

export const impersonateHotelOwner = async (hotelId: string, input: ImpersonateInput, viewer: Viewer, meta: { ip?: string; userAgent?: string }) => {
  const hotel = await Hotel.findOne({ _id: hotelId, ...activeFilter });
  if (!hotel) throw new NotFoundError('Hotel not found');
  const owner = await User.findOne({ hotelId: hotel._id, role: 'hotel_owner', ...activeFilter });
  if (!owner) throw new ValidationError('Hotel owner not found');

  const session = await ImpersonationSession.create({
    platformUserId: new Types.ObjectId(viewer.userId),
    impersonatedUserId: owner._id,
    hotelId: hotel._id,
    reason: input.reason,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  const token = generateToken({
    userId: owner._id.toString(),
    email: owner.email,
    role: owner.role,
    hotelId: owner.hotelId?.toString(),
    impersonatedBy: viewer.userId,
    impersonationSessionId: session._id.toString(),
  });

  await logPlatformActivity(viewer, 'platform.impersonation_started', 'Hotel', hotel._id, {
    ownerId: owner._id.toString(),
    sessionId: session._id.toString(),
    reason: input.reason,
  });

  return {
    token,
    sessionId: session._id.toString(),
    impersonatedUser: {
      id: owner._id.toString(),
      name: owner.name,
      email: owner.email,
      role: owner.role,
      hotelId: owner.hotelId?.toString(),
    },
    hotel: {
      id: hotel._id.toString(),
      name: hotel.name,
    },
  };
};

export const endImpersonation = async (sessionId: string, viewer: Viewer) => {
  const session = await ImpersonationSession.findById(sessionId);
  if (!session) throw new NotFoundError('Impersonation session not found');
  session.status = 'ended';
  session.endedAt = new Date();
  await session.save();
  await logPlatformActivity(viewer, 'platform.impersonation_ended', 'Hotel', session.hotelId, {
    sessionId,
  });
};

export const getPlatformProfile = async (viewer: Viewer) => {
  const user = await User.findById(viewer.userId).lean();
  if (!user) throw new NotFoundError('Profile not found');
  const [loginHistory, activeSessions, activityLogs] = await Promise.all([
    AuditLog.find({ userId: user._id }).sort({ createdAt: -1 }).limit(8).lean(),
    ImpersonationSession.find({ platformUserId: user._id }).sort({ startedAt: -1 }).limit(5).lean(),
    AuditLog.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return {
    avatar: undefined,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    twoFactor: { status: 'future_ready' },
    loginHistory,
    activeSessions,
    notificationPreferences: { email: true, platform: true },
    preferences: { theme: 'system', language: 'en', timezone: 'Asia/Kolkata' },
    activityLogs,
  };
};

export const getPlatformSettings = () => ({
  branding: {
    platformName: 'Hotel Growth OS',
    logo: undefined,
  },
  email: {
    status: process.env.SMTP_HOST ? 'configured' : 'not_configured',
  },
  whatsapp: {
    status: config.whatsapp.accessToken ? 'configured' : 'not_configured',
    phoneNumberId: config.whatsapp.phoneNumberId ? 'configured' : 'missing',
  },
  storage: {
    s3: config.aws.s3Bucket ? 'configured' : 'not_configured',
    cloudinary: config.cloudinary.cloudName ? 'configured' : 'not_configured',
  },
  cdn: { status: 'not_configured' },
  apiKeys: { status: 'restricted' },
  security: {
    maintenanceMode: false,
    defaultPermissions: 'role_based',
  },
  featureToggles: {
    impersonation: true,
    platformBilling: false,
    supportCenter: false,
  },
});

export const getPlatformNotifications = async () => {
  const [auditLogs, notifications] = await Promise.all([
    AuditLog.find({}).sort({ createdAt: -1 }).limit(10).populate('hotelId', 'name').lean(),
    Notification.find({}).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return [
    ...auditLogs.map((log: any) => ({
      id: String(log._id),
      type: 'platform_activity',
      title: log.action.replace(/_/g, ' '),
      description: `${log.entity}${log.hotelId?.name ? ` · ${log.hotelId.name}` : ''}`,
      createdAt: log.createdAt,
      severity: 'info',
    })),
    ...notifications.map((notification: any) => ({
      id: String(notification._id),
      type: notification.type,
      title: notification.title,
      description: notification.message,
      createdAt: notification.createdAt,
      severity: notification.priority ?? 'info',
    })),
  ].slice(0, 15);
};
