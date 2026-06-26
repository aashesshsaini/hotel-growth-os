export const ROOM_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'out_of_order', label: 'Out of Order' },
  { value: 'inspection_pending', label: 'Inspection Pending' },
];

export const HOUSEKEEPING_STATUSES = [
  { value: 'clean', label: 'Clean' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'cleaning_in_progress', label: 'Cleaning In Progress' },
  { value: 'inspected', label: 'Inspected' },
  { value: 'needs_attention', label: 'Needs Attention' },
];

export const MAINTENANCE_STATUSES = [
  { value: 'none', label: 'None' },
  { value: 'minor_issue', label: 'Minor Issue' },
  { value: 'major_issue', label: 'Major Issue' },
  { value: 'under_repair', label: 'Under Repair' },
  { value: 'resolved', label: 'Resolved' },
];

export const MANAGEMENT_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager'];

export const emptyRoomForm = {
  roomNumber: '',
  roomTypeId: '',
  floorNumber: undefined as number | undefined,
  buildingName: '',
  wing: '',
  roomName: '',
  description: '',
  capacity: undefined as number | undefined,
  maxAdults: undefined as number | undefined,
  maxChildren: undefined as number | undefined,
  bedType: '',
  viewType: '',
  smokingPolicy: 'non_smoking',
  status: 'available',
  housekeepingStatus: 'clean',
  maintenanceStatus: 'none',
  assignedHousekeeperId: '',
  assignedMaintenanceStaffId: '',
  maxGuestsOverride: undefined as number | undefined,
  priceOverride: undefined as number | undefined,
  isPriceOverridden: false,
  isBookable: true,
  isVisibleToStaff: true,
  cleaningNotes: '',
  maintenanceNotes: '',
  housekeepingSchedule: '',
  maintenanceSchedule: '',
  internalNotes: '',
  amenitiesOverride: [] as string[],
  images: [] as import('@/types').RoomImage[],
  inspectionChecklist: [] as import('@/types').RoomInspectionItem[],
  notes: '',
  tags: [] as string[],
};

export const emptyBulkRoomForm = {
  roomTypeId: '',
  startRoomNumber: 101,
  endRoomNumber: 110,
  prefix: '',
  floorNumber: undefined as number | undefined,
  buildingName: '',
  wing: '',
};

export const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-800',
  occupied: 'bg-blue-100 text-blue-800',
  reserved: 'bg-indigo-100 text-indigo-800',
  dirty: 'bg-amber-100 text-amber-800',
  cleaning: 'bg-cyan-100 text-cyan-800',
  maintenance: 'bg-orange-100 text-orange-800',
  blocked: 'bg-red-100 text-red-800',
  out_of_order: 'bg-slate-200 text-slate-800',
  inspection_pending: 'bg-purple-100 text-purple-800',
};

export const HK_COLORS: Record<string, string> = {
  clean: 'bg-emerald-50 text-emerald-700',
  dirty: 'bg-amber-50 text-amber-700',
  cleaning_in_progress: 'bg-cyan-50 text-cyan-700',
  inspected: 'bg-blue-50 text-blue-700',
  needs_attention: 'bg-red-50 text-red-700',
};

export const MAINT_COLORS: Record<string, string> = {
  none: 'bg-slate-50 text-slate-600',
  minor_issue: 'bg-yellow-50 text-yellow-700',
  major_issue: 'bg-orange-50 text-orange-700',
  under_repair: 'bg-red-50 text-red-700',
  resolved: 'bg-emerald-50 text-emerald-700',
};

export const MAINTENANCE_ROLES = ['hotel_owner', 'hotel_manager', 'maintenance_staff', 'maintenance'];
