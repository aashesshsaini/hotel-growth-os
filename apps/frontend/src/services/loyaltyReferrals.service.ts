import { apiGet, apiPost, apiPut } from '@/lib/api';
import type { ListParams, PaginatedResponse } from '@/types';

export interface LoyaltySettings {
  _id?: string;
  referralEnabled: boolean;
  referralRewardType: 'flat' | 'percentage' | 'coupon' | 'free_upgrade' | 'free_breakfast';
  flatReward: number;
  percentageReward: number;
  couponReward?: string;
  rewardExpiryDays: number;
  referralTerms?: string;
  maximumReferrals: number;
  minimumBookingAmount: number;
  referralValidityDays: number;
  loyaltyEnabled: boolean;
  pointsPerBooking: number;
  bonusPoints: number;
  birthdayBonus: number;
  festivalBonus: number;
  vipMultiplier: number;
  redemptionMinimumPoints: number;
  redemptionValuePerPoint: number;
  pointExpiryDays: number;
}
export interface ReferralCode { _id?: string; id?: string; guestId: unknown; code: string; referralLink: string; status: string; useCount: number; maxUses: number; expiresAt?: string }
export interface ReferralInvite { _id?: string; id?: string; code: string; channel: string; status: string; recipientMasked: string; rewardStatus: string; sentAt?: string; acceptedAt?: string; rewardedAt?: string }
export interface LoyaltyTransaction { _id?: string; id?: string; guestId: unknown; type: string; points: number; amountValue: number; balanceAfter: number; status: string; reason: string; createdAt?: string }
export interface RewardRedemption { _id?: string; id?: string; guestId: unknown; rewardType: string; pointsRedeemed: number; amountValue: number; status: string; createdAt?: string }
export interface LoyaltyDashboard { totalReferrals: number; successfulReferrals: number; pendingReferrals: number; rewardIssued: number; loyaltyMembers: number; pointsIssued: number; pointsRedeemed: number; topReferrers: unknown[]; topLoyalGuests: unknown[] }
export interface LoyaltyAnalytics { referralConversion: number; bookingConversion: number; rewardUsage: number; repeatBookingRate: number; loyaltyGrowth: number; revenueFromReferrals: number; monthlyTrends: Array<{ month: string; points: number; count: number }> }

export const entityId = (entity: { _id?: string; id?: string }) => entity.id || entity._id || '';
export const getLoyaltyDashboard = () => apiGet<LoyaltyDashboard>('/loyalty-referrals/dashboard');
export const getLoyaltyAnalytics = (params?: Record<string, unknown>) => apiGet<LoyaltyAnalytics>('/loyalty-referrals/analytics', params);
export const getLoyaltySettings = () => apiGet<LoyaltySettings>('/loyalty-referrals/settings');
export const updateLoyaltySettings = (payload: LoyaltySettings) => apiPut<LoyaltySettings>('/loyalty-referrals/settings', payload);
export const exportLoyaltyReports = () => apiGet('/loyalty-referrals/export');
export const getReferralCodes = (params?: ListParams) => apiGet<PaginatedResponse<ReferralCode>>('/loyalty-referrals/referrals/codes', params);
export const generateReferralCode = (payload: Record<string, unknown>) => apiPost<ReferralCode>('/loyalty-referrals/referrals/code', payload);
export const getReferralInvites = (params?: ListParams) => apiGet<PaginatedResponse<ReferralInvite>>('/loyalty-referrals/referrals/invitations', params);
export const sendReferralInvite = (payload: Record<string, unknown>) => apiPost<ReferralInvite>('/loyalty-referrals/referrals/invite', payload);
export const acceptReferral = (payload: Record<string, unknown>) => apiPost<ReferralInvite>('/loyalty-referrals/referrals/accept', payload);
export const issueReferralReward = (payload: Record<string, unknown>) => apiPost<ReferralInvite>('/loyalty-referrals/referrals/reward', payload);
export const getLoyaltyTransactions = (params?: ListParams) => apiGet<PaginatedResponse<LoyaltyTransaction>>('/loyalty-referrals/transactions', params);
export const earnLoyaltyPoints = (payload: Record<string, unknown>) => apiPost<LoyaltyTransaction>('/loyalty-referrals/points/earn', payload);
export const adjustLoyaltyPoints = (payload: Record<string, unknown>) => apiPost<LoyaltyTransaction>('/loyalty-referrals/points/adjust', payload);
export const redeemLoyaltyPoints = (payload: Record<string, unknown>) => apiPost<RewardRedemption>('/loyalty-referrals/points/redeem', payload);
export const getRewardRedemptions = (params?: ListParams) => apiGet<PaginatedResponse<RewardRedemption>>('/loyalty-referrals/redemptions', params);
