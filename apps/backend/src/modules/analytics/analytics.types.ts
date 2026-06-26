export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface TrendPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface AnalyticsDateRange {
  from: string;
  to: string;
  period: string;
}

export interface ExecutiveSummary {
  totalRevenue: number;
  revpar: number;
  adr: number;
  occupancyRate: number;
  totalBookings: number;
  averageBookingValue: number;
  averageStayNights: number;
  cancellationRate: number;
  noShowRate: number;
  collectionRate: number;
  outstandingAmount: number;
  averageRating: number;
  reputationScore: number;
  leadConversionRate: number;
  repeatGuestRate: number;
  campaignEngagementRate: number;
  whatsappDeliveryRate: number;
  followUpCompletionRate: number;
}

export interface AnalyticsOverview {
  generatedAt: string;
  dateRange: AnalyticsDateRange;
  executiveSummary: ExecutiveSummary;
  revenue: {
    trend: TrendPoint[];
    byMethod: Record<string, number>;
    byBookingSource: Record<string, number>;
  };
  bookings: {
    trend: TrendPoint[];
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
    byType: Record<string, number>;
  };
  occupancy: {
    trend: TrendPoint[];
    currentRate: number;
    totalRooms: number;
    occupiedRooms: number;
    byRoomType: Array<{ name: string; total: number; occupied: number; rate: number }>;
  };
  guests: {
    trend: TrendPoint[];
    totalGuests: number;
    newGuests: number;
    repeatGuestRate: number;
    averageLifetimeValue: number;
    bySource: Record<string, number>;
  };
  leads: {
    funnel: Record<string, number>;
    conversionRate: number;
    bySource: Record<string, number>;
    hotLeads: number;
  };
  campaigns: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSent: number;
    engagementRate: number;
    revenueGenerated: number;
    bookingsGenerated: number;
    byChannel: Record<string, number>;
    byType: Record<string, number>;
  };
  payments: {
    totalCollected: number;
    pendingAmount: number;
    refundedAmount: number;
    collectionRate: number;
    trend: TrendPoint[];
    byMethod: Record<string, number>;
  };
  reviews: {
    averageRating: number;
    reputationScore: number;
    totalReviews: number;
    negativeReviews: number;
    trend: TrendPoint[];
    ratingDistribution: Record<string, number>;
    bySource: Record<string, number>;
  };
  whatsapp: {
    totalMessages: number;
    deliveryRate: number;
    readRate: number;
    replyRate: number;
    incomingMessages: number;
    outgoingMessages: number;
    trend: TrendPoint[];
  };
  operations: {
    housekeeping: {
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
      dirtyRooms: number;
    };
    maintenance: {
      openIssues: number;
      urgentIssues: number;
      downtimeRooms: number;
      avgResolutionHours: number;
    };
  };
  staff: {
    totalStaff: number;
    onDuty: number;
    onLeave: number;
    followUpsDue: number;
    overdueFollowUps: number;
  };
}

export interface AnalyticsExportResult {
  filename: string;
  contentType: string;
  data: string;
}
