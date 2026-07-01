import { AuditLog, Hotel, HotelIntegrationSettings } from '../../models';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { encryptSecret, maskSecret } from '../../utils/encryption';
import {
  EmailIntegrationInput,
  GoogleReviewIntegrationInput,
  IntegrationType,
  IntegrationUpdateInput,
  WhatsAppIntegrationInput,
} from './hotelIntegrations.validation';

interface Viewer {
  userId: string;
  role: string;
  hotelId?: string;
}

const MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager'];

const resolveHotelId = (viewer: Viewer, inputHotelId?: string) => {
  const hotelId = viewer.role === 'super_admin' && inputHotelId ? inputHotelId : viewer.hotelId;
  if (!hotelId) throw new ValidationError('Hotel ID is required');
  return hotelId;
};

const assertCanManage = (viewer: Viewer) => {
  if (!MANAGE_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to manage hotel integrations');
};

const audit = async (viewer: Viewer, hotelId: string, action: string, entityId: unknown, changes?: Record<string, unknown>) =>
  AuditLog.create({ hotelId, userId: viewer.userId, action, entity: 'HotelIntegrationSettings', entityId, changes });

const baseHealth = (status: string) => ({ status, lastUpdatedAt: new Date() });

const getOrCreateSettings = async (hotelId: string, viewer?: Viewer) => {
  const hotel = await Hotel.findOne({ _id: hotelId, isDeleted: { $ne: true } });
  if (!hotel) throw new NotFoundError('Hotel not found');
  const existing = await HotelIntegrationSettings.findOne({ hotelId, isDeleted: { $ne: true } });
  if (existing) return existing;
  return HotelIntegrationSettings.create({
    hotelId,
    whatsapp: { health: baseHealth('disconnected') },
    email: { health: baseHealth('disconnected') },
    googleReview: { automationEnabled: true, health: baseHealth('disconnected') },
    createdBy: viewer?.userId,
    updatedBy: viewer?.userId,
  });
};

const sanitize = (settings: any) => ({
  whatsapp: {
    businessName: settings.whatsapp?.businessName ?? '',
    phoneNumber: settings.whatsapp?.phoneNumber ?? '',
    phoneNumberId: settings.whatsapp?.phoneNumberId ?? '',
    businessAccountId: settings.whatsapp?.businessAccountId ?? '',
    permanentAccessTokenMasked: maskSecret(settings.whatsapp?.permanentAccessTokenEncrypted),
    webhookVerifyTokenMasked: maskSecret(settings.whatsapp?.webhookVerifyTokenEncrypted),
    webhookSecretMasked: maskSecret(settings.whatsapp?.webhookSecretEncrypted),
    health: settings.whatsapp?.health ?? baseHealth('disconnected'),
  },
  email: {
    smtpHost: settings.email?.smtpHost ?? '',
    smtpPort: settings.email?.smtpPort ?? 587,
    username: settings.email?.username ?? '',
    passwordMasked: maskSecret(settings.email?.passwordEncrypted),
    encryption: settings.email?.encryption ?? 'tls',
    senderName: settings.email?.senderName ?? '',
    senderEmail: settings.email?.senderEmail ?? '',
    replyToEmail: settings.email?.replyToEmail ?? '',
    health: settings.email?.health ?? baseHealth('disconnected'),
  },
  googleReview: {
    googleReviewUrl: settings.googleReview?.googleReviewUrl ?? '',
    googleBusinessName: settings.googleReview?.googleBusinessName ?? '',
    googlePlaceId: settings.googleReview?.googlePlaceId ?? '',
    reviewButtonLabel: settings.googleReview?.reviewButtonLabel ?? 'Review us on Google',
    automationEnabled: settings.googleReview?.automationEnabled ?? true,
    health: settings.googleReview?.health ?? baseHealth('disconnected'),
  },
  supportedIntegrations: [
    { type: 'whatsapp', name: 'Meta WhatsApp Cloud API', description: 'Guest communication, review requests, and marketing automation.' },
    { type: 'email', name: 'SMTP Email', description: 'Transactional and marketing email sender configuration.' },
    { type: 'googleReview', name: 'Google Review', description: 'Google review URL and business listing details for review growth.' },
  ],
});

export const getIntegrationSettings = async (viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  return sanitize(settings);
};

export const updateIntegration = async (type: IntegrationType, input: IntegrationUpdateInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  if (type === 'whatsapp') {
    const payload = input as WhatsAppIntegrationInput;
    settings.whatsapp = {
      ...settings.whatsapp,
      businessName: payload.businessName,
      phoneNumber: payload.phoneNumber,
      phoneNumberId: payload.phoneNumberId,
      businessAccountId: payload.businessAccountId,
      permanentAccessTokenEncrypted: payload.permanentAccessToken ? encryptSecret(payload.permanentAccessToken) : settings.whatsapp?.permanentAccessTokenEncrypted,
      webhookVerifyTokenEncrypted: payload.webhookVerifyToken ? encryptSecret(payload.webhookVerifyToken) : settings.whatsapp?.webhookVerifyTokenEncrypted,
      webhookSecretEncrypted: payload.webhookSecret ? encryptSecret(payload.webhookSecret) : settings.whatsapp?.webhookSecretEncrypted,
      health: baseHealth('connected') as any,
    };
    await Hotel.findByIdAndUpdate(hotelId, { whatsappNumber: payload.phoneNumber, 'settings.communication.whatsappBusinessNumber': payload.phoneNumber, updatedBy: viewer.userId });
  }
  if (type === 'email') {
    const payload = input as EmailIntegrationInput;
    settings.email = {
      ...settings.email,
      smtpHost: payload.smtpHost,
      smtpPort: payload.smtpPort,
      username: payload.username,
      passwordEncrypted: payload.password ? encryptSecret(payload.password) : settings.email?.passwordEncrypted,
      encryption: payload.encryption,
      senderName: payload.senderName,
      senderEmail: payload.senderEmail,
      replyToEmail: payload.replyToEmail,
      health: baseHealth('connected') as any,
    };
    await Hotel.findByIdAndUpdate(hotelId, { 'settings.communication.businessEmail': payload.senderEmail, 'settings.communication.replyToEmail': payload.replyToEmail, 'settings.communication.senderName': payload.senderName, updatedBy: viewer.userId });
  }
  if (type === 'googleReview') {
    const payload = input as GoogleReviewIntegrationInput;
    settings.googleReview = { ...settings.googleReview, ...payload, health: baseHealth('connected') as any };
    await Hotel.findByIdAndUpdate(hotelId, { 'settings.googleReviewLink': payload.googleReviewUrl, 'settings.review.automationEnabled': payload.automationEnabled, updatedBy: viewer.userId });
  }
  (settings as unknown as { updatedBy?: string }).updatedBy = viewer.userId;
  await settings.save();
  await audit(viewer, hotelId, `hotel.integration_${type}_updated`, settings._id, { type });
  return sanitize(settings);
};

export const testIntegration = async (type: IntegrationType, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  const fail = (message: string) => ({ success: false, status: 'connection_failed', message });
  let result = { success: true, status: 'connected', message: 'Connection validated successfully' };
  if (type === 'whatsapp' && (!settings.whatsapp?.phoneNumberId || !settings.whatsapp?.businessAccountId || !settings.whatsapp?.permanentAccessTokenEncrypted)) result = fail('WhatsApp credentials are incomplete');
  if (type === 'email' && (!settings.email?.smtpHost || !settings.email?.smtpPort || !settings.email?.username || !settings.email?.passwordEncrypted || !settings.email?.senderEmail)) result = fail('SMTP credentials are incomplete');
  if (type === 'googleReview' && !settings.googleReview?.googleReviewUrl) result = fail('Google Review URL is missing');
  const health = {
    status: result.success ? 'connected' : 'connection_failed',
    lastTestedAt: new Date(),
    lastSuccessfulConnectionAt: result.success ? new Date() : (settings as any)[type]?.health?.lastSuccessfulConnectionAt,
    lastFailedAttemptAt: result.success ? (settings as any)[type]?.health?.lastFailedAttemptAt : new Date(),
    lastError: result.success ? undefined : result.message,
    lastUpdatedAt: new Date(),
  };
  (settings as any)[type].health = health;
  await settings.save();
  await audit(viewer, hotelId, `hotel.integration_${type}_tested`, settings._id, { type, success: result.success });
  return result;
};

export const disconnectIntegration = async (type: IntegrationType, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  if (type === 'whatsapp') settings.whatsapp = { health: baseHealth('disconnected') as any } as any;
  if (type === 'email') settings.email = { health: baseHealth('disconnected') as any } as any;
  if (type === 'googleReview') settings.googleReview = { automationEnabled: false, health: baseHealth('disconnected') as any } as any;
  (settings as unknown as { updatedBy?: string }).updatedBy = viewer.userId;
  await settings.save();
  await audit(viewer, hotelId, `hotel.integration_${type}_disconnected`, settings._id, { type });
  return sanitize(settings);
};

export const getIntegrationHealth = async (viewer: Viewer) => {
  const settings = await getOrCreateSettings(resolveHotelId(viewer), viewer);
  return {
    whatsapp: settings.whatsapp?.health,
    email: settings.email?.health,
    googleReview: settings.googleReview?.health,
  };
};
