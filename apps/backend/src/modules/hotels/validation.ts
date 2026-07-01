import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';

export const idParamSchema = z.object({ id: objectIdSchema });
export const listQuerySchema = paginationSchema.extend({ hotelId: objectIdSchema.optional(), status: z.string().optional() });

export const createSchema = z.object({
  hotelId: objectIdSchema.optional(),
  name: z.string().min(2), slug: z.string().min(2).optional(), email: z.string().email().optional().or(z.literal('')), phone: z.string().optional(), isActive: z.boolean().optional(), settings: z.record(z.unknown()).optional(),
});
export const updateSchema = createSchema.partial();

const phoneSchema = z.string().regex(/^\+?[0-9\s-]{7,20}$/, 'Invalid phone number').optional().or(z.literal(''));
const optionalEmailSchema = z.string().email().optional().or(z.literal(''));
const optionalUrlSchema = z.string().url().optional().or(z.literal(''));
const colorSchema = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid color').optional().or(z.literal(''));
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time').optional().or(z.literal(''));

export const hotelSettingsSchema = z.object({
  general: z.object({
    name: z.string().min(2),
    displayName: z.string().min(2).optional().or(z.literal('')),
    businessType: z.string().min(2).optional().or(z.literal('')),
    description: z.string().max(2000).optional().or(z.literal('')),
    establishedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional().or(z.literal('')),
    website: optionalUrlSchema,
    businessRegistrationNumber: z.string().max(100).optional().or(z.literal('')),
  }),
  branding: z.object({
    logo: optionalUrlSchema,
    coverImage: optionalUrlSchema,
    primaryColor: colorSchema,
    secondaryColor: colorSchema,
    tagline: z.string().max(200).optional().or(z.literal('')),
    description: z.string().max(1000).optional().or(z.literal('')),
    signature: z.string().max(500).optional().or(z.literal('')),
  }),
  contact: z.object({
    primaryPhone: phoneSchema,
    secondaryPhone: phoneSchema,
    primaryEmail: optionalEmailSchema,
    supportEmail: optionalEmailSchema,
    reservationEmail: optionalEmailSchema,
    address: z.string().max(500).optional().or(z.literal('')),
    city: z.string().min(1),
    state: z.string().min(1),
    country: z.string().min(1),
    postalCode: z.string().max(20).optional().or(z.literal('')),
    googleMapUrl: optionalUrlSchema,
  }),
  preferences: z.object({
    timezone: z.string().min(2),
    currency: z.string().min(3).max(3),
    dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).default('DD/MM/YYYY'),
    timeFormat: z.enum(['12h', '24h']).default('24h'),
    language: z.string().min(2).default('en'),
    weekStartDay: z.enum(['sunday', 'monday']).default('monday'),
    businessHours: z.object({
      openTime: timeSchema,
      closeTime: timeSchema,
      days: z.array(z.string()).default([]),
    }),
  }),
  review: z.object({
    googleReviewUrl: optionalUrlSchema,
    automationEnabled: z.boolean(),
    internalFeedbackEnabled: z.boolean(),
    reminderEnabled: z.boolean(),
    maxReminderCount: z.coerce.number().int().min(0).max(10),
    delayMinutes: z.coerce.number().int().min(0).max(43200),
    signature: z.string().max(500).optional().or(z.literal('')),
  }),
  communication: z.object({
    whatsappBusinessNumber: phoneSchema,
    senderName: z.string().max(100).optional().or(z.literal('')),
    businessEmail: optionalEmailSchema,
    replyToEmail: optionalEmailSchema,
    emailSignature: z.string().max(1000).optional().or(z.literal('')),
    defaultSenderName: z.string().max(100).optional().or(z.literal('')),
    enabled: z.boolean(),
  }),
  notifications: z.object({
    bookings: z.boolean(),
    reviews: z.boolean(),
    payments: z.boolean(),
    maintenance: z.boolean(),
    staff: z.boolean(),
    marketing: z.boolean(),
  }),
  security: z.object({
    twoFactorEnabled: z.boolean().optional(),
    sessionManagementEnabled: z.boolean().optional(),
  }).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateInput = z.infer<typeof createSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type HotelSettingsInput = z.infer<typeof hotelSettingsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
