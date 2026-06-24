import { apiGet } from '@/lib/api';

export interface DashboardSummary {
  totalBookings: number;
  todayBookings: number;
  totalGuests: number;
  newGuestsThisMonth: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  occupancyPercentage: number;
  totalRevenue: number;
  pendingPayments: number;
  newEnquiries: number;
  pendingFollowUps: number;
  reviewCount: number;
  averageRating: number;
  activeCampaigns: number;
  whatsappAutomationCount: number;
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

export interface DashboardResponse {
  generatedAt: string;
  summary: DashboardSummary;
  bookingOverview: {
    totalBookings: number;
    todayBookings: number;
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
  };
  occupancy: {
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    occupancyPercentage: number;
  };
  guestLeadActivity: {
    totalGuests: number;
    newGuestsThisMonth: number;
    newEnquiries: number;
    pendingFollowUps: number;
    enquiryStatuses: Record<string, number>;
  };
  reputation: {
    reviewCount: number;
    averageRating: number;
  };
  growth: {
    activeCampaigns: number;
    whatsappAutomationCount: number;
  };
  recentBookings: DashboardRecentBooking[];
  recentEnquiries: DashboardRecentEnquiry[];
}

export const getDashboard = () => apiGet<DashboardResponse>('/dashboard');
