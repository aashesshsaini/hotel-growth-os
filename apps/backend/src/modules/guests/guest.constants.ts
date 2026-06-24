export const GUEST_TYPES = [
  'individual',
  'family',
  'corporate',
  'event_guest',
  'walk_in',
  'ota_guest',
  'vip',
] as const;

export const GUEST_SOURCES = [
  'manual',
  'whatsapp',
  'website',
  'phone',
  'walk_in',
  'instagram',
  'facebook',
  'google_business',
  'ota',
  'referral',
  'corporate',
  'event',
  'other',
] as const;

export const FOOD_PREFERENCES = ['veg', 'non_veg', 'vegan', 'jain', 'no_preference'] as const;

export const ID_PROOF_TYPES = [
  'aadhaar',
  'pan',
  'passport',
  'driving_license',
  'voter_id',
  'other',
] as const;

export const GUEST_MANAGEMENT_ROLES = ['hotel_owner', 'hotel_manager'] as const;

export const GUEST_CREATE_ROLES = ['hotel_owner', 'hotel_manager', 'reception_staff'] as const;

export const GUEST_VIEW_ROLES = [
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
] as const;

export const MAX_GUEST_DOCUMENTS = 10;

export const canManageGuests = (role: string): boolean =>
  role === 'super_admin' || GUEST_MANAGEMENT_ROLES.includes(role as (typeof GUEST_MANAGEMENT_ROLES)[number]);

export const canCreateGuests = (role: string): boolean =>
  role === 'super_admin' || GUEST_CREATE_ROLES.includes(role as (typeof GUEST_CREATE_ROLES)[number]);

export const canViewGuests = (role: string): boolean =>
  role === 'super_admin' || GUEST_VIEW_ROLES.includes(role as (typeof GUEST_VIEW_ROLES)[number]);

export const canMergeGuests = (role: string): boolean => canManageGuests(role);

export const canBlacklistGuests = (role: string): boolean => canManageGuests(role);

export const isLimitedGuestViewer = (role: string): boolean => role === 'accountant';

export const normalizeIndianPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
};

export const isValidIndianPhone = (phone: string): boolean => /^[6-9]\d{9}$/.test(normalizeIndianPhone(phone));

export const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};
