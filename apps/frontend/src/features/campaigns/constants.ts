export const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

export const CAMPAIGN_TYPES = [
  { value: 'whatsapp_campaign', label: 'WhatsApp Campaign' },
  { value: 'sms_campaign', label: 'SMS Campaign' },
  { value: 'email_campaign', label: 'Email Campaign' },
  { value: 'review_request', label: 'Review Request Campaign' },
  { value: 'festival_offer', label: 'Festival Offer' },
  { value: 'weekend_offer', label: 'Weekend Offer' },
  { value: 'corporate_offer', label: 'Corporate Offer' },
  { value: 'wedding_event_promotion', label: 'Wedding/Event Promotion' },
  { value: 'repeat_guest_offer', label: 'Repeat Guest Offer' },
  { value: 'ota_to_direct', label: 'OTA to Direct Booking' },
  { value: 'old_guests', label: 'Old Guests' },
  { value: 'birthday_offer', label: 'Birthday Offer' },
];

export const CAMPAIGN_CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

export const CAMPAIGN_AUDIENCE_SEGMENTS = [
  { value: 'all_guests', label: 'All Guests' },
  { value: 'new_guests', label: 'New Guests' },
  { value: 'repeat_guests', label: 'Repeat Guests' },
  { value: 'vip_guests', label: 'VIP Guests' },
  { value: 'corporate_guests', label: 'Corporate Guests' },
  { value: 'past_guests', label: 'Past Guests' },
  { value: 'inactive_guests', label: 'Inactive Guests' },
  { value: 'leads', label: 'Leads' },
  { value: 'enquiries', label: 'Enquiries' },
  { value: 'custom_segment', label: 'Custom Segment' },
];

export const CAMPAIGN_VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];
export const CAMPAIGN_MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'sales_staff'];
