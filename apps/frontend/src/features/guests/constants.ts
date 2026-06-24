export const GUEST_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'family', label: 'Family' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'event_guest', label: 'Event Guest' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'ota_guest', label: 'OTA Guest' },
  { value: 'vip', label: 'VIP' },
] as const;

export const GUEST_SOURCES = [
  { value: 'manual', label: 'Manual' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'website', label: 'Website' },
  { value: 'phone', label: 'Phone' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google_business', label: 'Google Business' },
  { value: 'ota', label: 'OTA' },
  { value: 'referral', label: 'Referral' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
] as const;

export const FOOD_PREFERENCES = [
  { value: 'veg', label: 'Vegetarian' },
  { value: 'non_veg', label: 'Non-Veg' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'jain', label: 'Jain' },
  { value: 'no_preference', label: 'No Preference' },
] as const;

export const MANAGEMENT_ROLES = ['hotel_owner', 'hotel_manager', 'super_admin'];
export const CREATE_ROLES = [...MANAGEMENT_ROLES, 'reception_staff'];
export const VIEW_ROLES = [...CREATE_ROLES, 'sales_staff', 'accountant'];

export const MONTHS = [
  { value: '', label: 'Any month' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleString('en-IN', { month: 'long' }),
  })),
];

export const emptyGuestForm = (): import('@/types').GuestFormData => ({
  fullName: '',
  phone: '',
  alternatePhone: '',
  email: '',
  gender: '',
  dateOfBirth: '',
  anniversaryDate: '',
  city: '',
  state: '',
  country: 'India',
  address: '',
  guestType: 'individual',
  source: 'manual',
  foodPreference: 'no_preference',
  roomPreference: '',
  specialRequests: '',
  tags: [],
  notes: '',
  marketingConsent: false,
  whatsappConsent: false,
  emailConsent: false,
  isVip: false,
});

export const guestToForm = (guest: import('@/types').Guest): import('@/types').GuestFormData => ({
  fullName: guest.fullName || guest.name,
  phone: guest.phone,
  alternatePhone: guest.alternatePhone ?? '',
  email: guest.email ?? '',
  gender: guest.gender ?? '',
  dateOfBirth: guest.dateOfBirth?.split('T')[0] ?? '',
  anniversaryDate: guest.anniversaryDate?.split('T')[0] ?? '',
  city: guest.city ?? '',
  state: guest.state ?? '',
  country: guest.country ?? 'India',
  address: guest.address ?? '',
  guestType: guest.guestType ?? 'individual',
  source: guest.source ?? 'manual',
  foodPreference: guest.foodPreference ?? 'no_preference',
  roomPreference: guest.roomPreference ?? '',
  specialRequests: guest.specialRequests ?? '',
  tags: guest.tags ?? [],
  notes: guest.notes ?? '',
  marketingConsent: guest.marketingConsent ?? false,
  whatsappConsent: guest.whatsappConsent ?? false,
  emailConsent: guest.emailConsent ?? false,
  isVip: guest.isVip ?? false,
});

export const getGuestDisplayName = (guest: import('@/types').Guest): string =>
  guest.fullName || guest.name || 'Guest';
