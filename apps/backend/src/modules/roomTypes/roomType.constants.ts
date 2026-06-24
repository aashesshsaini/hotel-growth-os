export const BED_TYPES = [
  'single',
  'double',
  'queen',
  'king',
  'twin',
  'bunk',
  'sofa_bed',
  'mixed',
] as const;

export const MEAL_PLANS = [
  'room_only',
  'breakfast',
  'half_board',
  'full_board',
  'all_inclusive',
] as const;

export const INVENTORY_TYPES = [
  'standard',
  'dormitory',
  'villa',
  'cottage',
  'banquet_room',
  'conference_room',
] as const;

export const ROOM_TYPE_STATUSES = ['active', 'inactive', 'archived'] as const;

export const ROOM_SIZE_UNITS = ['sqft', 'sqm'] as const;

export const MAX_ROOM_TYPE_IMAGES = 10;

export const ROOM_TYPE_MANAGEMENT_ROLES = ['hotel_owner', 'hotel_manager'] as const;

export const ROOM_TYPE_VIEW_ROLES = [
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
] as const;

export const canManageRoomTypes = (role: string): boolean => {
  return role === 'super_admin' || ROOM_TYPE_MANAGEMENT_ROLES.includes(role as (typeof ROOM_TYPE_MANAGEMENT_ROLES)[number]);
};

export const canViewRoomTypes = (role: string): boolean => {
  return role === 'super_admin' || ROOM_TYPE_VIEW_ROLES.includes(role as (typeof ROOM_TYPE_VIEW_ROLES)[number]);
};

export const canDeleteRoomTypes = (role: string): boolean => {
  return canManageRoomTypes(role);
};
