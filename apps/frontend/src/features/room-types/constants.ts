export const BED_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'queen', label: 'Queen' },
  { value: 'king', label: 'King' },
  { value: 'twin', label: 'Twin' },
  { value: 'bunk', label: 'Bunk' },
  { value: 'sofa_bed', label: 'Sofa Bed' },
  { value: 'mixed', label: 'Mixed' },
];

export const MEAL_PLANS = [
  { value: 'room_only', label: 'Room Only' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'half_board', label: 'Half Board' },
  { value: 'full_board', label: 'Full Board' },
  { value: 'all_inclusive', label: 'All Inclusive' },
];

export const INVENTORY_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'dormitory', label: 'Dormitory' },
  { value: 'villa', label: 'Villa' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'banquet_room', label: 'Banquet Room' },
  { value: 'conference_room', label: 'Conference Room' },
];

export const ROOM_TYPE_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

export const ROOM_SIZE_UNITS = [
  { value: 'sqft', label: 'Sq Ft' },
  { value: 'sqm', label: 'Sq M' },
];

export const COMMON_AMENITIES = [
  'AC', 'TV', 'WiFi', 'Attached Bathroom', 'Mini Bar', 'Living Area',
  'Balcony', 'Sea View', 'City View', 'Work Desk', 'Safe Locker',
  'Room Service', 'Daily Housekeeping', 'Laundry', 'Geyser',
];

export const MANAGEMENT_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager'];

export const emptyRoomTypeForm = {
  name: '',
  code: '',
  shortDescription: '',
  description: '',
  basePrice: 0,
  weekdayPrice: undefined as number | undefined,
  weekendPrice: undefined as number | undefined,
  extraAdultPrice: 0,
  extraChildPrice: 0,
  taxPercentage: 12,
  discountPercentage: 0,
  maxGuests: 2,
  maxAdults: 2,
  maxChildren: 0,
  bedType: 'queen',
  roomSize: undefined as number | undefined,
  roomSizeUnit: 'sqft',
  totalRooms: 0,
  amenities: [] as string[],
  facilities: [] as string[],
  mealPlan: 'room_only',
  inventoryType: 'standard',
  cancellationPolicy: '',
  checkInInstructions: '',
  internalNotes: '',
  isVisibleOnWebsite: true,
  isAvailableForBooking: true,
  isPopular: false,
  status: 'active',
  sortOrder: 0,
  tags: [] as string[],
};
