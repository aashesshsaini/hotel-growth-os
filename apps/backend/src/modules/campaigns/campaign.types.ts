import { Types } from 'mongoose';
import { ICampaign } from '../../models/Campaign';
import { ICampaignLog } from '../../models/CampaignLog';

export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface CampaignStatsResult {
  totalCampaigns: number;
  draftCampaigns: number;
  scheduledCampaigns: number;
  runningCampaigns: number;
  pausedCampaigns: number;
  completedCampaigns: number;
  cancelledCampaigns: number;
  failedCampaigns: number;
  activeCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalResponded: number;
  totalLeadsGenerated: number;
  totalBookingsGenerated: number;
  totalRevenueGenerated: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byChannel: Record<string, number>;
  byAudience: Record<string, number>;
}

export interface AudienceRecipient {
  guestId?: string;
  leadId?: string;
  enquiryId?: string;
  name: string;
  phone: string;
  email?: string;
}

export interface AudiencePreviewResult {
  segment: string;
  totalCount: number;
  sample: AudienceRecipient[];
}

export type SanitizedCampaign = Omit<ICampaign, '_id'> & {
  id: string;
  _id: Types.ObjectId;
  auditLogs?: unknown[];
};

export type SanitizedCampaignLog = Omit<ICampaignLog, '_id'> & {
  id: string;
  _id: Types.ObjectId;
  campaign?: { id: string; name: string; type: string; status: string; campaignNumber?: string };
};
