import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID') });
export const listQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().optional() });

export const settingsSchema = z.object({
  referralEnabled: z.boolean(),
  referralRewardType: z.enum(['flat', 'percentage', 'coupon', 'free_upgrade', 'free_breakfast']),
  flatReward: z.coerce.number().min(0),
  percentageReward: z.coerce.number().min(0).max(100),
  couponReward: z.string().max(40).optional().or(z.literal('')),
  rewardExpiryDays: z.coerce.number().int().min(1).max(3650),
  referralTerms: z.string().max(2000).optional().or(z.literal('')),
  maximumReferrals: z.coerce.number().int().min(1).max(10000),
  minimumBookingAmount: z.coerce.number().min(0),
  referralValidityDays: z.coerce.number().int().min(1).max(3650),
  loyaltyEnabled: z.boolean(),
  pointsPerBooking: z.coerce.number().int().min(0),
  bonusPoints: z.coerce.number().int().min(0),
  birthdayBonus: z.coerce.number().int().min(0),
  festivalBonus: z.coerce.number().int().min(0),
  vipMultiplier: z.coerce.number().min(1).max(10),
  redemptionMinimumPoints: z.coerce.number().int().min(0),
  redemptionValuePerPoint: z.coerce.number().min(0),
  pointExpiryDays: z.coerce.number().int().min(1).max(3650),
});

export const codeSchema = z.object({ guestId: z.string().regex(/^[0-9a-fA-F]{24}$/) });
export const inviteSchema = z.object({
  guestId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  recipient: z.string().trim().min(5).max(120),
  channel: z.enum(['whatsapp', 'email', 'sms']).default('whatsapp'),
});
export const acceptReferralSchema = z.object({
  code: z.string().trim().min(4).max(40),
  referredGuestId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});
export const issueRewardSchema = z.object({
  inviteId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  bookingAmount: z.coerce.number().min(0).optional(),
});
export const adjustPointsSchema = z.object({
  guestId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  points: z.coerce.number().int(),
  reason: z.string().trim().min(2).max(300),
});
export const earnPointsSchema = z.object({
  guestId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  amount: z.coerce.number().min(0).optional(),
  reason: z.string().trim().min(2).max(300).optional(),
});
export const redeemPointsSchema = z.object({
  guestId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  points: z.coerce.number().int().min(1),
  rewardType: z.enum(['points', 'coupon', 'flat', 'upgrade', 'breakfast']).default('points'),
  notes: z.string().max(300).optional(),
});
export const analyticsQuerySchema = z.object({ months: z.coerce.number().int().min(1).max(24).default(6) });

export type ListQuery = z.infer<typeof listQuerySchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type CodeInput = z.infer<typeof codeSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type AcceptReferralInput = z.infer<typeof acceptReferralSchema>;
export type IssueRewardInput = z.infer<typeof issueRewardSchema>;
export type AdjustPointsInput = z.infer<typeof adjustPointsSchema>;
export type EarnPointsInput = z.infer<typeof earnPointsSchema>;
export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
