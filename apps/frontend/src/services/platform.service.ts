import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { ListParams, PaginatedResponse } from '@/types';

export interface PlatformChartPoint {
  label: string;
  value: number;
}

export interface PlatformDashboardResponse {
  generatedAt: string;
  overview: {
    totalHotels: number;
    activeHotels: number;
    inactiveHotels: number;
    trialHotels: number;
    expiredHotels: number;
    totalUsers: number;
    activeUsers: number;
    platformRevenue: number;
    monthlySignups: number;
    newHotelsThisMonth: number;
    activeSessions: number;
    storageUsage: string;
  };
  health: Record<string, string>;
  charts: Record<string, PlatformChartPoint[]>;
  recentActivities: Array<{
    id: string;
    action: string;
    entity: string;
    actor: string;
    hotel?: string;
    createdAt: string;
  }>;
}

export interface PlatformHotel {
  id: string;
  logo?: string;
  name: string;
  slug?: string;
  owner: string;
  ownerEmail?: string;
  ownerPhone?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone: string;
  currency: string;
  plan: string;
  billingType: string;
  subscriptionStatus: string;
  renewalDate?: string;
  createdAt?: string;
  totalStaff: number;
  totalRooms: number;
  currentOccupancy: number;
  healthScore: number;
  lastLoginAt?: string;
  isActive: boolean;
  status: string;
}

export interface PlatformHotelDetails extends PlatformHotel {
  businessInfo: {
    slug?: string;
    amenities: string[];
    policies: Record<string, unknown>;
    brandName?: string;
    chainId?: string;
    groupId?: string;
    franchiseId?: string;
    whiteLabelDomain?: string;
    marketplaceEnabled: boolean;
  };
  users: Array<{ _id: string; name: string; email: string; phone?: string; role: string; isActive: boolean; lastLoginAt?: string; createdAt?: string }>;
  roomsSummary: Array<{ _id: string; count: number }>;
  activityTimeline: Array<{ id: string; action: string; entity: string; actor: string; createdAt: string; changes?: Record<string, unknown> }>;
  integrations: Array<{ name: string; status: string }>;
  auditHistory: unknown[];
  futureReady: Record<string, string>;
}

export interface PlatformHotelPayload {
  name: string;
  slug?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  email?: string;
  phone?: string;
  city: string;
  state?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  logo?: string;
  plan?: 'starter' | 'professional' | 'enterprise' | 'standard' | 'growth';
  subscriptionStatus?: 'active' | 'trial' | 'expired' | 'inactive' | 'suspended';
  billingType?: 'trial' | 'paid';
  renewalDate?: string;
  healthScore?: number;
  isActive?: boolean;
}

export interface ImpersonationResponse {
  token: string;
  sessionId: string;
  impersonatedUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    hotelId?: string;
  };
  hotel: {
    id: string;
    name: string;
  };
}

export interface PlatformProfileResponse {
  avatar?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  lastLoginAt?: string;
  twoFactor: { status: string };
  loginHistory: unknown[];
  activeSessions: unknown[];
  notificationPreferences: Record<string, boolean>;
  preferences: { theme: string; language: string; timezone: string };
  activityLogs: Array<{ _id?: string; id?: string; action?: string; entity?: string; createdAt?: string }>;
}

export interface PlatformSettingsResponse {
  branding: { platformName: string; logo?: string };
  email: { status: string };
  whatsapp: { status: string; phoneNumberId: string };
  storage: Record<string, string>;
  cdn: { status: string };
  apiKeys: { status: string };
  security: { maintenanceMode: boolean; defaultPermissions: string };
  featureToggles: Record<string, boolean>;
}

export interface PlatformNotification {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
  severity: string;
}

export interface PlanFeatures {
  crmAccess: boolean;
  analyticsAccess: boolean;
  apiAccess: boolean;
  multiBranchSupport: boolean;
  prioritySupport: boolean;
}

export interface PlatformPlan {
  id: string;
  name: 'Starter' | 'Pro' | 'Enterprise' | 'Custom';
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  trialDays: number;
  maxHotelsAllowed: number;
  maxStaffAllowed: number;
  maxRoomsAllowed: number;
  features: PlanFeatures;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PlatformPlanPayload = Omit<PlatformPlan, 'id' | 'createdAt' | 'updatedAt'>;

export interface PlatformSubscription {
  id: string;
  hotelId: string;
  hotelName: string;
  ownerEmail?: string;
  planId: string;
  planName: string;
  status: 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled';
  startDate: string;
  endDate?: string;
  renewalDate?: string;
  autoRenew: boolean;
  billingCycle: 'monthly' | 'yearly';
  usageStats: Record<string, unknown>;
  updatedAt: string;
}

export interface PlatformSubscriptionPayload {
  hotelId: string;
  planId: string;
  status: PlatformSubscription['status'];
  startDate?: string;
  endDate?: string;
  renewalDate?: string;
  autoRenew: boolean;
  billingCycle: PlatformSubscription['billingCycle'];
}

export interface PlatformInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PlatformInvoice {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  hotelId: string;
  hotelName: string;
  ownerEmail?: string;
  subscriptionId: string;
  planId: string;
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'failed' | 'cancelled';
  amountSubtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  transactionId?: string;
  gateway?: 'stripe' | 'razorpay' | 'manual' | 'none';
  paymentDate?: string;
  failureReason?: string;
  retryAttempts: number;
  items: PlatformInvoiceItem[];
  refunds: Array<{ refundId: string; amount: number; reason?: string; status: string; processedAt?: string }>;
  history: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformInvoiceDetails extends PlatformInvoice {
  hotel: unknown;
  subscription: unknown;
  plan: unknown;
  taxBreakdown: Array<{ label: string; amount: number }>;
  paymentTimeline: Array<{ label: string; date?: string; status: string }>;
  billingHistory: Array<{ id: string; actor: string; action: string; createdAt: string; changes?: Record<string, unknown> }>;
}

export interface PlatformBillingSummary {
  totalInvoices: number;
  totalBilled: number;
  paidAmount: number;
  overdueAmount: number;
  failedAmount: number;
  statusCounts: Record<string, number>;
}

export interface PlatformAnalyticsResponse {
  generatedAt: string;
  metrics: {
    totalHotels: number;
    activeHotels: number;
    inactiveHotels: number;
    trialHotels: number;
    paidHotels: number;
    suspendedHotels: number;
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    mrr: number;
    arr: number;
    churnRate: number;
    retentionRate: number;
    growthRate: number;
    totalInvoicesGenerated: number;
    totalPaidInvoices: number;
    overdueInvoices: number;
    totalRooms: number;
    activeRooms: number;
    staffCount: number;
    activeUsers: number;
  };
  revenue: {
    revenueTrend: Array<{ label: string; value: number }>;
    mrrTrend: Array<{ label: string; value: number }>;
    arrTrend: Array<{ label: string; value: number }>;
    byPlan: Record<string, number>;
    byHotel: Record<string, number>;
    byCountry: Record<string, number>;
    growthCurve: Array<{ label: string; value: number }>;
  };
  subscriptions: {
    planDistribution: Record<string, number>;
    trialVsPaid: Record<string, number>;
    trialConversionRate: number;
    upgradeRate: number;
    downgradeRate: number;
    cancellationRate: number;
    averageSubscriptionLifetimeDays: number;
  };
  hotelPerformance: Array<{
    hotelId: string;
    hotelName: string;
    planName: string;
    subscriptionStatus: string;
    totalRooms: number;
    activeRooms: number;
    occupancyRate: number;
    staffCount: number;
    activeUsers: number;
    lastLogin?: string;
    engagementScore: number;
  }>;
  usage: {
    featureUsage: Record<string, number>;
    apiUsagePerHotel: Record<string, number>;
    loginFrequency: Record<string, number>;
    activeSessions: number;
    moduleUsageHeatmap: Record<string, number>;
  };
  segments: {
    trialUsers: number;
    paidUsers: number;
    highValueHotels: number;
    atRiskHotels: number;
  };
  activityTimeline: Array<{ id: string; actor: string; action: string; entity: string; entityAffected?: string; timestamp: string }>;
}

export interface PlatformSupportSummary {
  open: number;
  inProgress: number;
  pending: number;
  resolved: number;
  closed: number;
  urgent: number;
  escalated: number;
  slaBreached: number;
}

export interface PlatformTicket {
  id: string;
  ticketId: string;
  ticketNumber: string;
  hotelId: string;
  hotelName: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole: string;
  subject: string;
  description: string;
  category: 'billing' | 'technical' | 'account' | 'subscription' | 'bug' | 'feature_request' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'reopened';
  assignedTo?: string;
  assignedToName?: string;
  tags: string[];
  attachments: Array<{ name: string; url?: string; contentType?: string; size?: number; uploadedAt: string }>;
  resolutionNotes?: string;
  sla: { startedAt?: string; firstResponseDueAt?: string; resolutionDueAt?: string; firstRespondedAt?: string; breached: boolean };
  escalation: { isEscalated: boolean; escalatedAt?: string; reason?: string };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface PlatformTicketDetails extends PlatformTicket {
  hotel: unknown;
  createdByUser?: unknown;
  assignedAgent?: unknown;
  thread: Array<{ type: string; message: string; authorName?: string; createdAt: string; attachments: unknown[] }>;
  internalNotes: Array<{ type: string; message: string; authorName?: string; createdAt: string; attachments: unknown[] }>;
  activity: Array<{ action: string; oldValue?: Record<string, unknown>; newValue?: Record<string, unknown>; actorName?: string; createdAt: string }>;
  auditHistory: Array<{ id: string; actor: string; action: string; createdAt: string; changes?: Record<string, unknown> }>;
  mergeDesign: { enabled: boolean; note: string };
  agentMetrics: Record<string, string>;
}

export interface PlatformTicketPayload {
  hotelId: string;
  subject: string;
  description: string;
  category: PlatformTicket['category'];
  priority: PlatformTicket['priority'];
  assignedTo?: string;
  tags?: string[];
}

export interface PlatformServiceMetric {
  serviceName: 'auth' | 'billing' | 'subscription' | 'hotel' | 'support' | 'analytics';
  status: 'healthy' | 'slow' | 'down';
  latency: number;
  errorRate: number;
  throughput: number;
  lastUpdatedAt: string;
}

export interface PlatformApiMetric {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  responseTime: number;
  statusCodes: Record<string, number>;
  errorCount: number;
  lastCheckedAt: string;
}

export interface PlatformSystemIncident {
  id: string;
  incidentNumber: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedService: string;
  status: 'open' | 'acknowledged' | 'resolved';
  assignedEngineer?: string | { name?: string; email?: string; role?: string };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface PlatformSystemIncidentDetails extends PlatformSystemIncident {
  timeline: Array<{ event: string; description?: string; timestamp: string }>;
  errorLogsPreview: Array<{ timestamp: string; level: string; message: string }>;
  futureReady: Record<string, string>;
}

export interface PlatformSystemHealthResponse {
  generatedAt: string;
  autoRefresh: { enabled: boolean; intervalSeconds: number; webSocketReady: boolean; streamingLogsReady: boolean; realTimeAlertingReady: boolean };
  systemMetrics: {
    systemUptime: number;
    systemStatus: 'healthy' | 'degraded' | 'outage';
    activeUsers: number;
    totalRequests: number;
    requestsPerMinute: number;
    errorRate: number;
    successRate: number;
    avgResponseTime: number;
  };
  serviceMetrics: PlatformServiceMetric[];
  apiMetrics: PlatformApiMetric[];
  charts: {
    responseTimeTrend: Array<{ label: string; value: number }>;
    errorRateTrend: Array<{ label: string; value: number }>;
    requestVolumeTrend: Array<{ label: string; value: number }>;
    serviceLatency: Record<string, number>;
    statusCodeDistribution: Record<string, number>;
  };
  apiSummary: {
    slowestApis: PlatformApiMetric[];
    mostFailedEndpoints: PlatformApiMetric[];
    heatmap: { enabled: boolean; note: string };
  };
  alerts: Array<{
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    affectedService: string;
    status: 'open' | 'acknowledged' | 'resolved';
  }>;
  incidents: PlatformSystemIncident[];
  infrastructure: {
    database: { status: 'healthy' | 'slow' | 'down'; queryLatency: number; slowQueries: number; connectionPool: string };
    backgroundJobs: { status: 'healthy' | 'slow' | 'down'; queued: number; succeeded: number; failed: number };
    queueStatus: string;
    logStreaming: string;
  };
}

export const getPlatformDashboard = () => apiGet<PlatformDashboardResponse>('/platform/dashboard');
export type PlatformHotelListParams = ListParams & Record<string, unknown>;

export const getPlatformHotels = (params?: PlatformHotelListParams) => apiGet<PaginatedResponse<PlatformHotel>>('/platform/hotels', params);
export const getPlatformHotel = (id: string) => apiGet<PlatformHotelDetails>(`/platform/hotels/${id}`);
export const createPlatformHotel = (payload: PlatformHotelPayload) => apiPost<PlatformHotel>('/platform/hotels', payload);
export const updatePlatformHotel = (id: string, payload: Partial<PlatformHotelPayload>) => apiPatch<PlatformHotel>(`/platform/hotels/${id}`, payload);
export const updatePlatformHotelStatus = (id: string, isActive: boolean, reason?: string) =>
  apiPatch<PlatformHotel>(`/platform/hotels/${id}/status`, { isActive, reason });
export const deletePlatformHotel = (id: string) => apiDelete<void>(`/platform/hotels/${id}`);
export const bulkPlatformHotelAction = (payload: { ids: string[]; action: 'activate' | 'suspend' | 'delete' | 'assign_plan' | 'export'; plan?: string; reason?: string }) =>
  apiPost<{ action: string; affected: number; rows?: PlatformHotel[] }>('/platform/hotels/bulk', payload);
export const resetPlatformHotelOwnerPassword = (id: string, temporaryPassword?: string) =>
  apiPost<{ temporaryPassword: string }>(`/platform/hotels/${id}/reset-password`, { temporaryPassword });
export const sendPlatformHotelOwnerEmail = (id: string, payload: { subject: string; message: string }) =>
  apiPost<{ queued: boolean; recipient: string }>(`/platform/hotels/${id}/send-email`, payload);
export const exportPlatformHotel = (id: string) => apiGet<PlatformHotelDetails>(`/platform/hotels/${id}/export`);
export const impersonateHotelOwner = (id: string, reason?: string) =>
  apiPost<ImpersonationResponse>(`/platform/hotels/${id}/impersonate`, { reason });
export const endPlatformImpersonation = (sessionId: string) => apiPost<void>(`/platform/impersonation/${sessionId}/end`);
export const getPlatformProfile = () => apiGet<PlatformProfileResponse>('/platform/profile');
export const getPlatformSettings = () => apiGet<PlatformSettingsResponse>('/platform/settings');
export const getPlatformNotifications = () => apiGet<PlatformNotification[]>('/platform/notifications');
export const getPlatformPlans = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<PlatformPlan>>('/platform/plans', params);
export const createPlatformPlan = (payload: PlatformPlanPayload) => apiPost<PlatformPlan>('/platform/plans', payload);
export const updatePlatformPlan = (id: string, payload: Partial<PlatformPlanPayload>) => apiPatch<PlatformPlan>(`/platform/plans/${id}`, payload);
export const duplicatePlatformPlan = (id: string) => apiPost<PlatformPlan>(`/platform/plans/${id}/duplicate`);
export const updatePlatformPlanStatus = (id: string, isActive: boolean) => apiPatch<PlatformPlan>(`/platform/plans/${id}/status`, { isActive });
export const deletePlatformPlan = (id: string) => apiDelete<void>(`/platform/plans/${id}`);
export const getPlatformSubscriptions = (params?: ListParams & Record<string, unknown>) =>
  apiGet<PaginatedResponse<PlatformSubscription>>('/platform/subscriptions', params);
export const assignPlatformSubscription = (payload: PlatformSubscriptionPayload) => apiPost<PlatformSubscription>('/platform/subscriptions', payload);
export const runPlatformSubscriptionAction = (
  id: string,
  payload: {
    action: 'change_plan' | 'extend_trial' | 'suspend' | 'reactivate' | 'cancel' | 'force_expire' | 'toggle_auto_renew';
    planId?: string;
    renewalDate?: string;
    endDate?: string;
    trialDays?: number;
    autoRenew?: boolean;
    reason?: string;
  }
) => apiPost<PlatformSubscription>(`/platform/subscriptions/${id}/action`, payload);
export const getPlatformBillingSummary = () => apiGet<PlatformBillingSummary>('/platform/billing/summary');
export const getPlatformInvoices = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<PlatformInvoice>>('/platform/invoices', params);
export const getPlatformInvoice = (id: string) => apiGet<PlatformInvoiceDetails>(`/platform/invoices/${id}`);
export const generatePlatformInvoice = (payload: { subscriptionId: string; issuedDate?: string; dueDate?: string; status?: 'draft' | 'issued'; taxRate?: number }) =>
  apiPost<PlatformInvoice>('/platform/invoices/generate', payload);
export const runPlatformInvoiceAction = (
  id: string,
  payload: {
    action: 'mark_paid' | 'mark_failed' | 'mark_overdue' | 'cancel' | 'regenerate' | 'send_email' | 'export';
    paymentMethod?: string;
    transactionId?: string;
    gateway?: 'stripe' | 'razorpay' | 'manual' | 'none';
    failureReason?: string;
    reason?: string;
  }
) => apiPost<PlatformInvoice>(`/platform/invoices/${id}/action`, payload);
export const getPlatformAnalytics = (params?: Record<string, unknown>) => apiGet<PlatformAnalyticsResponse>('/platform/analytics', params);
export const getPlatformSupportSummary = () => apiGet<PlatformSupportSummary>('/platform/support/summary');
export const getPlatformTickets = (params?: ListParams & Record<string, unknown>) => apiGet<PaginatedResponse<PlatformTicket>>('/platform/support/tickets', params);
export const getPlatformTicket = (id: string) => apiGet<PlatformTicketDetails>(`/platform/support/tickets/${id}`);
export const createPlatformTicket = (payload: PlatformTicketPayload) => apiPost<PlatformTicket>('/platform/support/tickets', payload);
export const runPlatformTicketAction = (
  id: string,
  payload: {
    action: 'assign' | 'change_priority' | 'change_status' | 'add_internal_note' | 'add_public_reply' | 'escalate' | 'close' | 'reopen' | 'merge_design';
    assignedTo?: string;
    priority?: PlatformTicket['priority'];
    status?: PlatformTicket['status'];
    message?: string;
    resolutionNotes?: string;
    reason?: string;
  }
) => apiPost<PlatformTicket>(`/platform/support/tickets/${id}/action`, payload);
export const getPlatformSystemHealth = (params?: Record<string, unknown>) => apiGet<PlatformSystemHealthResponse>('/platform/system-health', params);
export const getPlatformSystemIncidents = (params?: ListParams & Record<string, unknown>) =>
  apiGet<PaginatedResponse<PlatformSystemIncident>>('/platform/system-health/incidents', params);
export const getPlatformSystemIncident = (id: string) => apiGet<PlatformSystemIncidentDetails>(`/platform/system-health/incidents/${id}`);
