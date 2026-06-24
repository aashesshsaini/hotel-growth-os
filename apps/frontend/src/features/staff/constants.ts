export const STAFF_ROLES = [
  { value: 'hotel_manager', label: 'Hotel Manager' },
  { value: 'reception_staff', label: 'Reception Staff' },
  { value: 'sales_staff', label: 'Sales Staff' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'security', label: 'Security' },
];

export const STAFF_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export const SHIFT_TYPES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
  { value: 'rotational', label: 'Rotational' },
  { value: 'flexible', label: 'Flexible' },
];

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const STAFF_PERMISSIONS = [
  { key: 'manage_rooms', label: 'Manage Rooms' },
  { key: 'manage_bookings', label: 'Manage Bookings' },
  { key: 'manage_enquiries', label: 'Manage Enquiries' },
  { key: 'manage_guests', label: 'Manage Guests' },
  { key: 'manage_payments', label: 'Manage Payments' },
  { key: 'manage_campaigns', label: 'Manage Campaigns' },
  { key: 'manage_reviews', label: 'Manage Reviews' },
  { key: 'view_reports', label: 'View Reports' },
  { key: 'manage_staff', label: 'Manage Staff' },
  { key: 'manage_settings', label: 'Manage Settings' },
];

export const ROLE_COLORS: Record<string, string> = {
  hotel_owner: 'bg-purple-100 text-purple-800',
  hotel_manager: 'bg-indigo-100 text-indigo-800',
  reception_staff: 'bg-blue-100 text-blue-800',
  sales_staff: 'bg-cyan-100 text-cyan-800',
  accountant: 'bg-emerald-100 text-emerald-800',
  housekeeping: 'bg-amber-100 text-amber-800',
  maintenance: 'bg-orange-100 text-orange-800',
  security: 'bg-slate-100 text-slate-800',
};

export const MANAGEMENT_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager'];

export const emptyStaffForm = {
  fullName: '',
  email: '',
  phone: '',
  alternatePhone: '',
  role: 'reception_staff',
  department: '',
  designation: '',
  gender: '',
  joiningDate: new Date().toISOString().split('T')[0],
  shiftType: 'morning',
  shiftStartTime: '09:00',
  shiftEndTime: '18:00',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  salary: undefined as number | undefined,
  status: 'active',
  password: '',
};
