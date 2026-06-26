export const STAFF_ROLES = [
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
  'housekeeping',
  'maintenance',
  'security',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_STATUSES = ['active', 'inactive', 'on_duty', 'off_duty', 'leave', 'suspended', 'resigned'] as const;

export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const SHIFT_TYPES = ['morning', 'afternoon', 'evening', 'night', 'rotational', 'flexible'] as const;

export type ShiftType = (typeof SHIFT_TYPES)[number];

export const STAFF_PERMISSIONS = [
  'manage_rooms',
  'manage_bookings',
  'manage_enquiries',
  'manage_guests',
  'manage_payments',
  'manage_campaigns',
  'manage_reviews',
  'view_reports',
  'manage_staff',
  'manage_settings',
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;

export type Gender = (typeof GENDERS)[number];
