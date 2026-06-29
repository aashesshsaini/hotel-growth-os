import { z } from 'zod';
import { objectIdSchema, paginationSchema } from '../../validations/common';

export const platformHotelListQuerySchema = paginationSchema.extend({
  status: z.enum(['active', 'inactive', 'trial', 'expired', 'suspended']).optional(),
  subscriptionStatus: z.enum(['trial', 'active', 'expired', 'inactive', 'suspended']).optional(),
  billingType: z.enum(['trial', 'paid']).optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  plan: z.string().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  renewalFrom: z.coerce.date().optional(),
  renewalTo: z.coerce.date().optional(),
  sortPreset: z.enum(['newest', 'oldest', 'name', 'renewal', 'hotels_count']).optional(),
});

const planSchema = z.enum(['starter', 'professional', 'enterprise', 'standard', 'growth']);
const subscriptionStatusSchema = z.enum(['trial', 'active', 'expired', 'inactive', 'suspended']);
const planNameSchema = z.enum(['Starter', 'Pro', 'Enterprise', 'Custom']);
const planFeaturesSchema = z.object({
  crmAccess: z.boolean().default(false),
  analyticsAccess: z.boolean().default(false),
  apiAccess: z.boolean().default(false),
  multiBranchSupport: z.boolean().default(false),
  prioritySupport: z.boolean().default(false),
});

export const platformHotelCreateSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1).default('NA'),
  country: z.string().min(1).default('India'),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  logo: z.string().optional(),
  plan: planSchema.optional(),
  subscriptionStatus: subscriptionStatusSchema.optional(),
  billingType: z.enum(['trial', 'paid']).optional(),
  renewalDate: z.coerce.date().optional(),
  healthScore: z.coerce.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const platformHotelUpdateSchema = platformHotelCreateSchema.partial();

export const platformHotelStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const impersonateSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const platformHotelBulkActionSchema = z.object({
  ids: z.array(objectIdSchema).min(1).max(100),
  action: z.enum(['activate', 'suspend', 'delete', 'assign_plan', 'export']),
  plan: planSchema.optional(),
  reason: z.string().max(500).optional(),
});

export const platformHotelResetPasswordSchema = z.object({
  temporaryPassword: z.string().min(8).optional(),
});

export const platformHotelSendEmailSchema = z.object({
  subject: z.string().min(2).max(200),
  message: z.string().min(2).max(2000),
});

export const platformPlanListQuerySchema = paginationSchema.extend({
  status: z.enum(['active', 'inactive']).optional(),
  currency: z.string().optional(),
});

export const platformPlanCreateSchema = z.object({
  name: planNameSchema,
  description: z.string().max(1000).optional(),
  priceMonthly: z.coerce.number().min(0).default(0),
  priceYearly: z.coerce.number().min(0).default(0),
  currency: z.string().min(2).default('INR'),
  trialDays: z.coerce.number().int().min(0).default(14),
  maxHotelsAllowed: z.coerce.number().int().min(1).default(1),
  maxStaffAllowed: z.coerce.number().int().min(1).default(10),
  maxRoomsAllowed: z.coerce.number().int().min(1).default(50),
  features: planFeaturesSchema.default({}),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const platformPlanUpdateSchema = platformPlanCreateSchema.partial();

export const platformPlanStatusSchema = z.object({
  isActive: z.boolean(),
});

export const platformSubscriptionListQuerySchema = paginationSchema.extend({
  planId: objectIdSchema.optional(),
  status: z.enum(['trial', 'active', 'expired', 'suspended', 'cancelled']).optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const platformSubscriptionAssignSchema = z.object({
  hotelId: objectIdSchema,
  planId: objectIdSchema,
  status: z.enum(['trial', 'active', 'expired', 'suspended', 'cancelled']).default('trial'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  renewalDate: z.coerce.date().optional(),
  autoRenew: z.boolean().default(true),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
});

export const platformSubscriptionActionSchema = z.object({
  action: z.enum(['change_plan', 'extend_trial', 'suspend', 'reactivate', 'cancel', 'force_expire', 'toggle_auto_renew']),
  planId: objectIdSchema.optional(),
  renewalDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  trialDays: z.coerce.number().int().min(1).max(365).optional(),
  autoRenew: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});

export const platformInvoiceListQuerySchema = paginationSchema.extend({
  status: z.enum(['draft', 'issued', 'paid', 'overdue', 'failed', 'cancelled']).optional(),
  planId: objectIdSchema.optional(),
  hotelId: objectIdSchema.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
});

export const platformInvoiceGenerateSchema = z.object({
  subscriptionId: objectIdSchema,
  issuedDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  status: z.enum(['draft', 'issued']).default('issued'),
  taxRate: z.coerce.number().min(0).max(100).default(18),
});

export const platformInvoiceActionSchema = z.object({
  action: z.enum(['mark_paid', 'mark_failed', 'mark_overdue', 'cancel', 'regenerate', 'send_email', 'export']),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  gateway: z.enum(['stripe', 'razorpay', 'manual', 'none']).optional(),
  failureReason: z.string().max(500).optional(),
  reason: z.string().max(500).optional(),
});

export const platformAnalyticsQuerySchema = z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  planId: objectIdSchema.optional(),
  country: z.string().optional(),
  status: z.enum(['trial', 'active', 'expired', 'suspended', 'cancelled', 'inactive']).optional(),
  minRevenue: z.coerce.number().min(0).optional(),
  maxRevenue: z.coerce.number().min(0).optional(),
});

export const platformTicketListQuerySchema = paginationSchema.extend({
  status: z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed', 'reopened']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category: z.enum(['billing', 'technical', 'account', 'subscription', 'bug', 'feature_request', 'other']).optional(),
  assignedTo: objectIdSchema.optional(),
  hotelId: objectIdSchema.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

export const platformTicketCreateSchema = z.object({
  hotelId: objectIdSchema,
  subject: z.string().min(3).max(200),
  description: z.string().min(3).max(4000),
  category: z.enum(['billing', 'technical', 'account', 'subscription', 'bug', 'feature_request', 'other']).default('other'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedTo: objectIdSchema.optional(),
  tags: z.array(z.string()).optional().default([]),
});

export const platformTicketActionSchema = z.object({
  action: z.enum(['assign', 'change_priority', 'change_status', 'add_internal_note', 'add_public_reply', 'escalate', 'close', 'reopen', 'merge_design']),
  assignedTo: objectIdSchema.optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed', 'reopened']).optional(),
  message: z.string().max(4000).optional(),
  resolutionNotes: z.string().max(4000).optional(),
  reason: z.string().max(1000).optional(),
});

export const platformSystemHealthQuerySchema = z.object({
  refreshWindow: z.enum(['5m', '15m', '1h', '24h']).optional(),
  serviceStatus: z.enum(['healthy', 'slow', 'down']).optional(),
  minErrorRate: z.coerce.number().min(0).max(100).optional(),
  maxLatency: z.coerce.number().min(0).optional(),
});

export const platformIncidentListQuerySchema = paginationSchema.extend({
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  affectedService: z.string().optional(),
});

export const idParamSchema = z.object({ id: objectIdSchema });

export type PlatformHotelListQuery = z.infer<typeof platformHotelListQuerySchema>;
export type PlatformHotelCreateInput = z.infer<typeof platformHotelCreateSchema>;
export type PlatformHotelUpdateInput = z.infer<typeof platformHotelUpdateSchema>;
export type PlatformHotelStatusInput = z.infer<typeof platformHotelStatusSchema>;
export type ImpersonateInput = z.infer<typeof impersonateSchema>;
export type PlatformHotelBulkActionInput = z.infer<typeof platformHotelBulkActionSchema>;
export type PlatformHotelResetPasswordInput = z.infer<typeof platformHotelResetPasswordSchema>;
export type PlatformHotelSendEmailInput = z.infer<typeof platformHotelSendEmailSchema>;
export type PlatformPlanListQuery = z.infer<typeof platformPlanListQuerySchema>;
export type PlatformPlanCreateInput = z.infer<typeof platformPlanCreateSchema>;
export type PlatformPlanUpdateInput = z.infer<typeof platformPlanUpdateSchema>;
export type PlatformPlanStatusInput = z.infer<typeof platformPlanStatusSchema>;
export type PlatformSubscriptionListQuery = z.infer<typeof platformSubscriptionListQuerySchema>;
export type PlatformSubscriptionAssignInput = z.infer<typeof platformSubscriptionAssignSchema>;
export type PlatformSubscriptionActionInput = z.infer<typeof platformSubscriptionActionSchema>;
export type PlatformInvoiceListQuery = z.infer<typeof platformInvoiceListQuerySchema>;
export type PlatformInvoiceGenerateInput = z.infer<typeof platformInvoiceGenerateSchema>;
export type PlatformInvoiceActionInput = z.infer<typeof platformInvoiceActionSchema>;
export type PlatformAnalyticsQuery = z.infer<typeof platformAnalyticsQuerySchema>;
export type PlatformTicketListQuery = z.infer<typeof platformTicketListQuerySchema>;
export type PlatformTicketCreateInput = z.infer<typeof platformTicketCreateSchema>;
export type PlatformTicketActionInput = z.infer<typeof platformTicketActionSchema>;
export type PlatformSystemHealthQuery = z.infer<typeof platformSystemHealthQuerySchema>;
export type PlatformIncidentListQuery = z.infer<typeof platformIncidentListQuerySchema>;
