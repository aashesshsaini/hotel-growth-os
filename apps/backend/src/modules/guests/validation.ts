import { z } from 'zod';
import { paginationSchema, objectIdSchema } from '../../validations/common';
import {
  FOOD_PREFERENCES,
  GUEST_SOURCES,
  GUEST_TYPES,
  ID_PROOF_TYPES,
  isValidIndianPhone,
} from './guest.constants';

const optionalDate = z.coerce.date().optional();

const notFutureDate = (label: string) =>
  optionalDate.refine((d) => !d || d <= new Date(), `${label} cannot be in the future`);

const indianPhoneSchema = z
  .string()
  .min(10)
  .max(15)
  .refine(isValidIndianPhone, 'Invalid Indian phone number');

const optionalIndianPhoneSchema = z
  .string()
  .optional()
  .refine((v) => !v || isValidIndianPhone(v), 'Invalid Indian phone number');

const guestBaseFields = {
  fullName: z.string().min(2).max(120).optional(),
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: indianPhoneSchema.optional(),
  alternatePhone: optionalIndianPhoneSchema,
  gender: z.string().max(20).optional(),
  dateOfBirth: notFutureDate('Date of birth'),
  anniversaryDate: notFutureDate('Anniversary date'),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  idProofType: z.enum(ID_PROOF_TYPES).optional(),
  idProofNumber: z.string().max(50).optional(),
  profileImage: z.string().url().optional().or(z.literal('')),
  guestType: z.enum(GUEST_TYPES).optional(),
  source: z.enum(GUEST_SOURCES).optional(),
  preferences: z.array(z.string()).optional(),
  foodPreference: z.enum(FOOD_PREFERENCES).optional(),
  roomPreference: z.string().max(200).optional(),
  specialRequests: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
  marketingConsent: z.boolean().optional(),
  whatsappConsent: z.boolean().optional(),
  emailConsent: z.boolean().optional(),
  isVip: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
};

export const listGuestsQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  guestType: z.enum(GUEST_TYPES).optional(),
  source: z.enum(GUEST_SOURCES).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  isRepeatGuest: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  isVip: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  isBlacklisted: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  marketingConsent: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  whatsappConsent: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  birthdayMonth: z.coerce.number().int().min(1).max(12).optional(),
  anniversaryMonth: z.coerce.number().int().min(1).max(12).optional(),
  minTotalSpend: z.coerce.number().min(0).optional(),
  maxTotalSpend: z.coerce.number().min(0).optional(),
  lastBookingFrom: z.coerce.date().optional(),
  lastBookingTo: z.coerce.date().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  tags: z.string().optional(),
  campaignEligible: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  notBookedSinceDays: z.coerce.number().int().min(1).optional(),
  minVisitCount: z.coerce.number().int().min(1).optional(),
});

export const listRepeatGuestsQuerySchema = paginationSchema.extend({
  hotelId: objectIdSchema.optional(),
  minVisitCount: z.coerce.number().int().min(2).optional().default(2),
});

export const guestIdParamSchema = z.object({
  id: objectIdSchema,
});

export const guestDocumentParamSchema = z.object({
  id: objectIdSchema,
  documentId: objectIdSchema,
});

export const createGuestSchema = z
  .object({
    hotelId: objectIdSchema.optional(),
    ...guestBaseFields,
    fullName: z.string().min(2).max(120).optional(),
    name: z.string().min(2).max(120).optional(),
    phone: indianPhoneSchema,
  })
  .refine((data) => !!(data.fullName || data.name), {
    message: 'Full name is required',
    path: ['fullName'],
  });

export const updateGuestSchema = z.object({
  ...guestBaseFields,
});

export const mergeGuestsSchema = z.object({
  primaryGuestId: objectIdSchema,
  duplicateGuestId: objectIdSchema,
});

export const updateGuestPreferencesSchema = z.object({
  preferences: z.array(z.string()).optional(),
  foodPreference: z.enum(FOOD_PREFERENCES).optional(),
  roomPreference: z.string().max(200).optional(),
  specialRequests: z.string().max(500).optional(),
});

export const updateGuestTagsSchema = z.object({
  tags: z.array(z.string()).min(1),
  mode: z.enum(['replace', 'add', 'remove']).optional().default('replace'),
});

export const uploadGuestDocumentSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  documentType: z.string().max(50).optional(),
});

export const blacklistGuestSchema = z.object({
  reason: z.string().min(3).max(500),
});

export type ListGuestsQuery = z.infer<typeof listGuestsQuerySchema>;
export type ListRepeatGuestsQuery = z.infer<typeof listRepeatGuestsQuerySchema>;
export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;
export type MergeGuestsInput = z.infer<typeof mergeGuestsSchema>;
export type UpdateGuestPreferencesInput = z.infer<typeof updateGuestPreferencesSchema>;
export type UpdateGuestTagsInput = z.infer<typeof updateGuestTagsSchema>;
export type UploadGuestDocumentInput = z.infer<typeof uploadGuestDocumentSchema>;
export type BlacklistGuestInput = z.infer<typeof blacklistGuestSchema>;
