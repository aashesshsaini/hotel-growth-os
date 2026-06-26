export const REVIEW_STATUSES = [
  'pending_request',
  'requested',
  'submitted',
  'escalated',
  'resolved',
  'declined',
] as const;

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

export const REVIEW_CHANNELS = ['whatsapp', 'sms', 'email', 'in_stay', 'staff', 'website'] as const;

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending_request: 'Pending Request',
  requested: 'Requested',
  submitted: 'Submitted',
  escalated: 'Escalated',
  resolved: 'Resolved',
  declined: 'Declined',
};

export const REVIEW_SOURCE_LABELS: Record<string, string> = {
  google: 'Google',
  website: 'Website',
  ota_booking: 'Booking.com',
  ota_mmt: 'MakeMyTrip',
  ota_goibibo: 'Goibibo',
  ota_agoda: 'Agoda',
  ota_expedia: 'Expedia',
  internal: 'Internal',
  walk_in: 'Walk-in',
  other: 'Other',
};

export const RATING_OPTIONS = [5, 4, 3, 2, 1];

export const DEPARTMENT_RATING_FIELDS = [
  { key: 'frontOffice', label: 'Front Office' },
  { key: 'housekeeping', label: 'Housekeeping' },
  { key: 'restaurant', label: 'Restaurant' },
  { key: 'spa', label: 'Spa' },
  { key: 'maintenance', label: 'Maintenance' },
] as const;
