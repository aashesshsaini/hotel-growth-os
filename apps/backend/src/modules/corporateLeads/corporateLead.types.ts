export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface CorporateLeadStats {
  totalCompanies: number;
  activeClients: number;
  pipelineValue: number;
  totalRevenue: number;
  outstandingAmount: number;
  pendingFollowUps: number;
  meetingsThisWeek: number;
  proposalsSent: number;
  statusBreakdown: Record<string, number>;
  companyTypeBreakdown: Record<string, number>;
  monthlyRevenue: number;
}

export interface CorporatePipelineColumn {
  status: string;
  label: string;
  count: number;
  value: number;
  companies: Array<{
    id: string;
    companyNumber: string;
    companyName: string;
    contactPerson: string;
    totalValue: number;
    priority: string;
    followUpDate?: string;
    assignedToName?: string;
  }>;
}

export interface CorporateLeadDetails {
  company: Record<string, unknown>;
  bookings: Array<Record<string, unknown>>;
  revenueSummary: {
    totalValue: number;
    paidAmount: number;
    outstandingAmount: number;
    bookingCount: number;
    bookingRevenue: number;
  };
  auditLogs?: Array<Record<string, unknown>>;
}
