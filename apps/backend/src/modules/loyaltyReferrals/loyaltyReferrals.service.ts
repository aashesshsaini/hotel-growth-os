import crypto from 'crypto';
import { FilterQuery, Types } from 'mongoose';
import { AuditLog, Booking, Guest, GuestWallet, LoyaltySettings, LoyaltyTransaction, ReferralCode, ReferralInvite, RewardRedemption } from '../../models';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { AcceptReferralInput, AdjustPointsInput, AnalyticsQuery, CodeInput, EarnPointsInput, InviteInput, IssueRewardInput, ListQuery, RedeemPointsInput, SettingsInput } from './loyaltyReferrals.validation';

const MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'];
const VIEW_ROLES = [...MANAGE_ROLES, 'reception_staff'];
interface Viewer { userId: string; role: string; hotelId?: string }

const resolveHotelId = (viewer: Viewer) => {
  if (!VIEW_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to view loyalty and referrals');
  if (!viewer.hotelId) throw new ValidationError('Hotel ID is required');
  return viewer.hotelId;
};
const assertCanManage = (viewer: Viewer) => {
  if (!MANAGE_ROLES.includes(viewer.role)) throw new ForbiddenError('You do not have permission to manage loyalty and referrals');
};
const maskContact = (value: string) => value.includes('@') ? `${value.slice(0, 2)}***@${value.split('@')[1]}` : `${value.slice(0, 2)}****${value.slice(-2)}`;
const audit = (viewer: Viewer, hotelId: string, action: string, entity: string, entityId: unknown, changes?: Record<string, unknown>) => AuditLog.create({ hotelId, userId: viewer.userId, action, entity, entityId, changes });

const getOrCreateSettings = async (hotelId: string, viewer?: Viewer) => {
  const existing = await LoyaltySettings.findOne({ hotelId, isDeleted: { $ne: true } });
  if (existing) return existing;
  return LoyaltySettings.create({ hotelId, createdBy: viewer?.userId, updatedBy: viewer?.userId });
};
const getGuest = async (hotelId: string, guestId: string) => {
  const guest = await Guest.findOne({ _id: guestId, hotelId, isDeleted: { $ne: true } });
  if (!guest) throw new NotFoundError('Guest not found');
  return guest;
};
const getOrCreateWallet = async (hotelId: string, guestId: string) => {
  const existing = await GuestWallet.findOne({ hotelId, guestId, isDeleted: { $ne: true } });
  if (existing) return existing;
  return GuestWallet.create({ hotelId, guestId });
};
const computeTier = (lifetimeEarned: number) => lifetimeEarned >= 50000 ? 'platinum' : lifetimeEarned >= 20000 ? 'gold' : lifetimeEarned >= 5000 ? 'silver' : 'standard';

const postTransaction = async ({ hotelId, guestId, points, type, reason, deduplicationKey, bookingId, referralInviteId, amountValue = 0, createdBy }: { hotelId: string; guestId: string; points: number; type: 'earn' | 'redeem' | 'adjust' | 'expire' | 'reverse' | 'referral_bonus'; reason: string; deduplicationKey: string; bookingId?: string; referralInviteId?: string; amountValue?: number; createdBy?: string }) => {
  const existing = await LoyaltyTransaction.findOne({ deduplicationKey, isDeleted: { $ne: true } });
  if (existing) return existing;
  const wallet = await getOrCreateWallet(hotelId, guestId);
  const nextBalance = Math.max(0, wallet.pointsBalance + points);
  const tx = await LoyaltyTransaction.create({ hotelId, guestId, bookingId, referralInviteId, type, points, amountValue, balanceAfter: nextBalance, status: 'posted', reason, deduplicationKey, createdBy, updatedBy: createdBy });
  wallet.pointsBalance = nextBalance;
  if (points > 0) wallet.lifetimeEarned += points;
  if (points < 0) wallet.lifetimeRedeemed += Math.abs(points);
  wallet.tier = computeTier(wallet.lifetimeEarned) as any;
  wallet.lastActivityAt = new Date();
  await wallet.save();
  await Guest.findByIdAndUpdate(guestId, { loyaltyPoints: wallet.pointsBalance });
  return tx;
};

export const getSettings = async (viewer: Viewer) => getOrCreateSettings(resolveHotelId(viewer), viewer);
export const updateSettings = async (input: SettingsInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  Object.assign(settings, input, { updatedBy: viewer.userId });
  await settings.save();
  await audit(viewer, hotelId, 'loyalty.settings_updated', 'LoyaltySettings', settings._id);
  return settings;
};

export const generateReferralCode = async (input: CodeInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  await getGuest(hotelId, input.guestId);
  const existing = await ReferralCode.findOne({ hotelId, guestId: input.guestId, status: 'active', isDeleted: { $ne: true } });
  if (existing) return existing;
  const code = `REF${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const referralLink = `/book?hotel=${hotelId}&ref=${code}`;
  return ReferralCode.create({ hotelId, guestId: input.guestId, code, referralLink, maxUses: settings.maximumReferrals, expiresAt: new Date(Date.now() + settings.referralValidityDays * 86400000), createdBy: viewer.userId, updatedBy: viewer.userId });
};

export const inviteReferral = async (input: InviteInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const code = await generateReferralCode({ guestId: input.guestId }, viewer);
  const deduplicationKey = `referral-invite:${hotelId}:${input.guestId}:${input.channel}:${input.recipient.toLowerCase()}`;
  const existing = await ReferralInvite.findOne({ deduplicationKey, isDeleted: { $ne: true } });
  if (existing) return existing;
  return ReferralInvite.create({ hotelId, referralCodeId: code._id, referrerGuestId: input.guestId, code: code.code, channel: input.channel, status: 'sent', recipientMasked: maskContact(input.recipient), rewardStatus: 'pending', sentAt: new Date(), deduplicationKey, createdBy: viewer.userId, updatedBy: viewer.userId });
};

export const acceptReferral = async (input: AcceptReferralInput, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const code = await ReferralCode.findOne({ hotelId, code: input.code.toUpperCase(), status: 'active', isDeleted: { $ne: true } });
  if (!code) throw new NotFoundError('Referral code not found');
  if (String(code.guestId) === input.referredGuestId) throw new ValidationError('Self referral is not allowed');
  await getGuest(hotelId, input.referredGuestId);
  if (code.expiresAt && code.expiresAt < new Date()) throw new ValidationError('Referral code expired');
  if (code.useCount >= code.maxUses) throw new ValidationError('Referral code usage limit reached');
  const invite = await ReferralInvite.findOneAndUpdate({ hotelId, code: code.code, referredGuestId: input.referredGuestId, isDeleted: { $ne: true } }, { status: input.bookingId ? 'booked' : 'accepted', referredGuestId: input.referredGuestId, bookingId: input.bookingId, acceptedAt: new Date(), bookedAt: input.bookingId ? new Date() : undefined }, { upsert: true, new: true, setDefaultsOnInsert: true });
  code.useCount += 1;
  await code.save();
  return invite;
};

export const issueReferralReward = async (input: IssueRewardInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const [settings, invite] = await Promise.all([getOrCreateSettings(hotelId, viewer), ReferralInvite.findOne({ _id: input.inviteId, hotelId, isDeleted: { $ne: true } })]);
  if (!invite) throw new NotFoundError('Referral invite not found');
  if (invite.rewardStatus === 'issued') throw new ValidationError('Referral reward already issued');
  if ((input.bookingAmount ?? 0) < settings.minimumBookingAmount) {
    invite.rewardStatus = 'not_eligible';
    await invite.save();
    return invite;
  }
  const points = settings.referralRewardType === 'percentage' ? Math.round((input.bookingAmount || 0) * (settings.percentageReward / 100)) : Math.round(settings.flatReward);
  await postTransaction({ hotelId, guestId: String(invite.referrerGuestId), points, type: 'referral_bonus', reason: 'Referral reward issued', referralInviteId: String(invite._id), deduplicationKey: `referral-reward:${invite._id}`, createdBy: viewer.userId });
  invite.status = 'rewarded';
  invite.rewardStatus = 'issued';
  invite.rewardedAt = new Date();
  await invite.save();
  return invite;
};

export const earnPoints = async (input: EarnPointsInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  const guest = await getGuest(hotelId, input.guestId);
  const base = input.amount ? Math.floor(input.amount / 1000) * settings.pointsPerBooking : settings.pointsPerBooking;
  const points = Math.round((base + settings.bonusPoints) * (guest.isVip ? settings.vipMultiplier : 1));
  return postTransaction({ hotelId, guestId: input.guestId, bookingId: input.bookingId, points, type: 'earn', reason: input.reason || 'Booking loyalty points awarded', deduplicationKey: input.bookingId ? `loyalty:booking:${input.bookingId}:earn` : `loyalty:manual:${crypto.randomUUID()}`, createdBy: viewer.userId });
};
export const adjustPoints = async (input: AdjustPointsInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  await getGuest(hotelId, input.guestId);
  return postTransaction({ hotelId, guestId: input.guestId, points: input.points, type: 'adjust', reason: input.reason, deduplicationKey: `loyalty:adjust:${crypto.randomUUID()}`, createdBy: viewer.userId });
};
export const redeemPoints = async (input: RedeemPointsInput, viewer: Viewer) => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer);
  const settings = await getOrCreateSettings(hotelId, viewer);
  const wallet = await getOrCreateWallet(hotelId, input.guestId);
  if (input.points < settings.redemptionMinimumPoints) throw new ValidationError('Minimum points not met');
  if (wallet.pointsBalance < input.points) throw new ValidationError('Insufficient points');
  const amountValue = input.points * settings.redemptionValuePerPoint;
  const tx = await postTransaction({ hotelId, guestId: input.guestId, points: -input.points, type: 'redeem', reason: input.notes || 'Points redeemed', amountValue, deduplicationKey: `loyalty:redeem:${crypto.randomUUID()}`, createdBy: viewer.userId });
  return RewardRedemption.create({ hotelId, guestId: input.guestId, transactionId: tx._id, rewardType: input.rewardType, pointsRedeemed: input.points, amountValue, status: 'approved', expiresAt: new Date(Date.now() + settings.rewardExpiryDays * 86400000), notes: input.notes, createdBy: viewer.userId, updatedBy: viewer.userId });
};

const list = async (model: any, filter: FilterQuery<any>, query: ListQuery) => {
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit), model.countDocuments(filter)]);
  return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } };
};
export const listReferralCodes = async (query: ListQuery, viewer: Viewer) => list(ReferralCode, { hotelId: resolveHotelId(viewer), isDeleted: { $ne: true } }, query);
export const listInvites = async (query: ListQuery, viewer: Viewer) => list(ReferralInvite, { hotelId: resolveHotelId(viewer), isDeleted: { $ne: true } }, query);
export const listTransactions = async (query: ListQuery, viewer: Viewer) => list(LoyaltyTransaction, { hotelId: resolveHotelId(viewer), isDeleted: { $ne: true } }, query);
export const listRedemptions = async (query: ListQuery, viewer: Viewer) => list(RewardRedemption, { hotelId: resolveHotelId(viewer), isDeleted: { $ne: true } }, query);

export const getDashboard = async (viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const [totalReferrals, successfulReferrals, pendingReferrals, rewardIssued, loyaltyMembers, pointsIssuedAgg, pointsRedeemedAgg, topReferrers, topLoyalGuests] = await Promise.all([
    ReferralInvite.countDocuments({ hotelId, isDeleted: { $ne: true } }),
    ReferralInvite.countDocuments({ hotelId, status: { $in: ['booked', 'rewarded'] }, isDeleted: { $ne: true } }),
    ReferralInvite.countDocuments({ hotelId, status: 'sent', isDeleted: { $ne: true } }),
    ReferralInvite.countDocuments({ hotelId, rewardStatus: 'issued', isDeleted: { $ne: true } }),
    GuestWallet.countDocuments({ hotelId, pointsBalance: { $gt: 0 }, isDeleted: { $ne: true } }),
    LoyaltyTransaction.aggregate([{ $match: { hotelId: new Types.ObjectId(hotelId), points: { $gt: 0 }, isDeleted: { $ne: true } } }, { $group: { _id: null, total: { $sum: '$points' } } }]),
    LoyaltyTransaction.aggregate([{ $match: { hotelId: new Types.ObjectId(hotelId), points: { $lt: 0 }, isDeleted: { $ne: true } } }, { $group: { _id: null, total: { $sum: '$points' } } }]),
    ReferralInvite.aggregate([{ $match: { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } } }, { $group: { _id: '$referrerGuestId', referrals: { $sum: 1 } } }, { $sort: { referrals: -1 } }, { $limit: 5 }]),
    GuestWallet.find({ hotelId, isDeleted: { $ne: true } }).sort({ pointsBalance: -1 }).limit(5).populate('guestId', 'fullName name'),
  ]);
  return { totalReferrals, successfulReferrals, pendingReferrals, rewardIssued, loyaltyMembers, pointsIssued: pointsIssuedAgg[0]?.total || 0, pointsRedeemed: Math.abs(pointsRedeemedAgg[0]?.total || 0), topReferrers, topLoyalGuests };
};
export const getAnalytics = async (query: AnalyticsQuery, viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const since = new Date(); since.setMonth(since.getMonth() - query.months + 1); since.setDate(1);
  const [totalInvites, successful, rewards, monthlyTrends] = await Promise.all([
    ReferralInvite.countDocuments({ hotelId, isDeleted: { $ne: true } }),
    ReferralInvite.countDocuments({ hotelId, status: { $in: ['booked', 'rewarded'] }, isDeleted: { $ne: true } }),
    LoyaltyTransaction.countDocuments({ hotelId, type: { $in: ['redeem', 'referral_bonus'] }, isDeleted: { $ne: true } }),
    LoyaltyTransaction.aggregate([{ $match: { hotelId: new Types.ObjectId(hotelId), createdAt: { $gte: since }, isDeleted: { $ne: true } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, points: { $sum: '$points' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ]);
  return { referralConversion: totalInvites ? Math.round((successful / totalInvites) * 100) : 0, bookingConversion: totalInvites ? Math.round((successful / totalInvites) * 100) : 0, rewardUsage: rewards, repeatBookingRate: 0, loyaltyGrowth: monthlyTrends.reduce((sum, item) => sum + Math.max(item.points, 0), 0), revenueFromReferrals: 0, monthlyTrends: monthlyTrends.map((item) => ({ month: item._id, points: item.points, count: item.count })) };
};
export const exportReports = async (viewer: Viewer) => {
  const hotelId = resolveHotelId(viewer);
  const [invites, transactions, redemptions] = await Promise.all([
    ReferralInvite.find({ hotelId, isDeleted: { $ne: true } }).limit(500).lean(),
    LoyaltyTransaction.find({ hotelId, isDeleted: { $ne: true } }).limit(500).lean(),
    RewardRedemption.find({ hotelId, isDeleted: { $ne: true } }).limit(500).lean(),
  ]);
  return { generatedAt: new Date(), invites, transactions, redemptions };
};
