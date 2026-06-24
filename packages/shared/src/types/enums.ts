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
  'maintenance',
  'blocked',
] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

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

export const PAYMENT_METHODS = ['cash', 'upi', 'razorpay', 'card', 'bank_transfer'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CAMPAIGN_TYPES = [
  'old_guests',
  'festival_offer',
  'weekend_offer',
  'birthday_offer',
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number];
