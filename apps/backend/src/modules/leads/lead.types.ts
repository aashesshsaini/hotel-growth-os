export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface LeadStatsResult {
  totalLeads: number;
  newLeads: number;
  hotLeads: number;
  pendingFollowUps: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
  estimatedPipelineValue: number;
  leadsByStatus: Record<string, number>;
  leadsBySource: Record<string, number>;
  leadsByType: Record<string, number>;
  assignedWorkload: Array<{ staffId: string; name: string; openLeads: number; followUpsDue: number }>;
}

export type SanitizedLead = Record<string, unknown>;
