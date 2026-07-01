import { FilterQuery, Types } from 'mongoose';
import { AuditLog, Hotel, User } from '../../models';
import { paginate } from '../../utils/pagination';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { comparePassword, hashPassword } from '../../utils/password';
import { ListQuery, CreateInput, UpdateInput, HotelSettingsInput, ChangePasswordInput } from './validation';

interface Viewer { userId: string; role: string; hotelId?: string }

const assertAccess = (doc: unknown, viewer: Viewer): void => {
  if (viewer.role !== 'super_admin' && String((doc as { _id?: unknown })._id) !== viewer.hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const SETTINGS_MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager'];

const assertCanManageSettings = (viewer: Viewer): void => {
  if (!SETTINGS_MANAGE_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to manage hotel settings');
  }
};

const resolveHotelId = (viewer: Viewer, inputHotelId?: string): string => {
  const hotelId = viewer.role === 'super_admin' && inputHotelId ? inputHotelId : viewer.hotelId;
  if (!hotelId) throw new ValidationError('Hotel ID is required');
  return hotelId;
};

const mapHotelSettings = (hotel: InstanceType<typeof Hotel>) => ({
  general: {
    name: hotel.name,
    displayName: hotel.settings?.displayName ?? hotel.name,
    businessType: hotel.settings?.businessType ?? 'hotel',
    description: hotel.settings?.description ?? '',
    establishedYear: hotel.settings?.establishedYear ?? '',
    website: hotel.settings?.website ?? '',
    businessRegistrationNumber: hotel.settings?.businessRegistrationNumber ?? '',
  },
  branding: {
    logo: hotel.settings?.logo ?? '',
    coverImage: hotel.settings?.coverImage ?? '',
    primaryColor: hotel.settings?.branding?.primaryColor ?? '#4f46e5',
    secondaryColor: hotel.settings?.branding?.secondaryColor ?? '#0f172a',
    tagline: hotel.settings?.branding?.tagline ?? '',
    description: hotel.settings?.branding?.description ?? '',
    signature: hotel.settings?.branding?.signature ?? '',
  },
  contact: {
    primaryPhone: hotel.phone,
    secondaryPhone: hotel.settings?.contact?.secondaryPhone ?? '',
    primaryEmail: hotel.email,
    supportEmail: hotel.settings?.contact?.supportEmail ?? '',
    reservationEmail: hotel.settings?.contact?.reservationEmail ?? '',
    address: hotel.address?.street ?? '',
    city: hotel.address?.city ?? '',
    state: hotel.address?.state ?? '',
    country: hotel.address?.country ?? 'India',
    postalCode: hotel.address?.pincode ?? '',
    googleMapUrl: hotel.settings?.contact?.googleMapUrl ?? '',
  },
  preferences: {
    timezone: hotel.settings?.timezone ?? 'Asia/Kolkata',
    currency: hotel.settings?.currency ?? 'INR',
    dateFormat: hotel.settings?.preferences?.dateFormat ?? 'DD/MM/YYYY',
    timeFormat: hotel.settings?.preferences?.timeFormat ?? '24h',
    language: hotel.settings?.preferences?.language ?? 'en',
    weekStartDay: hotel.settings?.preferences?.weekStartDay ?? 'monday',
    businessHours: {
      openTime: hotel.settings?.preferences?.businessHours?.openTime ?? '09:00',
      closeTime: hotel.settings?.preferences?.businessHours?.closeTime ?? '18:00',
      days: hotel.settings?.preferences?.businessHours?.days ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    },
  },
  review: {
    googleReviewUrl: hotel.settings?.googleReviewLink ?? '',
    automationEnabled: hotel.settings?.review?.automationEnabled ?? true,
    internalFeedbackEnabled: hotel.settings?.review?.internalFeedbackEnabled ?? true,
    reminderEnabled: hotel.settings?.review?.reminderEnabled ?? true,
    maxReminderCount: hotel.settings?.review?.maxReminderCount ?? 2,
    delayMinutes: hotel.settings?.review?.delayMinutes ?? 120,
    signature: hotel.settings?.review?.signature ?? '',
  },
  communication: {
    whatsappBusinessNumber: hotel.settings?.communication?.whatsappBusinessNumber ?? hotel.whatsappNumber ?? '',
    senderName: hotel.settings?.communication?.senderName ?? '',
    businessEmail: hotel.settings?.communication?.businessEmail ?? hotel.email,
    replyToEmail: hotel.settings?.communication?.replyToEmail ?? hotel.email,
    emailSignature: hotel.settings?.communication?.emailSignature ?? '',
    defaultSenderName: hotel.settings?.communication?.defaultSenderName ?? hotel.name,
    enabled: hotel.settings?.communication?.enabled ?? true,
  },
  notifications: {
    bookings: hotel.settings?.notifications?.bookings ?? true,
    reviews: hotel.settings?.notifications?.reviews ?? true,
    payments: hotel.settings?.notifications?.payments ?? true,
    maintenance: hotel.settings?.notifications?.maintenance ?? true,
    staff: hotel.settings?.notifications?.staff ?? true,
    marketing: hotel.settings?.notifications?.marketing ?? false,
  },
  security: {
    twoFactorEnabled: hotel.settings?.security?.twoFactorEnabled ?? false,
    sessionManagementEnabled: hotel.settings?.security?.sessionManagementEnabled ?? false,
  },
  futureIntegrations: {
    whatsappProvider: 'configuration_ready',
    emailProvider: 'configuration_ready',
    paymentGateway: 'configuration_ready',
  },
});

export const list = async (query: ListQuery, viewer: Viewer) => {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  return paginate(Hotel, { page: query.page, limit: query.limit, search: query.search, searchFields: ['name', 'email', 'phone', 'slug'], sortBy: query.sortBy, sortOrder: query.sortOrder }, filter as FilterQuery<any>);
};

export const getById = async (id: string, viewer: Viewer) => {
  const doc = await Hotel.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!doc) throw new NotFoundError('Hotel not found');
  assertAccess(doc, viewer);
  return doc;
};

export const create = async (input: CreateInput, viewer: Viewer) => {
  
  return Hotel.create({  ...input,  createdBy: viewer.userId, updatedBy: viewer.userId });
};

export const update = async (id: string, input: UpdateInput, viewer: Viewer) => {
  const doc = await getById(id, viewer);
  Object.assign(doc, input, { updatedBy: viewer.userId });
  await doc.save();
  return doc;
};

export const remove = async (id: string, viewer: Viewer) => {
  const doc = await getById(id, viewer);
  Object.assign(doc, { isDeleted: true, deletedAt: new Date(), deletedBy: viewer.userId });
  await doc.save();
};

export const getSettings = async (viewer: Viewer, hotelIdInput?: string) => {
  const hotelId = resolveHotelId(viewer, hotelIdInput);
  const hotel = await Hotel.findOne({ _id: hotelId, isDeleted: { $ne: true } });
  if (!hotel) throw new NotFoundError('Hotel not found');
  assertAccess(hotel, viewer);
  return mapHotelSettings(hotel);
};

const existingHotelSettings = (hotel: InstanceType<typeof Hotel>) => {
  const settings = hotel.settings as { toObject?: () => Record<string, unknown> } | undefined;
  return settings?.toObject?.() ?? { ...(settings ?? {}) };
};

const resolveHotelOwnerId = async (hotel: InstanceType<typeof Hotel>): Promise<Types.ObjectId | undefined> => {
  if (hotel.ownerId) return hotel.ownerId as Types.ObjectId;
  const owner =
    (await User.findOne({ hotelId: hotel._id, role: 'hotel_owner', isDeleted: { $ne: true } }).select('_id')) ??
    (await User.findOne({ hotelId: hotel._id, isDeleted: { $ne: true } }).select('_id').sort({ createdAt: 1 }));
  return owner?._id as Types.ObjectId | undefined;
};

export const updateSettings = async (input: HotelSettingsInput, viewer: Viewer) => {
  assertCanManageSettings(viewer);
  const hotelId = resolveHotelId(viewer);
  const hotel = await Hotel.findOne({ _id: hotelId, isDeleted: { $ne: true } });
  if (!hotel) throw new NotFoundError('Hotel not found');
  assertAccess(hotel, viewer);
  const previous = mapHotelSettings(hotel);

  const updatePayload: Record<string, unknown> = {
    name: input.general.name,
    email: input.contact.primaryEmail || hotel.email,
    phone: input.contact.primaryPhone || hotel.phone,
    whatsappNumber: input.communication.whatsappBusinessNumber || hotel.whatsappNumber,
    address: {
      street: input.contact.address,
      city: input.contact.city,
      state: input.contact.state,
      pincode: input.contact.postalCode,
      country: input.contact.country,
    },
    settings: {
      ...existingHotelSettings(hotel),
      currency: input.preferences.currency,
      timezone: input.preferences.timezone,
      googleReviewLink: input.review.googleReviewUrl,
      logo: input.branding.logo,
      website: input.general.website,
      displayName: input.general.displayName,
      businessType: input.general.businessType,
      description: input.general.description,
      establishedYear: input.general.establishedYear === '' ? undefined : input.general.establishedYear,
      businessRegistrationNumber: input.general.businessRegistrationNumber,
      coverImage: input.branding.coverImage,
      branding: {
        primaryColor: input.branding.primaryColor,
        secondaryColor: input.branding.secondaryColor,
        tagline: input.branding.tagline,
        description: input.branding.description,
        signature: input.branding.signature,
      },
      contact: {
        secondaryPhone: input.contact.secondaryPhone,
        supportEmail: input.contact.supportEmail,
        reservationEmail: input.contact.reservationEmail,
        googleMapUrl: input.contact.googleMapUrl,
      },
      preferences: input.preferences,
      review: {
        automationEnabled: input.review.automationEnabled,
        internalFeedbackEnabled: input.review.internalFeedbackEnabled,
        reminderEnabled: input.review.reminderEnabled,
        maxReminderCount: input.review.maxReminderCount,
        delayMinutes: input.review.delayMinutes,
        signature: input.review.signature,
      },
      communication: input.communication,
      notifications: input.notifications,
      security: input.security ?? {},
    },
    updatedBy: viewer.userId,
  };

  if (!hotel.ownerId) {
    const ownerId = await resolveHotelOwnerId(hotel);
    if (ownerId) updatePayload.ownerId = ownerId;
  }

  const updated = await Hotel.findOneAndUpdate(
    { _id: hotelId, isDeleted: { $ne: true } },
    { $set: updatePayload },
    { new: true, runValidators: true }
  );
  if (!updated) throw new NotFoundError('Hotel not found');

  await AuditLog.create({
    hotelId: updated._id,
    userId: viewer.userId,
    action: 'hotel.settings_updated',
    entity: 'Hotel',
    entityId: updated._id,
    changes: { previous, next: mapHotelSettings(updated) },
  });
  return mapHotelSettings(updated);
};

export const changePassword = async (input: ChangePasswordInput, viewer: Viewer) => {
  assertCanManageSettings(viewer);
  const user = await User.findById(viewer.userId).select('+password');
  if (!user) throw new NotFoundError('User not found');
  const valid = await comparePassword(input.currentPassword, user.password);
  if (!valid) throw new ForbiddenError('Current password is incorrect');
  user.password = await hashPassword(input.newPassword);
  await user.save();
  await AuditLog.create({
    hotelId: viewer.hotelId,
    userId: viewer.userId,
    action: 'hotel.security_password_changed',
    entity: 'User',
    entityId: user._id,
  });
  return { changed: true };
};
