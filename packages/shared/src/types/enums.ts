export const ENQUIRY_SOURCES = [
  'whatsapp',
  'phone',
  'website',
  'walk_in',
  'instagram',
  'facebook',
] as const;

export type EnquirySource = (typeof ENQUIRY_SOURCES)[number];

export const ENQUIRY_STATUSES = [
  'new',
  'contacted',
  'interested',
  'booked',
  'lost',
] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ROOM_STATUSES = [
  'available',
  'occupied',
  'reserved',
  'dirty',
  'cleaning',
  'maintenance',
  'blocked',
  'out_of_order',
  'inspection_pending',
] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const HOUSEKEEPING_STATUSES = [
  'clean',
  'dirty',
  'cleaning_in_progress',
  'inspected',
  'needs_attention',
] as const;

export type HousekeepingStatus = (typeof HOUSEKEEPING_STATUSES)[number];

export const MAINTENANCE_STATUSES = [
  'none',
  'minor_issue',
  'major_issue',
  'under_repair',
  'resolved',
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'unpaid',
  'partially_paid',
  'paid',
  'refunded',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  'cash',
  'upi',
  'card',
  'net_banking',
  'wallet',
  'razorpay',
  'bank_transfer',
  'other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_RECORD_STATUSES = [
  'pending',
  'partially_paid',
  'paid',
  'failed',
  'refunded',
  'cancelled',
] as const;

export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

export const PAYMENT_TYPES = ['advance', 'partial', 'full', 'refund', 'adjustment'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const INVOICE_STATUSES = ['draft', 'issued', 'sent', 'paid', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const CAMPAIGN_TYPES = [
  'whatsapp_campaign',
  'sms_campaign',
  'email_campaign',
  'review_request',
  'festival_offer',
  'weekend_offer',
  'corporate_offer',
  'wedding_event_promotion',
  'repeat_guest_offer',
  'ota_to_direct',
  'old_guests',
  'birthday_offer',
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_STATUSES = [
  'draft',
  'scheduled',
  'running',
  'paused',
  'completed',
  'cancelled',
  'failed',
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_CHANNELS = ['whatsapp', 'sms', 'email'] as const;

export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_AUDIENCE_SEGMENTS = [
  'all_guests',
  'new_guests',
  'repeat_guests',
  'vip_guests',
  'corporate_guests',
  'past_guests',
  'inactive_guests',
  'leads',
  'enquiries',
  'custom_segment',
] as const;

export type CampaignAudienceSegment = (typeof CAMPAIGN_AUDIENCE_SEGMENTS)[number];

export const CAMPAIGN_LOG_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'failed',
  'responded',
] as const;

export type CampaignLogStatus = (typeof CAMPAIGN_LOG_STATUSES)[number];

export const WHATSAPP_DIRECTIONS = ['incoming', 'outgoing'] as const;
export type WhatsAppDirection = (typeof WHATSAPP_DIRECTIONS)[number];

export const WHATSAPP_MESSAGE_TYPES = [
  'text',
  'image',
  'pdf',
  'video',
  'audio',
  'document',
  'location',
  'contact',
  'template',
  'interactive',
  'list',
  'button',
] as const;
export type WhatsAppMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number];

export const WHATSAPP_MESSAGE_STATUSES = [
  'queued',
  'scheduled',
  'received',
  'sent',
  'delivered',
  'read',
  'failed',
] as const;
export type WhatsAppMessageStatus = (typeof WHATSAPP_MESSAGE_STATUSES)[number];

export const WHATSAPP_AUTOMATION_TRIGGERS = [
  'welcome_message',
  'booking_confirmation',
  'booking_reminder',
  'check_in_reminder',
  'check_out_reminder',
  'payment_reminder',
  'review_request',
  'birthday_wishes',
  'anniversary_wishes',
  'repeat_guest_offer',
  'inactive_guest_reengagement',
  'lead_follow_up',
  'enquiry_response',
  'campaign_broadcast',
  'staff_notification',
  'internal_alert',
  'auto_reply',
] as const;
export type WhatsAppAutomationTrigger = (typeof WHATSAPP_AUTOMATION_TRIGGERS)[number];

export const WHATSAPP_TEMPLATE_STATUSES = ['draft', 'pending', 'approved', 'rejected'] as const;
export type WhatsAppTemplateStatus = (typeof WHATSAPP_TEMPLATE_STATUSES)[number];

export const REVIEW_STATUSES = [
  'pending_request',
  'requested',
  'submitted',
  'escalated',
  'resolved',
  'declined',
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_SOURCES = [
  'google',
  'website',
  'ota_booking',
  'ota_mmt',
  'ota_goibibo',
  'ota_agoda',
  'ota_expedia',
  'internal',
  'walk_in',
  'other',
] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

export const REVIEW_CHANNELS = ['whatsapp', 'sms', 'email', 'in_stay', 'staff', 'website'] as const;
export type ReviewChannel = (typeof REVIEW_CHANNELS)[number];
