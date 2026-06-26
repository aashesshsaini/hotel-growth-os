import { apiGet } from '@/lib/api';

export interface DashboardSummary {
  totalBookings: number;
  todayBookings: number;
  upcomingCheckIns?: number;
  upcomingCheckOuts?: number;
  totalGuests: number;
  newGuestsThisMonth: number;
  repeatGuests?: number;
  vipGuests?: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  reservedRooms?: number;
  maintenanceRooms?: number;
  dirtyRooms?: number;
  cleaningRooms?: number;
  inspectionPendingRooms?: number;
  pendingMaintenanceIssues?: number;
  urgentMaintenanceIssues?: number;
  outOfServiceRooms?: number;
  occupancyPercentage: number;
  totalRevenue: number;
  pendingPayments: number;
  newEnquiries: number;
  pendingEnquiries?: number;
  convertedEnquiries?: number;
  totalEnquiries?: number;
  pendingFollowUps: number;
  todayFollowUps?: number;
  overdueFollowUps?: number;
  newLeads?: number;
  hotLeads?: number;
  convertedLeads?: number;
  totalLeads?: number;
  reviewCount: number;
  averageRating: number;
  pendingReviewRequests?: number;
  negativeReviews?: number;
  newReviewsThisMonth?: number;
  reputationScore?: number;
  activeCampaigns: number;
  totalCampaigns?: number;
  scheduledCampaigns?: number;
  runningCampaigns?: number;
  campaignLeads?: number;
  campaignBookings?: number;
  campaignRevenue?: number;
  campaignSent?: number;
  campaignDelivered?: number;
  campaignResponded?: number;
  whatsappAutomationCount: number;
  whatsappSent?: number;
  whatsappDelivered?: number;
  whatsappRead?: number;
  whatsappFailed?: number;
  whatsappScheduled?: number;
  whatsappIncoming?: number;
  whatsappDeliveryRate?: number;
  whatsappReadRate?: number;
  totalStaff?: number;
  staffOnDuty?: number;
  staffOnLeave?: number;
}

export interface DashboardRecentBooking {
  id: string;
  bookingNumber: string;
  guestName: string;
  status: string;
  paymentStatus: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  createdAt: string;
}

export interface DashboardRecentEnquiry {
  id: string;
  guestName: string;
  phone: string;
  source: string;
  status: string;
  followUpDate?: string;
  budget?: number;
  createdAt: string;
}

export interface DashboardRecentGuest {
  id: string;
  fullName: string;
  phone?: string;
  city?: string;
  guestType?: string;
  isVip?: boolean;
  isRepeatGuest?: boolean;
  totalSpend?: number;
  createdAt?: string;
}

export interface DashboardResponse {
  generatedAt: string;
  summary: DashboardSummary;
  bookingOverview: {
    totalBookings: number;
    todayBookings: number;
    upcomingCheckIns?: number;
    upcomingCheckOuts?: number;
    confirmedBookings: number;
    checkedInBookings: number;
    cancelledBookings: number;
    occupancyPercentage: number;
  };
  revenueOverview: {
    totalRevenue: number;
    paymentRevenue: number;
    bookingPaidRevenue: number;
    pendingPayments: number;
    todayRevenue?: number;
    monthlyRevenue?: number;
    collectionRate?: number;
    outstandingAmount?: number;
    refundedAmount?: number;
  };
  occupancy: {
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    reservedRooms?: number;
    maintenanceRooms?: number;
    dirtyRooms?: number;
    cleaningRooms?: number;
    inspectionPendingRooms?: number;
    occupancyPercentage: number;
  };
  housekeepingOverview?: {
    dirtyRooms: number;
    cleaningRooms: number;
    inspectionPendingRooms: number;
    readyRooms: number;
  };
  maintenanceOverview?: {
    pendingIssues: number;
    urgentIssues: number;
    outOfServiceRooms: number;
    maintenanceRooms: number;
  };
  roomTypeInsights?: {
    totalRoomTypes: number;
    availableRoomTypes: number;
    topAvailableRoomTypes: Array<{
      id: string;
      name: string;
      basePrice: number;
      status: string;
      totalRooms: number;
      availableRooms: number;
    }>;
  };
  staffOverview?: {
    totalStaff: number;
    staffOnDuty: number;
    staffOnLeave: number;
  };
  guestLeadActivity: {
    totalGuests: number;
    newGuestsThisMonth: number;
    repeatGuests?: number;
    vipGuests?: number;
    newEnquiries: number;
    pendingEnquiries?: number;
    convertedEnquiries?: number;
    totalEnquiries?: number;
    enquiryConversionRate?: number;
    pendingFollowUps: number;
    todayFollowUps?: number;
    overdueFollowUps?: number;
    newLeads?: number;
    hotLeads?: number;
    convertedLeads?: number;
    totalLeads?: number;
    leadConversionRate?: number;
    enquiryStatuses: Record<string, number>;
    recentGuests?: DashboardRecentGuest[];
  };
  corporateOverview?: {
    totalCompanies: number;
    activeClients: number;
    pipelineValue: number;
    totalRevenue: number;
    monthlyRevenue: number;
    outstandingAmount: number;
    pendingFollowUps: number;
    meetingsThisWeek: number;
    proposalsSent: number;
    statusBreakdown: Record<string, number>;
  };
  eventOverview?: {
    totalEvents: number;
    upcomingEvents: number;
    pipelineValue: number;
    totalRevenue: number;
    monthlyRevenue: number;
    outstandingAmount: number;
    pendingFollowUps: number;
    siteVisitsThisWeek: number;
    proposalsSent: number;
    convertedEvents: number;
    statusBreakdown: Record<string, number>;
  };
  reputation: {
    reviewCount: number;
    averageRating: number;
    pendingReviewRequests?: number;
    negativeReviews?: number;
    newReviewsThisMonth?: number;
    reputationScore?: number;
    positiveReviews?: number;
  };
  growth: {
    activeCampaigns: number;
    totalCampaigns?: number;
    scheduledCampaigns?: number;
    runningCampaigns?: number;
    campaignLeads?: number;
    campaignBookings?: number;
    campaignRevenue?: number;
    campaignSent?: number;
    campaignDelivered?: number;
    campaignResponded?: number;
    whatsappAutomationCount: number;
    whatsappSent?: number;
    whatsappDelivered?: number;
    whatsappRead?: number;
    whatsappFailed?: number;
    whatsappScheduled?: number;
    whatsappIncoming?: number;
    whatsappDeliveryRate?: number;
    whatsappReadRate?: number;
    recentCampaigns?: Array<{
      id: string;
      name: string;
      campaignNumber?: string;
      type: string;
      status: string;
      channel?: string;
      scheduledAt?: string;
      launchedAt?: string;
      stats?: { total?: number; sent?: number; delivered?: number; responded?: number; leadsGenerated?: number; bookingsGenerated?: number; revenueGenerated?: number };
      createdAt?: string;
    }>;
  };
  recentBookings: DashboardRecentBooking[];
  recentEnquiries: DashboardRecentEnquiry[];
}

export const getDashboard = () => apiGet<DashboardResponse>('/dashboard');
