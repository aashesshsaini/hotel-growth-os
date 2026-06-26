import type { PaginatedResponse, PaginationQuery } from '@hotel-growth-os/shared';
export type { PaginatedResponse, PaginationQuery };
export type ListParams = PaginationQuery & Record<string, unknown>;
export const getEntityId = (entity: { _id?: string; id?: string }): string => entity.id || entity._id || '';

export interface TrendPoint { label: string; value: number; secondary?: number; }
export interface AnalyticsDateRange { from: string; to: string; period: string; }
export interface AnalyticsExecutiveSummary {
  totalRevenue: number; revpar: number; adr: number; occupancyRate: number; totalBookings: number;
  averageBookingValue: number; averageStayNights: number; cancellationRate: number; noShowRate: number;
  collectionRate: number; outstandingAmount: number; averageRating: number; reputationScore: number;
  leadConversionRate: number; repeatGuestRate: number; campaignEngagementRate: number;
  whatsappDeliveryRate: number; followUpCompletionRate: number;
}
export interface AnalyticsOverview {
  generatedAt: string;
  dateRange: AnalyticsDateRange;
  executiveSummary: AnalyticsExecutiveSummary;
  revenue: { trend: TrendPoint[]; byMethod: Record<string, number>; byBookingSource: Record<string, number> };
  bookings: { trend: TrendPoint[]; byStatus: Record<string, number>; bySource: Record<string, number>; byType: Record<string, number> };
  occupancy: { trend: TrendPoint[]; currentRate: number; totalRooms: number; occupiedRooms: number; byRoomType: Array<{ name: string; total: number; occupied: number; rate: number }> };
  guests: { trend: TrendPoint[]; totalGuests: number; newGuests: number; repeatGuestRate: number; averageLifetimeValue: number; bySource: Record<string, number> };
  leads: { funnel: Record<string, number>; conversionRate: number; bySource: Record<string, number>; hotLeads: number };
  campaigns: { totalCampaigns: number; activeCampaigns: number; totalSent: number; engagementRate: number; revenueGenerated: number; bookingsGenerated: number; byChannel: Record<string, number>; byType: Record<string, number> };
  payments: { totalCollected: number; pendingAmount: number; refundedAmount: number; collectionRate: number; trend: TrendPoint[]; byMethod: Record<string, number> };
  reviews: { averageRating: number; reputationScore: number; totalReviews: number; negativeReviews: number; trend: TrendPoint[]; ratingDistribution: Record<string, number>; bySource: Record<string, number> };
  whatsapp: { totalMessages: number; deliveryRate: number; readRate: number; replyRate: number; incomingMessages: number; outgoingMessages: number; trend: TrendPoint[] };
  operations: { housekeeping: { totalTasks: number; completedTasks: number; completionRate: number; dirtyRooms: number }; maintenance: { openIssues: number; urgentIssues: number; downtimeRooms: number; avgResolutionHours: number } };
  staff: { totalStaff: number; onDuty: number; onLeave: number; followUpsDue: number; overdueFollowUps: number };
}
export interface AnalyticsExportResult { filename: string; contentType: string; data: string; }

export type ReportCategory =
  | 'bookings'
  | 'guests'
  | 'revenue'
  | 'payments'
  | 'occupancy'
  | 'rooms'
  | 'leads'
  | 'campaigns'
  | 'whatsapp'
  | 'reviews'
  | 'staff'
  | 'housekeeping'
  | 'maintenance';

export interface ReportDateRange { from: string; to: string; period: string; }
export interface ReportColumn { key: string; label: string; align?: 'left' | 'right' | 'center'; }
export interface ReportCategorySummary {
  id: ReportCategory;
  title: string;
  description: string;
  metric: string | number;
  metricLabel: string;
  recordCount: number;
}
export interface ReportsSummary {
  generatedAt: string;
  dateRange: ReportDateRange;
  categories: ReportCategorySummary[];
}
export interface CategoryReport {
  category: ReportCategory;
  title: string;
  description: string;
  generatedAt: string;
  dateRange: ReportDateRange;
  summary: Record<string, string | number>;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
}
export interface ReportExportResult {
  filename: string;
  contentType: string;
  data: string;
  format: 'csv' | 'excel' | 'pdf';
}
export interface LegacyReportsResponse { bookings: number; guests: number; revenue: number; }

export type CalendarView = 'day' | 'week' | 'month' | 'timeline' | 'resource';
export interface CalendarDateRange { from: string; to: string; }
export interface CalendarEvent {
  id: string;
  bookingNumber: string;
  guestId: string;
  guestName: string;
  guestIsVip: boolean;
  roomId?: string;
  roomNumber?: string;
  roomTypeId?: string;
  roomTypeName?: string;
  floor?: number;
  bookingType: string;
  source: string;
  status: string;
  paymentStatus: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: number;
  paidAmount: number;
  adults: number;
  children: number;
  hasConflict: boolean;
  colorKey: string;
}
export interface CalendarBlockEvent {
  id: string;
  roomId: string;
  roomNumber: string;
  blockType: 'maintenance' | 'housekeeping' | 'blocked' | 'hold';
  title: string;
  from: string;
  to: string;
  status?: string;
  priority?: string;
  colorKey: string;
}
export interface CalendarResource {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  roomTypeName: string;
  floor?: number;
  status: string;
  housekeepingStatus: string;
  maintenanceStatus: string;
  isBlocked: boolean;
  currentGuestName?: string;
  currentBookingId?: string;
}
export interface CalendarRoomTypeGroup {
  id: string;
  name: string;
  code?: string;
  totalRooms: number;
  rooms: CalendarResource[];
}
export interface CalendarOverview {
  generatedAt: string;
  dateRange: CalendarDateRange;
  todayCheckIns: number;
  todayCheckOuts: number;
  upcomingArrivals: number;
  upcomingDepartures: number;
  inHouseGuests: number;
  occupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  blockedRooms: number;
  maintenanceRooms: number;
  dirtyRooms: number;
  conflictCount: number;
  pendingPayments: number;
}
export interface CalendarBookingsResponse {
  generatedAt: string;
  dateRange: CalendarDateRange;
  view: CalendarView;
  events: CalendarEvent[];
  blocks: CalendarBlockEvent[];
  resources: CalendarResource[];
  roomTypeGroups: CalendarRoomTypeGroup[];
}
export interface CalendarOccupancyDay {
  date: string;
  totalRooms: number;
  occupiedRooms: number;
  blockedRooms: number;
  occupancyRate: number;
  checkIns: number;
  checkOuts: number;
}
export interface CalendarOccupancyResponse {
  generatedAt: string;
  dateRange: CalendarDateRange;
  days: CalendarOccupancyDay[];
}
export interface CalendarAvailabilityRoom {
  roomId: string;
  roomNumber: string;
  roomTypeId: string;
  roomTypeName: string;
  floor?: number;
  isAvailable: boolean;
  conflictReason?: string;
}
export interface CalendarAvailabilityResponse {
  dateRange: CalendarDateRange;
  rooms: CalendarAvailabilityRoom[];
}
export interface CalendarConflictResult {
  hasConflict: boolean;
  conflictingBooking?: {
    id: string;
    bookingNumber: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
  };
  roomBlocked?: boolean;
  blockReason?: string;
}

export interface AuditLogEntry { _id: string; id?: string; action: string; entity?: string; createdAt: string; changes?: Record<string, unknown>; userId?: { name?: string; email?: string }; }
export interface User { id: string; _id?: string; name: string; email: string; phone?: string; role: string; hotelId?: string; lastLoginAt?: string; }
export interface AuthResponse { user: User; token: string; }
export interface Hotel { _id: string; id?: string; name: string; slug?: string; email?: string; phone?: string; isActive?: boolean; settings?: Record<string, unknown>; createdAt?: string; updatedAt?: string; }
export interface GuestDocument { _id?: string; id?: string; url: string; publicId?: string; documentType?: string; uploadedAt?: string; }
export interface Guest { _id: string; id?: string; fullName?: string; name: string; firstName?: string; lastName?: string; phone: string; alternatePhone?: string; email?: string; gender?: string; dateOfBirth?: string; anniversaryDate?: string; city?: string; state?: string; country?: string; address?: string; idProofType?: string; idProofNumber?: string; idProofImages?: GuestDocument[]; profileImage?: string; guestType?: string; source?: string; preferences?: string[]; foodPreference?: string; roomPreference?: string; specialRequests?: string; tags?: string[]; notes?: string; totalBookings?: number; completedBookings?: number; cancelledBookings?: number; noShowCount?: number; totalSpend?: number; averageSpend?: number; lastBookingDate?: string; lastStayDate?: string; lastEnquiryDate?: string; lastReviewRating?: number; visitCount?: number; lastVisitAt?: string; isRepeatGuest?: boolean; isVip?: boolean; isBlacklisted?: boolean; blacklistReason?: string; loyaltyPoints?: number; marketingConsent?: boolean; whatsappConsent?: boolean; emailConsent?: boolean; metadata?: Record<string, unknown>; createdAt?: string; updatedAt?: string; auditLogs?: AuditLogEntry[]; }
export interface GuestStats { totalGuests: number; newGuestsThisMonth: number; repeatGuests: number; vipGuests: number; inactiveGuests?: number; blacklistedGuests: number; birthdayThisMonth: number; anniversaryThisMonth: number; topCities: Record<string, number>; topSpendingGuests: Array<{ id: string; fullName: string; totalSpend: number }>; recentGuests?: Array<{ id: string; fullName: string; phone: string; city?: string; guestType?: string; isVip?: boolean; isRepeatGuest?: boolean; totalSpend?: number; createdAt?: string }>; guestsWithNoBooking: number; campaignEligible: number; }
export interface GuestFormData { fullName: string; phone: string; alternatePhone?: string; email?: string; gender?: string; dateOfBirth?: string; anniversaryDate?: string; city?: string; state?: string; country?: string; address?: string; guestType?: string; source?: string; foodPreference?: string; roomPreference?: string; specialRequests?: string; tags?: string[]; notes?: string; marketingConsent?: boolean; whatsappConsent?: boolean; emailConsent?: boolean; isVip?: boolean; }
export interface GuestHistory { guest: Guest; bookings: Booking[]; enquiries: Enquiry[]; payments: Payment[]; reviews: Review[]; campaigns: unknown[]; whatsappMessages: unknown[]; whatsappSummary?: { totalMessages: number; incoming: number; outgoing: number; lastMessageAt?: string }; auditLogs?: AuditLogEntry[]; summary: { totalSpend: number; totalBookings: number; completedBookings: number; cancelledBookings: number; noShowCount: number; isRepeatGuest: boolean }; }
export interface StaffDocument { _id?: string; id?: string; documentType: string; name?: string; url: string; publicId?: string; uploadedAt?: string; }
export interface StaffTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface StaffAttendanceRecord { _id?: string; id?: string; date: string; status: string; checkInAt?: string; checkOutAt?: string; shiftType?: string; notes?: string; }
export interface StaffPerformance { assignedBookings: number; bookingRevenue: number; assignedTasks: number; openTasks: number; housekeepingTasks?: number; openHousekeepingTasks?: number; maintenanceIssues?: number; openMaintenanceIssues?: number; assignedLeads?: number; openLeads?: number; assignedEnquiries?: number; openEnquiries?: number; }
export interface Staff { _id: string; id?: string; userId?: string; hotelId?: string; employeeId?: string; fullName: string; name?: string; email: string; phone: string; alternatePhone?: string; role: string; department?: string; designation?: string; profileImage?: string; gender?: string; dateOfBirth?: string; joiningDate?: string; salary?: number; experienceYears?: number; skills?: string[]; shiftType?: string; shiftStartTime?: string; shiftEndTime?: string; address?: string; emergencyContactName?: string; emergencyContactPhone?: string; documents?: StaffDocument[]; notes?: string; timeline?: StaffTimelineItem[]; permissions?: string[]; password?: string; status?: string; isActive?: boolean; lastLoginAt?: string; createdAt?: string; updatedAt?: string; auditLogs?: AuditLogEntry[]; attendanceRecords?: StaffAttendanceRecord[]; performance?: StaffPerformance; }
export interface StaffStats { total: number; active: number; inactive: number; onDuty?: number; offDuty?: number; onLeave?: number; suspended: number; resigned?: number; presentToday?: number; lateToday?: number; byRole: Record<string, number>; byDepartment: Record<string, number>; byShift?: Record<string, number>; }
export interface RoomTypeImage { _id?: string; id?: string; url: string; publicId?: string; altText?: string; sortOrder?: number; }
export interface RoomType { _id: string; id?: string; name: string; slug?: string; code?: string; description?: string; shortDescription?: string; basePrice: number; weekdayPrice?: number; weekendPrice?: number; extraAdultPrice?: number; extraChildPrice?: number; taxPercentage?: number; discountPercentage?: number; maxGuests: number; maxAdults?: number; maxChildren?: number; bedType?: string; roomSize?: number; roomSizeUnit?: string; totalRooms?: number; amenities?: string[]; facilities?: string[]; images?: RoomTypeImage[]; coverImage?: string; cancellationPolicy?: string; checkInInstructions?: string; internalNotes?: string; mealPlan?: string; inventoryType?: string; status?: string; isAvailableForBooking?: boolean; isVisibleOnWebsite?: boolean; isPopular?: boolean; sortOrder?: number; tags?: string[]; metadata?: Record<string, unknown>; isActive?: boolean; createdAt?: string; updatedAt?: string; auditLogs?: AuditLogEntry[]; linkedRoomsCount?: number; availableRoomsCount?: number; occupiedRoomsCount?: number; bookingCount?: number; revenue?: number; }
export interface RoomImage { _id?: string; id?: string; url: string; publicId?: string; altText?: string; sortOrder?: number; uploadedAt?: string; }
export interface RoomTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface RoomInspectionItem { item: string; isChecked: boolean; notes?: string; }
export interface Room { [key: string]: unknown; _id: string; id?: string; roomNumber: string; floor?: number; floorNumber?: number; roomTypeId?: string | RoomType; status: string; housekeepingStatus?: string; maintenanceStatus?: string; assignedHousekeeperId?: string | User; assignedMaintenanceStaffId?: string | User; isBookable?: boolean; isBlocked?: boolean; blockedReason?: string; blockedFrom?: string; blockedTo?: string; currentGuestId?: string | Guest; currentBookingId?: string | { bookingNumber?: string; _id?: string; id?: string; status?: string; checkInDate?: string; checkOutDate?: string }; buildingName?: string; wing?: string; roomName?: string; description?: string; capacity?: number; maxAdults?: number; maxChildren?: number; bedType?: string; viewType?: string; smokingPolicy?: string; amenitiesOverride?: string[]; images?: RoomImage[]; cleaningNotes?: string; maintenanceNotes?: string; housekeepingSchedule?: string; maintenanceSchedule?: string; lastCleanedAt?: string; lastInspectedAt?: string; inspectionChecklist?: RoomInspectionItem[]; notes?: string; internalNotes?: string; tags?: string[]; timeline?: RoomTimelineItem[]; priceOverride?: number; maxGuestsOverride?: number; isPriceOverridden?: boolean; isVisibleToStaff?: boolean; createdAt?: string; auditLogs?: AuditLogEntry[]; }
export interface RoomStats { totalRooms: number; availableRooms: number; occupiedRooms: number; reservedRooms?: number; dirtyRooms: number; cleaningRooms: number; maintenanceRooms: number; blockedRooms: number; outOfOrderRooms: number; occupancyPercentage: number; roomTypeWiseCount?: Record<string, number>; floorWiseCount?: Record<string, number>; housekeepingSummary?: Record<string, number>; }
export interface RoomFormData { roomNumber: string; roomTypeId?: string; floorNumber?: number; floor?: number; buildingName?: string; wing?: string; roomName?: string; description?: string; capacity?: number; maxAdults?: number; maxChildren?: number; bedType?: string; viewType?: string; smokingPolicy?: string; status?: string; housekeepingStatus?: string; maintenanceStatus?: string; assignedHousekeeperId?: string; assignedMaintenanceStaffId?: string; isBookable?: boolean; isBlocked?: boolean; notes?: string; internalNotes?: string; cleaningNotes?: string; maintenanceNotes?: string; housekeepingSchedule?: string; maintenanceSchedule?: string; inspectionChecklist?: RoomInspectionItem[]; amenitiesOverride?: string[]; images?: RoomImage[]; tags?: string[]; priceOverride?: number; maxGuestsOverride?: number; isPriceOverridden?: boolean; isVisibleToStaff?: boolean; }
export interface HousekeepingChecklistItem { item: string; isDone?: boolean; notes?: string; }
export interface HousekeepingTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface HousekeepingTask { _id: string; id?: string; hotelId?: string; roomId: string | Room; assignedTo?: string | User; taskNumber: string; taskType: string; status: string; priority: string; scheduledFor?: string; startedAt?: string; completedAt?: string; inspectedAt?: string; estimatedMinutes?: number; actualMinutes?: number; title: string; description?: string; checklist?: HousekeepingChecklistItem[]; rejectionReason?: string; notes?: string; timeline?: HousekeepingTimelineItem[]; auditLogs?: AuditLogEntry[]; createdAt?: string; updatedAt?: string; }
export interface HousekeepingTaskFormData { roomId: string; assignedTo?: string; taskType: string; status?: string; priority?: string; scheduledFor?: string; estimatedMinutes?: number; actualMinutes?: number; title: string; description?: string; checklist?: HousekeepingChecklistItem[]; rejectionReason?: string; notes?: string; }
export interface HousekeepingStats { totalTasks: number; pending: number; assigned: number; inProgress: number; completed: number; inspectionPending: number; rejected: number; recleanRequired: number; dirtyRooms: number; cleanRooms: number; cleaningInProgressRooms: number; inspectionRooms: number; tasksByType: Record<string, number>; workloadByStaff: Array<{ staffId: string; name: string; openTasks: number; completedToday: number }>; }
export interface MaintenanceIssueImage { url: string; publicId?: string; caption?: string; uploadedAt?: string; }
export interface MaintenanceTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface MaintenanceIssue { _id: string; id?: string; hotelId?: string; roomId: string | Room; assignedTo?: string | User; sourceHousekeepingTaskId?: string | HousekeepingTask; issueNumber: string; title: string; description?: string; issueType: string; status: string; priority: string; reportedAt?: string; scheduledFor?: string; startedAt?: string; resolvedAt?: string; closedAt?: string; estimatedCost?: number; actualCost?: number; vendorName?: string; vendorPhone?: string; resolutionNotes?: string; holdReason?: string; images?: MaintenanceIssueImage[]; timeline?: MaintenanceTimelineItem[]; auditLogs?: AuditLogEntry[]; createdAt?: string; updatedAt?: string; }
export interface MaintenanceIssueFormData { roomId: string; assignedTo?: string; sourceHousekeepingTaskId?: string; title: string; description?: string; issueType: string; status?: string; priority?: string; scheduledFor?: string; estimatedCost?: number; actualCost?: number; vendorName?: string; vendorPhone?: string; resolutionNotes?: string; holdReason?: string; images?: MaintenanceIssueImage[]; }
export interface MaintenanceStats { totalIssues: number; open: number; assigned: number; inProgress: number; onHold: number; resolved: number; closed: number; reopened: number; urgentIssues: number; highPriorityIssues: number; maintenanceRooms: number; outOfServiceRooms: number; totalEstimatedCost: number; totalActualCost: number; issuesByType: Record<string, number>; workloadByStaff: Array<{ staffId: string; name: string; openIssues: number; resolvedToday: number }>; }
export interface LeadTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface LeadSourceHistoryItem { source: string; capturedAt?: string; notes?: string; }
export interface Lead { _id: string; id?: string; hotelId?: string; leadNumber: string; fullName: string; phone: string; email?: string; companyName?: string; city?: string; source: string; leadType: string; status: string; priority: string; estimatedValue?: number; expectedRooms?: number; expectedGuests?: number; checkInDate?: string; checkOutDate?: string; eventDate?: string; assignedTo?: string | User; followUpDate?: string; notes?: string; lostReason?: string; sourceHistory?: LeadSourceHistoryItem[]; timeline?: LeadTimelineItem[]; enquiryId?: string; corporateLeadId?: string; eventLeadId?: string; convertedGuestId?: string | Guest; convertedBookingId?: string | Booking; convertedAt?: string; auditLogs?: AuditLogEntry[]; createdAt?: string; updatedAt?: string; }
export interface LeadFormData { fullName: string; phone: string; email?: string; companyName?: string; city?: string; source: string; leadType: string; status?: string; priority?: string; estimatedValue?: number; expectedRooms?: number; expectedGuests?: number; checkInDate?: string; checkOutDate?: string; eventDate?: string; assignedTo?: string; followUpDate?: string; notes?: string; lostReason?: string; enquiryId?: string; corporateLeadId?: string; eventLeadId?: string; }
export interface LeadStats { totalLeads: number; newLeads: number; hotLeads: number; pendingFollowUps: number; convertedLeads: number; lostLeads: number; conversionRate: number; estimatedPipelineValue: number; leadsByStatus: Record<string, number>; leadsBySource: Record<string, number>; leadsByType: Record<string, number>; assignedWorkload: Array<{ staffId: string; name: string; openLeads: number; followUpsDue: number }>; }

export interface CorporateContact { _id?: string; name: string; designation?: string; phone?: string; email?: string; isPrimary?: boolean; }
export interface CorporateNote { _id?: string; text: string; createdAt?: string; createdBy?: string | User; }
export interface CorporateTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface CorporateMeeting { _id?: string; title: string; scheduledAt: string; location?: string; attendees?: string; status: string; notes?: string; createdAt?: string; createdBy?: string | User; }
export interface CorporateProposal { _id?: string; title: string; amount: number; sentAt?: string; validUntil?: string; status: string; notes?: string; createdAt?: string; createdBy?: string | User; }
export interface CorporateDocument { _id?: string; name: string; url: string; documentType?: string; uploadedAt?: string; uploadedBy?: string | User; }
export interface CorporateLead {
  _id: string; id?: string; hotelId?: string; companyNumber?: string; companyName: string; companyType?: string;
  industry?: string; website?: string; contactPerson: string; phone: string; email?: string;
  contacts?: CorporateContact[]; address?: { street?: string; city?: string; state?: string; country?: string; pincode?: string };
  gstNumber?: string; panNumber?: string; requirements?: string; estimatedRooms?: number; estimatedGuests?: number;
  eventDates?: { from?: string; to?: string }; status: string; priority?: string; source?: string; tags?: string[];
  followUpDate?: string; renewalReminderDate?: string; notes?: string; structuredNotes?: CorporateNote[];
  totalValue?: number; paidAmount?: number; outstandingAmount?: number; creditLimit?: number; paymentTerms?: string;
  corporateRate?: number; specialPricing?: string; contractStartDate?: string; contractEndDate?: string;
  roomAllocation?: number; assignedTo?: string | User; convertedGuestId?: string | Guest;
  timeline?: CorporateTimelineItem[]; meetings?: CorporateMeeting[]; proposals?: CorporateProposal[];
  documents?: CorporateDocument[]; lostReason?: string; createdAt?: string; updatedAt?: string;
}
export interface CorporateLeadFormData {
  companyName: string; companyType?: string; industry?: string; website?: string; contactPerson: string;
  phone: string; email?: string; contacts?: CorporateContact[]; address?: CorporateLead['address'];
  gstNumber?: string; panNumber?: string; requirements?: string; estimatedRooms?: number; estimatedGuests?: number;
  status?: string; priority?: string; source?: string; tags?: string[]; followUpDate?: string;
  renewalReminderDate?: string; notes?: string; totalValue?: number; paidAmount?: number; creditLimit?: number;
  paymentTerms?: string; corporateRate?: number; specialPricing?: string; contractStartDate?: string;
  contractEndDate?: string; roomAllocation?: number; assignedTo?: string; lostReason?: string;
}
export interface CorporateLeadStats {
  totalCompanies: number; activeClients: number; pipelineValue: number; totalRevenue: number;
  outstandingAmount: number; pendingFollowUps: number; meetingsThisWeek: number; proposalsSent: number;
  statusBreakdown: Record<string, number>; companyTypeBreakdown: Record<string, number>; monthlyRevenue: number;
}
export interface CorporatePipelineColumn {
  status: string; label: string; count: number; value: number;
  companies: Array<{ id: string; companyNumber: string; companyName: string; contactPerson: string; totalValue: number; priority: string; followUpDate?: string; assignedToName?: string; }>;
}
export interface CorporateLeadDetails {
  company: CorporateLead; bookings: Booking[];
  revenueSummary: { totalValue: number; paidAmount: number; outstandingAmount: number; bookingCount: number; bookingRevenue: number };
  auditLogs?: AuditLogEntry[];
}

export interface EventNote { _id?: string; text: string; createdAt?: string; createdBy?: string | User; }
export interface EventTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface EventProposal { _id?: string; title: string; amount: number; sentAt?: string; validUntil?: string; status: string; notes?: string; createdAt?: string; createdBy?: string | User; }
export interface EventPackage { _id?: string; name: string; price: number; description?: string; inclusions?: string; status: string; createdAt?: string; createdBy?: string | User; }
export interface EventSiteVisit { _id?: string; title: string; scheduledAt: string; location?: string; status: string; notes?: string; createdAt?: string; createdBy?: string | User; }
export interface EventDocument { _id?: string; name: string; url: string; documentType?: string; uploadedAt?: string; uploadedBy?: string | User; }
export interface EventPayment { _id?: string; amount: number; paymentType: string; paidAt?: string; notes?: string; createdBy?: string | User; }
export interface EventRequirements { venue?: string; roomBlock?: string; catering?: string; decoration?: string; avSetup?: string; specialRequests?: string; }
export interface EventLead {
  _id: string; id?: string; hotelId?: string; eventNumber?: string; eventName: string; eventType: string;
  contactPerson: string; phone: string; email?: string; eventDate: string; eventEndDate?: string;
  eventStartTime?: string; eventEndTime?: string; guestCount: number; budgetMin?: number; budgetMax?: number;
  estimatedValue?: number; packageName?: string; packagePrice?: number; packages?: EventPackage[];
  requirements?: EventRequirements; status: string; priority?: string; source?: string; tags?: string[];
  followUpDate?: string; followUpReminder?: string; notes?: string; structuredNotes?: EventNote[];
  totalValue?: number; paidAmount?: number; advanceAmount?: number; outstandingAmount?: number;
  assignedTo?: string | User; convertedGuestId?: string | Guest; convertedBookingId?: string | Booking;
  convertedAt?: string; timeline?: EventTimelineItem[]; proposals?: EventProposal[];
  siteVisits?: EventSiteVisit[]; documents?: EventDocument[]; payments?: EventPayment[];
  lostReason?: string; createdAt?: string; updatedAt?: string;
}
export interface EventLeadFormData {
  eventName: string; eventType: string; contactPerson: string; phone: string; email?: string;
  eventDate: string; eventEndDate?: string; eventStartTime?: string; eventEndTime?: string;
  guestCount: number; budgetMin?: number; budgetMax?: number; estimatedValue?: number;
  packageName?: string; packagePrice?: number; requirements?: EventRequirements;
  status?: string; priority?: string; source?: string; tags?: string[];
  followUpDate?: string; followUpReminder?: string; notes?: string; totalValue?: number;
  paidAmount?: number; advanceAmount?: number; assignedTo?: string; lostReason?: string;
}
export interface EventLeadStats {
  totalEvents: number; upcomingEvents: number; pipelineValue: number; totalRevenue: number;
  outstandingAmount: number; pendingFollowUps: number; siteVisitsThisWeek: number; proposalsSent: number;
  convertedEvents: number; statusBreakdown: Record<string, number>; eventTypeBreakdown: Record<string, number>;
  monthlyRevenue: number;
}
export interface EventPipelineColumn {
  status: string; label: string; count: number; value: number;
  events: Array<{ id: string; eventNumber: string; eventName: string; eventType: string; contactPerson: string; eventDate?: string; guestCount: number; totalValue: number; priority: string; followUpDate?: string; assignedToName?: string; }>;
}
export interface EventLeadDetails {
  event: EventLead; bookings: Booking[];
  revenueSummary: { totalValue: number; paidAmount: number; advanceAmount: number; outstandingAmount: number; bookingCount: number; bookingRevenue: number };
  auditLogs?: AuditLogEntry[];
}

export interface BulkRoomFormData { roomTypeId: string; floorNumber?: number; startNumber?: number; count?: number; startRoomNumber?: number; endRoomNumber?: number; prefix?: string; buildingName?: string; wing?: string; }
export interface AvailableRoom extends Room { roomType?: RoomType; effectivePrice: number; effectiveMaxGuests: number; }
export interface EnquiryTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface EnquirySourceHistoryItem { source: string; capturedAt?: string; notes?: string; }
export interface Enquiry { _id: string; id?: string; hotelId?: string; guestName: string; phone: string; email?: string; source: string; status: string; enquiryType?: string; priority?: string; checkInDate?: string; checkOutDate?: string; guestsCount?: number; roomTypePreference?: string; budget?: number; assignedTo?: string | User; followUpDate?: string; notes?: string; internalNotes?: string; lostReason?: string; sourceHistory?: EnquirySourceHistoryItem[]; timeline?: EnquiryTimelineItem[]; convertedLeadId?: string | Lead; convertedGuestId?: string | Guest; convertedBookingId?: string | Booking; convertedAt?: string; auditLogs?: AuditLogEntry[]; createdAt?: string; updatedAt?: string; }
export interface EnquiryFormData { guestName: string; phone: string; email?: string; source: string; status?: string; enquiryType?: string; priority?: string; checkInDate?: string; checkOutDate?: string; guestsCount?: number; roomTypePreference?: string; budget?: number; assignedTo?: string; followUpDate?: string; notes?: string; internalNotes?: string; lostReason?: string; }
export interface EnquiryStats { totalEnquiries: number; newEnquiries: number; assignedEnquiries: number; pendingFollowUps: number; urgentEnquiries: number; convertedEnquiries: number; lostEnquiries: number; conversionRate: number; estimatedValue: number; byStatus: Record<string, number>; bySource: Record<string, number>; byType: Record<string, number>; }
export interface FollowUpTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface FollowUpRelatedTo { type: string; id: string; label?: string; }
export interface FollowUp { [key: string]: unknown; _id: string; id?: string; hotelId?: string; title: string; description?: string; assignedTo?: string | User; dueDate?: string; reminderAt?: string; followUpType?: string; priority: string; status: string; notes?: string; outcome?: string; completedAt?: string; rescheduledFrom?: string; relatedTo?: FollowUpRelatedTo; timeline?: FollowUpTimelineItem[]; auditLogs?: AuditLogEntry[]; createdAt?: string; updatedAt?: string; }
export interface FollowUpFormData { title: string; description?: string; assignedTo?: string; dueDate?: string; reminderAt?: string; followUpType?: string; priority?: string; status?: string; notes?: string; outcome?: string; relatedTo?: FollowUpRelatedTo; }
export interface FollowUpStats { totalFollowUps: number; todayFollowUps: number; overdueFollowUps: number; pendingFollowUps: number; completedFollowUps: number; byStatus: Record<string, number>; byType: Record<string, number>; }
export interface BookingExtraService { name: string; amount: number; quantity: number; }
export interface BookingTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface BookingDocument { url: string; publicId?: string; documentType?: string; uploadedAt?: string; }
export interface Booking { _id: string; id?: string; bookingNumber: string; guestId: string | Guest; enquiryId?: string | Enquiry; roomId?: string | Room; roomTypeId?: string | RoomType; corporateLeadId?: string; eventLeadId?: string; bookingType?: string; source?: string; status: string; paymentStatus: string; checkInDate: string; checkOutDate: string; nights?: number; roomCount?: number; adults?: number; children?: number; roomRate?: number; totalAmount: number; paidAmount: number; discount?: number; taxAmount?: number; extraCharges?: number; couponCode?: string; specialRequests?: string; guestPreferences?: string; internalNotes?: string; notes?: string; extraServices?: BookingExtraService[]; documents?: BookingDocument[]; timeline?: BookingTimelineItem[]; assignedTo?: string | User; checkedInAt?: string; checkedOutAt?: string; expectedArrivalTime?: string; expectedDepartureTime?: string; isLateCheckIn?: boolean; isLateCheckOut?: boolean; cancelledAt?: string; cancellationReason?: string; createdAt?: string; updatedAt?: string; }
export interface BookingDetails { booking: Booking; payments: Payment[]; reviews: Review[]; timeline: BookingTimelineItem[]; }
export interface BookingStats { totalBookings: number; todayBookings: number; upcomingCheckIns: number; upcomingCheckOuts: number; checkedIn: number; cancelled: number; bookingRevenue: number; pendingRevenue: number; statusBreakdown: Record<string, number>; }
export interface BookingFormData { guestId: string; enquiryId?: string; corporateLeadId?: string; eventLeadId?: string; roomId?: string; roomTypeId?: string; bookingType?: string; source?: string; checkInDate: string; checkOutDate: string; roomCount?: number; adults: number; children?: number; status?: string; paymentStatus?: string; roomRate?: number; totalAmount: number; paidAmount?: number; discount?: number; taxAmount?: number; extraCharges?: number; couponCode?: string; specialRequests?: string; guestPreferences?: string; internalNotes?: string; notes?: string; assignedTo?: string; expectedArrivalTime?: string; expectedDepartureTime?: string; isLateCheckIn?: boolean; isLateCheckOut?: boolean; }
export interface PaymentTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface PaymentNote { text: string; createdAt?: string; createdBy?: string | User; }
export interface Payment {
  [key: string]: unknown;
  _id: string;
  id?: string;
  paymentNumber?: string;
  invoiceNumber?: string;
  hotelId?: string;
  bookingId?: string | Booking;
  guestId?: string | Guest;
  amount: number;
  method: string;
  paymentType?: string;
  status: string;
  invoiceStatus?: string;
  transactionId?: string;
  upiReference?: string;
  bankReference?: string;
  cardLast4?: string;
  gatewayProvider?: string;
  refundedAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  dueAmountSnapshot?: number;
  reference?: string;
  notes?: string;
  internalNotes?: string;
  timeline?: PaymentTimelineItem[];
  paymentNotes?: PaymentNote[];
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface PaymentStats {
  totalPayments: number;
  totalCollected: number;
  pendingAmount: number;
  refundedAmount: number;
  todayRevenue: number;
  monthlyRevenue: number;
  collectionRate: number;
  outstandingBookings: number;
  outstandingAmount: number;
  statusBreakdown: Record<string, number>;
  methodBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  recentTrend: Array<{ month: string; collected: number; count: number }>;
}
export interface BookingPaymentSummary {
  bookingId: string;
  bookingNumber?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  payments: Payment[];
}
export interface PaymentFormData {
  bookingId: string;
  guestId?: string;
  amount: number;
  method: string;
  paymentType?: string;
  status?: string;
  transactionId?: string;
  upiReference?: string;
  notes?: string;
  internalNotes?: string;
}
export interface ReviewTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface ReviewNote { text: string; createdAt?: string; createdBy?: string | User; }
export interface ReviewDepartmentRatings { frontOffice?: number; housekeeping?: number; restaurant?: number; spa?: number; maintenance?: number; }
export interface Review {
  [key: string]: unknown;
  _id: string;
  id?: string;
  reviewNumber?: string;
  hotelId?: string;
  guestId?: string | Guest;
  bookingId?: string | Booking;
  status?: string;
  source?: string;
  requestChannel?: string;
  rating?: number;
  staffRating?: number;
  departmentRatings?: ReviewDepartmentRatings;
  feedback?: string;
  isPositive?: boolean;
  sentimentTags?: string[];
  googleReviewSent?: boolean;
  managerNotified?: boolean;
  managerReply?: string;
  repliedAt?: string;
  assignedTo?: string | User;
  requestSentAt?: string;
  submittedAt?: string;
  escalatedAt?: string;
  resolvedAt?: string;
  internalNotes?: string;
  notes?: ReviewNote[];
  timeline?: ReviewTimelineItem[];
  createdAt?: string;
  updatedAt?: string;
}
export interface ReviewStats {
  totalReviews: number;
  submittedReviews: number;
  pendingRequests: number;
  requestedReviews: number;
  negativeReviews: number;
  positiveReviews: number;
  averageRating: number;
  reputationScore: number;
  newReviewsThisMonth: number;
  responseRate: number;
  googleReviewSentCount: number;
  ratingDistribution: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  recentTrend: Array<{ month: string; count: number; averageRating: number }>;
}
export interface ReviewFormData {
  bookingId: string;
  guestId: string;
  rating?: number;
  feedback?: string;
  source?: string;
  status?: string;
  staffRating?: number;
  internalNotes?: string;
}
export interface CampaignTimelineItem { action: string; message?: string; createdAt?: string; createdBy?: string | User; metadata?: Record<string, unknown>; }
export interface CampaignNote { text: string; createdAt?: string; createdBy?: string | User; }
export interface CampaignStatsSummary { total: number; sent: number; delivered: number; failed: number; responded: number; leadsGenerated?: number; bookingsGenerated?: number; revenueGenerated?: number; }
export interface CampaignAudienceFilters { city?: string; tags?: string[]; lastBookingDays?: number; inactiveDays?: number; customGuestIds?: string[]; customLeadIds?: string[]; customEnquiryIds?: string[]; }
export interface Campaign {
  [key: string]: unknown;
  _id: string;
  id?: string;
  hotelId?: string;
  campaignNumber?: string;
  name: string;
  type: string;
  channel?: string;
  status: string;
  message?: string;
  subject?: string;
  description?: string;
  targetAudience?: string;
  audienceSegment?: string;
  audienceFilters?: CampaignAudienceFilters;
  scheduledAt?: string;
  launchedAt?: string;
  completedAt?: string;
  pausedAt?: string;
  cancelledAt?: string;
  assignedTo?: string | User;
  internalNotes?: string;
  notes?: CampaignNote[];
  timeline?: CampaignTimelineItem[];
  stats?: CampaignStatsSummary;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}
export interface CampaignFormData {
  name: string;
  type: string;
  channel?: string;
  message: string;
  subject?: string;
  description?: string;
  targetAudience?: string;
  audienceSegment?: string;
  audienceFilters?: CampaignAudienceFilters;
  scheduledAt?: string;
  status?: string;
  assignedTo?: string;
  internalNotes?: string;
  tags?: string[];
}
export interface CampaignStats {
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
export interface CampaignAudiencePreview { segment: string; totalCount: number; sample: Array<{ guestId?: string; leadId?: string; enquiryId?: string; name: string; phone: string; email?: string }>; }
export interface CampaignLog {
  _id: string;
  id?: string;
  campaignId?: string;
  guestId?: string;
  leadId?: string;
  enquiryId?: string;
  recipientName?: string;
  recipientEmail?: string;
  phone: string;
  channel?: string;
  status: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  respondedAt?: string;
  createdAt?: string;
  campaign?: { id: string; name: string; type: string; status: string; campaignNumber?: string };
}

export interface WhatsAppMessage {
  [key: string]: unknown;
  _id: string;
  id?: string;
  hotelId?: string;
  guestId?: string | Guest;
  guest?: { id: string; fullName?: string; phone?: string };
  enquiryId?: string;
  leadId?: string;
  bookingId?: string | Booking;
  campaignId?: string | Campaign;
  taskId?: string;
  assignedTo?: string | User;
  phone: string;
  direction: 'incoming' | 'outgoing';
  messageType?: string;
  content: string;
  mediaUrl?: string;
  templateName?: string;
  templateLanguage?: string;
  automationTrigger?: string;
  whatsappMessageId?: string;
  status: string;
  failureReason?: string;
  retryCount?: number;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedAt?: string;
  internalNotes?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface WhatsAppConversation {
  phone: string;
  guestId?: string;
  guestName?: string;
  lastMessage: string;
  lastMessageAt?: string;
  lastDirection?: string;
  lastStatus?: string;
  unreadCount: number;
  messageCount: number;
  assignedTo?: string;
}

export interface WhatsAppStats {
  totalMessages: number;
  incomingMessages: number;
  outgoingMessages: number;
  sentMessages: number;
  deliveredMessages: number;
  readMessages: number;
  failedMessages: number;
  scheduledMessages: number;
  queuedMessages: number;
  deliveryRate: number;
  readRate: number;
  replyRate: number;
  automationSuccessRate: number;
  activeConversations: number;
  activeTemplates: number;
  activeAutomationRules: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byTrigger: Record<string, number>;
}

export interface WhatsAppTemplate {
  _id: string;
  id?: string;
  name: string;
  category?: string;
  language?: string;
  status?: string;
  header?: string;
  body: string;
  footer?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone?: string }>;
  isActive?: boolean;
  createdAt?: string;
}

export interface WhatsAppAutomationRule {
  _id: string;
  id?: string;
  name: string;
  trigger: string;
  description?: string;
  isActive?: boolean;
  messageType?: 'text' | 'template';
  messageContent?: string;
  templateId?: string | WhatsAppTemplate;
  template?: WhatsAppTemplate;
  delayMinutes?: number;
  assignedTo?: string | User;
  stats?: { triggered: number; sent: number; failed: number };
}

export interface WhatsAppIntegrationStatus {
  configured: boolean;
  provider: string;
}

export interface GenericEntity { _id: string; id?: string; [key: string]: unknown; }

export interface RoomTypeFormData { name: string; code?: string; description?: string; shortDescription?: string; basePrice: number; weekdayPrice?: number; weekendPrice?: number; extraAdultPrice?: number; extraChildPrice?: number; taxPercentage?: number; discountPercentage?: number; maxGuests: number; maxAdults?: number; maxChildren?: number; bedType?: string; roomSize?: number; roomSizeUnit?: string; totalRooms?: number; amenities?: string[]; facilities?: string[]; coverImage?: string; cancellationPolicy?: string; checkInInstructions?: string; internalNotes?: string; mealPlan?: string; inventoryType?: string; status?: string; isAvailableForBooking?: boolean; isVisibleOnWebsite?: boolean; isPopular?: boolean; sortOrder?: number; tags?: string[]; metadata?: Record<string, unknown>; isActive?: boolean; }
export interface RoomTypeStats { [key: string]: number | Record<string, number> | Array<Record<string, unknown>> | undefined; totalRoomTypes: number; activeRoomTypes: number; inactiveRoomTypes: number; bookableRoomTypes?: number; websiteVisibleRoomTypes?: number; visibleOnWebsite?: number; availableForBooking?: number; averageBasePrice: number; lowestPrice?: number; highestPrice?: number; totalRooms?: number; totalRoomsLinked?: number; totalAvailableRooms?: number; totalOccupiedRooms?: number; totalBookings?: number; totalRevenue?: number; popularRoomTypes?: Array<{ id: string; name: string; bookings: number; revenue: number; linkedRooms: number; availableRooms: number }>; roomTypesWithoutImages?: number; amenityUsage?: Record<string, number>; }
export interface RoomTypeAvailability { roomTypeId: string; name: string; totalRooms: number; sellableRooms: number; unavailableRooms: number; availableRooms: number; occupancyPercentage: number; }
export interface StaffFormData { employeeId?: string; fullName: string; email: string; phone: string; alternatePhone?: string; role: string; department?: string; designation?: string; profileImage?: string; gender?: string; dateOfBirth?: string; joiningDate?: string; salary?: number; experienceYears?: number; skills?: string[]; shiftType?: string; shiftStartTime?: string; shiftEndTime?: string; address?: string; emergencyContactName?: string; emergencyContactPhone?: string; documents?: StaffDocument[]; notes?: string; permissions?: string[]; password?: string; status?: string; }
