export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface EventLeadStats {
  totalEvents: number;
  upcomingEvents: number;
  pipelineValue: number;
  totalRevenue: number;
  outstandingAmount: number;
  pendingFollowUps: number;
  siteVisitsThisWeek: number;
  proposalsSent: number;
  convertedEvents: number;
  statusBreakdown: Record<string, number>;
  eventTypeBreakdown: Record<string, number>;
  monthlyRevenue: number;
}

export interface EventPipelineColumn {
  status: string;
  label: string;
  count: number;
  value: number;
  events: Array<{
    id: string;
    eventNumber: string;
    eventName: string;
    eventType: string;
    contactPerson: string;
    eventDate?: string;
    guestCount: number;
    totalValue: number;
    priority: string;
    followUpDate?: string;
    assignedToName?: string;
  }>;
}

export interface EventLeadDetails {
  event: Record<string, unknown>;
  bookings: Array<Record<string, unknown>>;
  revenueSummary: {
    totalValue: number;
    paidAmount: number;
    advanceAmount: number;
    outstandingAmount: number;
    bookingCount: number;
    bookingRevenue: number;
  };
  auditLogs?: Array<Record<string, unknown>>;
}
