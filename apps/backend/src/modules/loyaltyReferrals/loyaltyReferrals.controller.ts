import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types/express.d';
import { sendCreated, sendSuccess } from '../../utils/response';
import * as service from './loyaltyReferrals.service';
import { AcceptReferralInput, AdjustPointsInput, AnalyticsQuery, CodeInput, EarnPointsInput, InviteInput, IssueRewardInput, ListQuery, RedeemPointsInput, SettingsInput } from './loyaltyReferrals.validation';

const viewer = (req: AuthRequest) => ({ userId: req.user!.userId, role: req.user!.role, hotelId: req.hotelId });

export const dashboard = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.getDashboard(viewer(req))); } catch (e) { next(e); } };
export const analytics = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.getAnalytics(req.query as unknown as AnalyticsQuery, viewer(req))); } catch (e) { next(e); } };
export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.getSettings(viewer(req))); } catch (e) { next(e); } };
export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.updateSettings(req.body as SettingsInput, viewer(req)), 'Loyalty settings saved'); } catch (e) { next(e); } };
export const generateCode = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await service.generateReferralCode(req.body as CodeInput, viewer(req)), 'Referral code generated'); } catch (e) { next(e); } };
export const invite = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await service.inviteReferral(req.body as InviteInput, viewer(req)), 'Referral invitation sent'); } catch (e) { next(e); } };
export const accept = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.acceptReferral(req.body as AcceptReferralInput, viewer(req)), 'Referral accepted'); } catch (e) { next(e); } };
export const issueReward = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.issueReferralReward(req.body as IssueRewardInput, viewer(req)), 'Referral reward issued'); } catch (e) { next(e); } };
export const earnPoints = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await service.earnPoints(req.body as EarnPointsInput, viewer(req)), 'Points awarded'); } catch (e) { next(e); } };
export const adjustPoints = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await service.adjustPoints(req.body as AdjustPointsInput, viewer(req)), 'Points adjusted'); } catch (e) { next(e); } };
export const redeemPoints = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendCreated(res, await service.redeemPoints(req.body as RedeemPointsInput, viewer(req)), 'Points redeemed'); } catch (e) { next(e); } };
export const codes = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.listReferralCodes(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); } };
export const invites = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.listInvites(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); } };
export const transactions = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.listTransactions(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); } };
export const redemptions = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.listRedemptions(req.query as unknown as ListQuery, viewer(req))); } catch (e) { next(e); } };
export const exportReports = async (req: AuthRequest, res: Response, next: NextFunction) => { try { sendSuccess(res, await service.exportReports(viewer(req)), 'Export ready'); } catch (e) { next(e); } };
