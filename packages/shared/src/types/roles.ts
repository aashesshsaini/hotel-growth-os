export const ROLES = [
  'super_admin',
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
] as const;

export type UserRole = (typeof ROLES)[number];

export const HOTEL_ROLES: UserRole[] = [
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
];
