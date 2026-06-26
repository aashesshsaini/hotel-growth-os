import { HousekeepingStatus, MaintenanceStatus } from '@hotel-growth-os/shared';

export const ROOM_MANAGEMENT_ROLES = ['hotel_owner', 'hotel_manager'] as const;

export const ROOM_VIEW_ROLES = [
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'accountant',
  'housekeeping',
  'maintenance',
] as const;

export const ROOM_STATUS_UPDATE_ROLES = [
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
] as const;

export const HOUSEKEEPING_ROLES = [
  'hotel_owner',
  'hotel_manager',
  'housekeeping',
] as const;

export const MAINTENANCE_ROLES = [
  'hotel_owner',
  'hotel_manager',
  'maintenance',
] as const;

export const BOOKABLE_ROOM_STATUSES = ['available'] as const;

export const NON_BOOKABLE_ROOM_STATUSES = [
  'occupied',
  'reserved',
  'maintenance',
  'blocked',
  'out_of_order',
] as const;

export const canManageRooms = (role: string): boolean => {
  return role === 'super_admin' || ROOM_MANAGEMENT_ROLES.includes(role as (typeof ROOM_MANAGEMENT_ROLES)[number]);
};

export const canViewRooms = (role: string): boolean => {
  return role === 'super_admin' || ROOM_VIEW_ROLES.includes(role as (typeof ROOM_VIEW_ROLES)[number]);
};

export const canUpdateRoomStatus = (role: string): boolean => {
  return (
    role === 'super_admin' ||
    ROOM_STATUS_UPDATE_ROLES.includes(role as (typeof ROOM_STATUS_UPDATE_ROLES)[number])
  );
};

export const canUpdateHousekeeping = (role: string): boolean => {
  return role === 'super_admin' || HOUSEKEEPING_ROLES.includes(role as (typeof HOUSEKEEPING_ROLES)[number]);
};

export const canUpdateMaintenance = (role: string): boolean => {
  return role === 'super_admin' || MAINTENANCE_ROLES.includes(role as (typeof MAINTENANCE_ROLES)[number]);
};

export const canBulkCreateRooms = (role: string): boolean => canManageRooms(role);

export const canDeleteRooms = (role: string): boolean => canManageRooms(role);

export const syncStatusFromHousekeeping = (
  housekeepingStatus: HousekeepingStatus,
  currentStatus: string
): string | null => {
  if (housekeepingStatus === 'dirty') return 'dirty';
  if (housekeepingStatus === 'cleaning_in_progress') return 'cleaning';
  if (housekeepingStatus === 'clean' || housekeepingStatus === 'inspected') {
    if (['dirty', 'cleaning'].includes(currentStatus)) return 'available';
  }
  return null;
};

export const syncStatusFromMaintenance = (maintenanceStatus: MaintenanceStatus): string | null => {
  if (maintenanceStatus === 'under_repair' || maintenanceStatus === 'major_issue') {
    return 'maintenance';
  }
  if (maintenanceStatus === 'resolved' || maintenanceStatus === 'none') {
    return 'available';
  }
  return null;
};
