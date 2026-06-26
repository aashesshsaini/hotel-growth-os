export const ANALYTICS_PERIODS = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'Last 7 Days' },
  { value: 'monthly', label: 'This Month' },
  { value: 'quarterly', label: 'This Quarter' },
  { value: 'yearly', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
] as const;

export const ANALYTICS_TABS = [
  { id: 'overview', label: 'Executive Summary' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'bookings', label: 'Bookings & Occupancy' },
  { id: 'guests', label: 'Guests & Leads' },
  { id: 'marketing', label: 'Marketing & WhatsApp' },
  { id: 'operations', label: 'Operations' },
] as const;

export const EXPORT_TYPES = [
  { value: 'overview', label: 'Executive Summary' },
  { value: 'revenue', label: 'Revenue Report' },
  { value: 'bookings', label: 'Booking Report' },
  { value: 'leads', label: 'Lead Funnel' },
  { value: 'payments', label: 'Payment Report' },
  { value: 'reviews', label: 'Review Report' },
] as const;

export type AnalyticsTabId = (typeof ANALYTICS_TABS)[number]['id'];
