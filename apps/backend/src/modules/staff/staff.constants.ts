import {
  StaffPermission,
  StaffRole,
  STAFF_PERMISSIONS,
} from '@hotel-growth-os/shared';

const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  hotel_owner: [...STAFF_PERMISSIONS],
  hotel_manager: [
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
  ],
  reception_staff: ['manage_bookings', 'manage_enquiries', 'manage_guests'],
  sales_staff: ['manage_enquiries', 'manage_guests', 'manage_campaigns'],
  accountant: ['manage_payments', 'view_reports'],
  housekeeping: ['manage_rooms'],
  maintenance: ['manage_rooms'],
  security: ['view_reports'],
};

export const getDefaultPermissions = (role: StaffRole): StaffPermission[] => {
  return [...ROLE_DEFAULT_PERMISSIONS[role]];
};

export const STAFF_MANAGEMENT_ROLES: StaffRole[] = ['hotel_owner', 'hotel_manager'];

export const STAFF_VIEW_ROLES: StaffRole[] = [
  'hotel_owner',
  'hotel_manager',
  'reception_staff',
  'sales_staff',
  'housekeeping',
  'maintenance',
  'security',
];

export const canManageStaff = (role: string): boolean => {
  return role === 'super_admin' || STAFF_MANAGEMENT_ROLES.includes(role as StaffRole);
};

export const canViewStaffList = (role: string): boolean => {
  return role === 'super_admin' || STAFF_VIEW_ROLES.includes(role as StaffRole) || role === 'accountant';
};

export const isLimitedStaffViewer = (role: string): boolean => {
  return ['reception_staff', 'sales_staff', 'accountant', 'housekeeping', 'maintenance', 'security'].includes(role);
};
