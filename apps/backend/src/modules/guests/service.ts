import { FilterQuery, Types } from 'mongoose';
import { IGuest } from '../../models/Guest';
import {
  BlacklistGuestInput,
  CreateGuestInput,
  ListGuestsQuery,
  ListRepeatGuestsQuery,
  MergeGuestsInput,
  UpdateGuestInput,
  UpdateGuestPreferencesInput,
  UpdateGuestTagsInput,
  UploadGuestDocumentInput,
} from './validation';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import {
  canBlacklistGuests,
  canCreateGuests,
  canManageGuests,
  canMergeGuests,
  canViewGuests,
  isLimitedGuestViewer,
  MAX_GUEST_DOCUMENTS,
  normalizeIndianPhone,
  splitFullName,
} from './guest.constants';
import {
  countActiveBookingsForGuestRepository,
  createAuditLogRepository,
  createGuestRepository,
  findAuditLogsByGuestIdRepository,
  findGuestBookingsRepository,
  findGuestByEmailRepository,
  findGuestByIdRepository,
  findGuestByPhoneRepository,
  findGuestCampaignLogsRepository,
  findGuestEnquiriesByPhoneRepository,
  findGuestPaymentsRepository,
  findGuestReviewsRepository,
  findGuestWhatsAppMessagesRepository,
  findGuestsRepository,
  findHotelByIdRepository,
  getGuestStatsRepository,
  repointGuestReferencesRepository,
  softDeleteGuestRepository,
  updateGuestRepository,
} from './guest.repository';
import {
  GuestHistoryResult,
  GuestStatsResult,
  MergeGuestsResult,
  SanitizedGuest,
  ViewerContext,
} from './guest.types';

const ID_PROOF_VIEW_ROLES = ['hotel_owner', 'hotel_manager', 'reception_staff', 'super_admin'];

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) throw new ValidationError('Hotel ID is required');
  return resolved;
};

const assertHotelAccess = (
  viewerRole: string,
  viewerHotelId: string | undefined,
  hotelId: string
): void => {
  if (viewerRole !== 'super_admin' && viewerHotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const assertCanView = (viewer: ViewerContext): void => {
  if (!canViewGuests(viewer.role)) {
    throw new ForbiddenError('Insufficient permissions to view guests');
  }
};

const logAudit = async (
  action: string,
  entityId: string,
  viewer: ViewerContext,
  changes?: Record<string, unknown>,
  hotelId?: string
): Promise<void> => {
  await createAuditLogRepository({
    hotelId: hotelId ?? viewer.hotelId,
    userId: viewer.userId,
    action,
    entity: 'Guest',
    entityId: new Types.ObjectId(entityId),
    changes,
  });
};

const normalizeEmail = (email?: string): string | undefined => {
  if (!email || email === '') return undefined;
  return email.toLowerCase().trim();
};

const sanitizeGuest = (
  guest: IGuest,
  viewer: ViewerContext,
  includeAudit = false,
  auditLogs?: unknown[]
): SanitizedGuest => {
  const doc = guest.toObject ? guest.toObject() : { ...guest };
  const canViewIdProof = ID_PROOF_VIEW_ROLES.includes(viewer.role);
  const limited = isLimitedGuestViewer(viewer.role);

  const sanitized: SanitizedGuest = {
    ...doc,
    id: doc._id?.toString(),
    fullName: doc.fullName || doc.name,
    name: doc.name || doc.fullName,
  };

  if (!canViewIdProof) {
    delete sanitized.idProofImages;
    delete sanitized.idProofNumber;
    delete sanitized.idProof;
    delete sanitized.idProofType;
  }

  if (limited) {
    delete sanitized.address;
    delete sanitized.notes;
    delete sanitized.tags;
    delete sanitized.preferences;
    delete sanitized.specialRequests;
    delete sanitized.metadata;
    delete sanitized.idProofImages;
    delete sanitized.idProofNumber;
    delete sanitized.idProof;
    delete sanitized.idProofType;
    delete sanitized.alternatePhone;
    delete sanitized.dateOfBirth;
    delete sanitized.anniversaryDate;
  }

  if (includeAudit && auditLogs) sanitized.auditLogs = auditLogs;
  return sanitized;
};

const ensureGuestDefaults = async (guest: IGuest): Promise<IGuest> => {
  let changed = false;

  if (!guest.fullName && guest.name) {
    guest.fullName = guest.name;
    changed = true;
  }
  if (!guest.name && guest.fullName) {
    guest.name = guest.fullName;
    changed = true;
  }
  if (!guest.firstName && guest.fullName) {
    const { firstName, lastName } = splitFullName(guest.fullName);
    guest.firstName = firstName;
    guest.lastName = lastName;
    changed = true;
  }
  if (!guest.guestType) {
    guest.guestType = guest.isVip ? 'vip' : 'individual';
    changed = true;
  }
  if (!guest.source) {
    guest.source = 'manual';
    changed = true;
  }
  if (!guest.tags) {
    guest.tags = [];
    changed = true;
  }
  if (!guest.preferences) {
    guest.preferences = [];
    changed = true;
  }
  if (!guest.idProofImages) {
    guest.idProofImages = [];
    changed = true;
  }
  if (guest.totalBookings === undefined || guest.totalBookings === null) {
    guest.totalBookings = guest.visitCount ?? 0;
    changed = true;
  }
  if (guest.totalSpend === undefined || guest.totalSpend === null) {
    guest.totalSpend = 0;
    changed = true;
  }
  if (guest.isRepeatGuest === undefined || guest.isRepeatGuest === null) {
    guest.isRepeatGuest = (guest.visitCount ?? 0) >= 2 || (guest.totalBookings ?? 0) >= 2;
    changed = true;
  }

  if (changed) return updateGuestRepository(guest);
  return guest;
};

const getGuestOrThrow = async (
  id: string,
  viewer: ViewerContext
): Promise<IGuest> => {
  assertCanView(viewer);
  const guest = await findGuestByIdRepository(id);
  if (!guest) throw new NotFoundError('Guest not found');
  assertHotelAccess(viewer.role, viewer.hotelId, guest.hotelId.toString());
  return ensureGuestDefaults(guest);
};

const buildListFilter = (query: ListGuestsQuery, hotelId: string): FilterQuery<IGuest> => {
  const filter: FilterQuery<IGuest> = { hotelId };

  if (query.guestType) filter.guestType = query.guestType;
  if (query.source) filter.source = query.source;
  if (query.city) filter.city = { $regex: query.city, $options: 'i' };
  if (query.state) filter.state = { $regex: query.state, $options: 'i' };
  if (query.isRepeatGuest !== undefined) filter.isRepeatGuest = query.isRepeatGuest;
  if (query.isVip !== undefined) filter.isVip = query.isVip;
  if (query.isBlacklisted !== undefined) filter.isBlacklisted = query.isBlacklisted;
  if (query.marketingConsent !== undefined) filter.marketingConsent = query.marketingConsent;
  if (query.whatsappConsent !== undefined) filter.whatsappConsent = query.whatsappConsent;
  if (query.minVisitCount !== undefined) filter.visitCount = { $gte: query.minVisitCount };

  if (query.birthdayMonth) {
    filter.dateOfBirth = { $exists: true, $ne: null };
    filter.$expr = { $eq: [{ $month: '$dateOfBirth' }, query.birthdayMonth] };
  }
  if (query.anniversaryMonth) {
    filter.anniversaryDate = { $exists: true, $ne: null };
    filter.$expr = { $eq: [{ $month: '$anniversaryDate' }, query.anniversaryMonth] };
  }

  if (query.minTotalSpend !== undefined || query.maxTotalSpend !== undefined) {
    filter.totalSpend = {};
    if (query.minTotalSpend !== undefined) filter.totalSpend.$gte = query.minTotalSpend;
    if (query.maxTotalSpend !== undefined) filter.totalSpend.$lte = query.maxTotalSpend;
  }

  if (query.lastBookingFrom || query.lastBookingTo) {
    filter.lastBookingDate = {};
    if (query.lastBookingFrom) filter.lastBookingDate.$gte = query.lastBookingFrom;
    if (query.lastBookingTo) filter.lastBookingDate.$lte = query.lastBookingTo;
  }

  if (query.createdFrom || query.createdTo) {
    filter.createdAt = {};
    if (query.createdFrom) filter.createdAt.$gte = query.createdFrom;
    if (query.createdTo) filter.createdAt.$lte = query.createdTo;
  }

  if (query.tags) {
    const tagList = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length) filter.tags = { $in: tagList };
  }

  if (query.campaignEligible) {
    filter.marketingConsent = true;
    filter.whatsappConsent = true;
    filter.isBlacklisted = { $ne: true };
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (query.notBookedSinceDays ?? 90));
    filter.$or = [
      { lastBookingDate: { $lt: cutoff } },
      { lastBookingDate: { $exists: false } },
      { lastBookingDate: null },
    ];
  } else if (query.notBookedSinceDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - query.notBookedSinceDays);
    filter.$or = [
      { lastBookingDate: { $lt: cutoff } },
      { lastBookingDate: { $exists: false } },
      { lastBookingDate: null },
    ];
  }

  return filter;
};

const applyGuestInput = (
  guest: IGuest,
  input: Partial<CreateGuestInput | UpdateGuestInput>,
  viewer: ViewerContext
): void => {
  const fullName = input.fullName ?? input.name;
  if (fullName) {
    guest.fullName = fullName.trim();
    guest.name = guest.fullName;
    const { firstName, lastName } = splitFullName(guest.fullName);
    guest.firstName = firstName;
    guest.lastName = lastName;
  }

  if (input.phone) guest.phone = normalizeIndianPhone(input.phone);
  if (input.alternatePhone !== undefined) {
    guest.alternatePhone = input.alternatePhone
      ? normalizeIndianPhone(input.alternatePhone)
      : undefined;
  }
  if (input.email !== undefined) guest.email = normalizeEmail(input.email);
  if (input.gender !== undefined) guest.gender = input.gender;
  if (input.dateOfBirth !== undefined) guest.dateOfBirth = input.dateOfBirth;
  if (input.anniversaryDate !== undefined) guest.anniversaryDate = input.anniversaryDate;
  if (input.city !== undefined) guest.city = input.city;
  if (input.state !== undefined) guest.state = input.state;
  if (input.country !== undefined) guest.country = input.country;
  if (input.address !== undefined) guest.address = input.address;
  if (input.idProofType !== undefined) guest.idProofType = input.idProofType;
  if (input.idProofNumber !== undefined) {
    guest.idProofNumber = input.idProofNumber.replace(/\s+/g, '').trim();
  }
  if (input.profileImage !== undefined) guest.profileImage = input.profileImage || undefined;
  if (input.guestType !== undefined) guest.guestType = input.guestType;
  if (input.source !== undefined) guest.source = input.source;
  if (input.preferences !== undefined) guest.preferences = input.preferences;
  if (input.foodPreference !== undefined) guest.foodPreference = input.foodPreference;
  if (input.roomPreference !== undefined) guest.roomPreference = input.roomPreference;
  if (input.specialRequests !== undefined) guest.specialRequests = input.specialRequests;
  if (input.tags !== undefined) guest.tags = input.tags;
  if (input.notes !== undefined) guest.notes = input.notes;
  if (input.marketingConsent !== undefined) guest.marketingConsent = input.marketingConsent;
  if (input.whatsappConsent !== undefined) guest.whatsappConsent = input.whatsappConsent;
  if (input.emailConsent !== undefined) guest.emailConsent = input.emailConsent;
  if (input.isVip !== undefined) {
    guest.isVip = input.isVip;
    if (input.isVip) guest.guestType = 'vip';
  }
  if (input.metadata !== undefined) guest.metadata = input.metadata;
  guest.updatedBy = new Types.ObjectId(viewer.userId);
};

export const listGuestsService = async (
  query: ListGuestsQuery,
  viewer: ViewerContext
): Promise<PaginatedResponse<SanitizedGuest>> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  const baseFilter = buildListFilter(query, hotelId);
  const result = await findGuestsRepository(baseFilter, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['fullName', 'name', 'phone', 'email', 'city'],
    sortBy: query.sortBy ?? 'createdAt',
    sortOrder: query.sortOrder,
  });

  return {
    ...result,
    data: result.data.map((g) => sanitizeGuest(g, viewer)),
  };
};

export const listRepeatGuestsService = async (
  query: ListRepeatGuestsQuery,
  viewer: ViewerContext
): Promise<PaginatedResponse<SanitizedGuest>> => {
  return listGuestsService(
    {
      ...query,
      isRepeatGuest: true,
      minVisitCount: query.minVisitCount,
      sortBy: query.sortBy ?? 'visitCount',
      sortOrder: query.sortOrder ?? 'desc',
    },
    viewer
  );
};

export const getGuestByIdService = async (
  id: string,
  viewer: ViewerContext,
  includeAudit = false
): Promise<SanitizedGuest> => {
  const guest = await getGuestOrThrow(id, viewer);
  let auditLogs: unknown[] | undefined;
  if (includeAudit && canManageGuests(viewer.role)) {
    auditLogs = await findAuditLogsByGuestIdRepository(guest._id);
  }
  return sanitizeGuest(guest, viewer, !!auditLogs, auditLogs);
};

export const getGuestHistoryService = async (
  id: string,
  viewer: ViewerContext
): Promise<GuestHistoryResult> => {
  const guest = await getGuestOrThrow(id, viewer);
  const hotelId = guest.hotelId.toString();
  const guestId = guest._id.toString();

  const [bookings, enquiries, payments, reviews, campaigns, whatsappMessages, auditLogs] =
    await Promise.all([
      findGuestBookingsRepository(guestId, hotelId),
      findGuestEnquiriesByPhoneRepository(hotelId, guest.phone),
      findGuestPaymentsRepository(guestId, hotelId),
      findGuestReviewsRepository(guestId, hotelId),
      findGuestCampaignLogsRepository(guestId, hotelId),
      findGuestWhatsAppMessagesRepository(guestId, hotelId),
      canManageGuests(viewer.role)
        ? findAuditLogsByGuestIdRepository(guest._id)
        : Promise.resolve([]),
    ]);

  const whatsappSummary = {
    totalMessages: whatsappMessages.length,
    incoming: whatsappMessages.filter((m) => m.direction === 'incoming').length,
    outgoing: whatsappMessages.filter((m) => m.direction === 'outgoing').length,
    lastMessageAt: whatsappMessages[0]?.createdAt,
  };

  return {
    guest: sanitizeGuest(guest, viewer),
    bookings,
    enquiries,
    payments,
    reviews,
    campaigns,
    whatsappMessages: isLimitedGuestViewer(viewer.role) ? [] : whatsappMessages,
    whatsappSummary,
    summary: {
      totalSpend: guest.totalSpend,
      totalBookings: guest.totalBookings,
      completedBookings: guest.completedBookings,
      cancelledBookings: guest.cancelledBookings,
      noShowCount: guest.noShowCount,
      isRepeatGuest: guest.isRepeatGuest,
    },
    ...(canManageGuests(viewer.role) ? { auditLogs } : {}),
  } as GuestHistoryResult & { auditLogs?: unknown[] };
};

export const getGuestStatsService = async (
  viewer: ViewerContext,
  hotelIdInput?: string
): Promise<GuestStatsResult> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(hotelIdInput, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);
  return getGuestStatsRepository(hotelId);
};

export const createGuestService = async (
  input: CreateGuestInput,
  viewer: ViewerContext
): Promise<SanitizedGuest> => {
  if (!canCreateGuests(viewer.role)) {
    throw new ForbiddenError('Insufficient permissions to create guests');
  }

  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer.role, viewer.hotelId, hotelId);

  const hotel = await findHotelByIdRepository(hotelId);
  if (!hotel) throw new NotFoundError('Hotel not found');

  const phone = normalizeIndianPhone(input.phone);
  const email = normalizeEmail(input.email);
  const fullName = (input.fullName ?? input.name ?? '').trim();
  if (!fullName) throw new ValidationError('Full name is required');

  const existingByPhone = await findGuestByPhoneRepository(hotelId, phone);
  if (existingByPhone) {
    applyGuestInput(existingByPhone, { ...input, phone }, viewer);
    const updated = await updateGuestRepository(existingByPhone);
    await logAudit('guest.updated', updated._id.toString(), viewer, { upsert: true }, hotelId);
    return sanitizeGuest(updated, viewer);
  }

  if (email) {
    const existingByEmail = await findGuestByEmailRepository(hotelId, email);
    if (existingByEmail) {
      applyGuestInput(existingByEmail, { ...input, phone, email }, viewer);
      const updated = await updateGuestRepository(existingByEmail);
      await logAudit('guest.updated', updated._id.toString(), viewer, { upsert: true }, hotelId);
      return sanitizeGuest(updated, viewer);
    }
  }

  const { firstName, lastName } = splitFullName(fullName);
  const guest = await createGuestRepository({
    hotelId,
    fullName,
    firstName,
    lastName,
    name: fullName,
    phone,
    email,
    alternatePhone: input.alternatePhone ? normalizeIndianPhone(input.alternatePhone) : undefined,
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    anniversaryDate: input.anniversaryDate,
    city: input.city,
    state: input.state,
    country: input.country ?? 'India',
    address: input.address,
    idProofType: input.idProofType,
    idProofNumber: input.idProofNumber?.replace(/\s+/g, '').trim(),
    profileImage: input.profileImage || undefined,
    guestType: input.isVip ? 'vip' : input.guestType ?? 'individual',
    source: input.source ?? 'manual',
    preferences: input.preferences ?? [],
    foodPreference: input.foodPreference ?? 'no_preference',
    roomPreference: input.roomPreference,
    specialRequests: input.specialRequests,
    tags: input.tags ?? [],
    notes: input.notes,
    marketingConsent: input.marketingConsent ?? false,
    whatsappConsent: input.whatsappConsent ?? false,
    emailConsent: input.emailConsent ?? false,
    isVip: input.isVip ?? false,
    metadata: input.metadata,
    visitCount: 0,
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    noShowCount: 0,
    totalSpend: 0,
    averageSpend: 0,
    isRepeatGuest: false,
    isBlacklisted: false,
    loyaltyPoints: 0,
    idProofImages: [],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });

  await logAudit('guest.created', guest._id.toString(), viewer, { fullName, phone }, hotelId);
  return sanitizeGuest(guest, viewer);
};

export const updateGuestService = async (
  id: string,
  input: UpdateGuestInput,
  viewer: ViewerContext
): Promise<SanitizedGuest> => {
  if (!canCreateGuests(viewer.role)) {
    throw new ForbiddenError('Insufficient permissions to update guests');
  }

  const guest = await getGuestOrThrow(id, viewer);
  const hotelId = guest.hotelId.toString();

  if (input.phone && normalizeIndianPhone(input.phone) !== guest.phone) {
    const existing = await findGuestByPhoneRepository(
      hotelId,
      normalizeIndianPhone(input.phone),
      id
    );
    if (existing) throw new ConflictError('A guest with this phone number already exists');
  }

  const email = input.email !== undefined ? normalizeEmail(input.email) : undefined;
  if (email !== undefined && email !== guest.email && email) {
    const existingEmail = await findGuestByEmailRepository(hotelId, email, id);
    if (existingEmail) throw new ConflictError('A guest with this email already exists');
  }

  applyGuestInput(guest, input, viewer);
  const updated = await updateGuestRepository(guest);
  await logAudit('guest.updated', id, viewer, input as Record<string, unknown>, hotelId);
  return sanitizeGuest(updated, viewer);
};

export const deleteGuestService = async (id: string, viewer: ViewerContext): Promise<void> => {
  if (!canManageGuests(viewer.role)) {
    throw new ForbiddenError('Insufficient permissions to delete guests');
  }

  const guest = await getGuestOrThrow(id, viewer);
  const activeBookings = await countActiveBookingsForGuestRepository(id);
  if (activeBookings > 0) {
    throw new ConflictError('Cannot delete guest with active bookings');
  }

  await softDeleteGuestRepository(id, viewer.userId);
  await logAudit('guest.deleted', id, viewer, { fullName: guest.fullName }, guest.hotelId.toString());
};

export const recordVisitService = async (id: string, viewer: ViewerContext): Promise<SanitizedGuest> => {
  if (!canCreateGuests(viewer.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  const guest = await getGuestOrThrow(id, viewer);
  guest.visitCount = (guest.visitCount ?? 0) + 1;
  guest.lastVisitAt = new Date();
  guest.isRepeatGuest = guest.visitCount >= 2 || guest.totalBookings >= 2;
  guest.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateGuestRepository(guest);
  return sanitizeGuest(updated, viewer);
};

export const mergeGuestsService = async (
  input: MergeGuestsInput,
  viewer: ViewerContext
): Promise<MergeGuestsResult> => {
  if (!canMergeGuests(viewer.role)) {
    throw new ForbiddenError('Only owner/manager can merge guests');
  }

  if (input.primaryGuestId === input.duplicateGuestId) {
    throw new ValidationError('Cannot merge guest with itself');
  }

  const primary = await getGuestOrThrow(input.primaryGuestId, viewer);
  const duplicate = await getGuestOrThrow(input.duplicateGuestId, viewer);

  if (primary.hotelId.toString() !== duplicate.hotelId.toString()) {
    throw new ForbiddenError('Guests must belong to the same hotel');
  }

  const hotelId = primary.hotelId.toString();

  primary.tags = [...new Set([...(primary.tags ?? []), ...(duplicate.tags ?? [])])];
  primary.preferences = [
    ...new Set([...(primary.preferences ?? []), ...(duplicate.preferences ?? [])]),
  ];
  if (duplicate.notes) {
    primary.notes = [primary.notes, duplicate.notes].filter(Boolean).join('\n---\n');
  }
  primary.visitCount = (primary.visitCount ?? 0) + (duplicate.visitCount ?? 0);
  primary.totalBookings = (primary.totalBookings ?? 0) + (duplicate.totalBookings ?? 0);
  primary.completedBookings =
    (primary.completedBookings ?? 0) + (duplicate.completedBookings ?? 0);
  primary.cancelledBookings =
    (primary.cancelledBookings ?? 0) + (duplicate.cancelledBookings ?? 0);
  primary.noShowCount = (primary.noShowCount ?? 0) + (duplicate.noShowCount ?? 0);
  primary.totalSpend = (primary.totalSpend ?? 0) + (duplicate.totalSpend ?? 0);
  primary.loyaltyPoints = (primary.loyaltyPoints ?? 0) + (duplicate.loyaltyPoints ?? 0);
  primary.isRepeatGuest =
    primary.visitCount >= 2 || primary.totalBookings >= 2 || primary.isRepeatGuest;
  primary.isVip = primary.isVip || duplicate.isVip;
  if (duplicate.idProofImages?.length) {
    primary.idProofImages = [...(primary.idProofImages ?? []), ...duplicate.idProofImages];
  }

  await repointGuestReferencesRepository(duplicate._id.toString(), primary._id.toString(), hotelId);
  await updateGuestRepository(primary);
  await softDeleteGuestRepository(duplicate._id.toString(), viewer.userId);

  await logAudit(
    'guest.merged',
    primary._id.toString(),
    viewer,
    { mergedGuestId: duplicate._id.toString() },
    hotelId
  );

  return {
    primaryGuest: sanitizeGuest(primary, viewer),
    mergedGuestId: duplicate._id.toString(),
  };
};

export const updateGuestPreferencesService = async (
  id: string,
  input: UpdateGuestPreferencesInput,
  viewer: ViewerContext
): Promise<SanitizedGuest> => {
  if (!canCreateGuests(viewer.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  const guest = await getGuestOrThrow(id, viewer);
  if (input.preferences !== undefined) guest.preferences = input.preferences;
  if (input.foodPreference !== undefined) guest.foodPreference = input.foodPreference;
  if (input.roomPreference !== undefined) guest.roomPreference = input.roomPreference;
  if (input.specialRequests !== undefined) guest.specialRequests = input.specialRequests;
  guest.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateGuestRepository(guest);
  await logAudit('guest.preferences_updated', id, viewer, input as Record<string, unknown>);
  return sanitizeGuest(updated, viewer);
};

export const updateGuestTagsService = async (
  id: string,
  input: UpdateGuestTagsInput,
  viewer: ViewerContext
): Promise<SanitizedGuest> => {
  if (!canCreateGuests(viewer.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  const guest = await getGuestOrThrow(id, viewer);
  const current = guest.tags ?? [];

  if (input.mode === 'add') {
    guest.tags = [...new Set([...current, ...input.tags])];
  } else if (input.mode === 'remove') {
    guest.tags = current.filter((t) => !input.tags.includes(t));
  } else {
    guest.tags = input.tags;
  }

  guest.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateGuestRepository(guest);
  await logAudit('guest.tags_updated', id, viewer, input as Record<string, unknown>);
  return sanitizeGuest(updated, viewer);
};

export const uploadGuestDocumentService = async (
  id: string,
  input: UploadGuestDocumentInput,
  viewer: ViewerContext
): Promise<SanitizedGuest> => {
  if (!canCreateGuests(viewer.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  const guest = await getGuestOrThrow(id, viewer);
  if ((guest.idProofImages?.length ?? 0) >= MAX_GUEST_DOCUMENTS) {
    throw new ValidationError(`Maximum ${MAX_GUEST_DOCUMENTS} documents allowed`);
  }

  guest.idProofImages = [
    ...(guest.idProofImages ?? []),
    {
      url: input.url,
      publicId: input.publicId,
      documentType: input.documentType ?? 'id_proof',
      uploadedAt: new Date(),
    },
  ];
  guest.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateGuestRepository(guest);
  await logAudit('guest.document_uploaded', id, viewer, { documentType: input.documentType });
  return sanitizeGuest(updated, viewer);
};

export const removeGuestDocumentService = async (
  id: string,
  documentId: string,
  viewer: ViewerContext
): Promise<SanitizedGuest> => {
  if (!canCreateGuests(viewer.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  const guest = await getGuestOrThrow(id, viewer);
  const before = guest.idProofImages?.length ?? 0;
  guest.idProofImages = (guest.idProofImages ?? []).filter(
    (doc) => doc._id?.toString() !== documentId
  );
  if (guest.idProofImages.length === before) {
    throw new NotFoundError('Document not found');
  }
  guest.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateGuestRepository(guest);
  await logAudit('guest.document_removed', id, viewer, { documentId });
  return sanitizeGuest(updated, viewer);
};

export const blacklistGuestService = async (
  id: string,
  input: BlacklistGuestInput,
  viewer: ViewerContext
): Promise<SanitizedGuest> => {
  if (!canBlacklistGuests(viewer.role)) {
    throw new ForbiddenError('Only owner/manager can blacklist guests');
  }
  const guest = await getGuestOrThrow(id, viewer);
  guest.isBlacklisted = true;
  guest.blacklistReason = input.reason;
  guest.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateGuestRepository(guest);
  await logAudit('guest.blacklisted', id, viewer, { reason: input.reason });
  return sanitizeGuest(updated, viewer);
};

export const unblockGuestService = async (
  id: string,
  viewer: ViewerContext
): Promise<SanitizedGuest> => {
  if (!canBlacklistGuests(viewer.role)) {
    throw new ForbiddenError('Only owner/manager can unblock guests');
  }
  const guest = await getGuestOrThrow(id, viewer);
  guest.isBlacklisted = false;
  guest.blacklistReason = undefined;
  guest.updatedBy = new Types.ObjectId(viewer.userId);
  const updated = await updateGuestRepository(guest);
  await logAudit('guest.unblocked', id, viewer);
  return sanitizeGuest(updated, viewer);
};
