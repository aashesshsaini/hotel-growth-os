export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export type CalendarView = 'day' | 'week' | 'month' | 'timeline' | 'resource';

export interface CalendarDateRange {
  from: string;
  to: string;
}

export interface CalendarEvent {
  id: string;
  bookingNumber: string;
  guestId: string;
  guestName: string;
  guestIsVip: boolean;
  roomId?: string;
  roomNumber?: string;
  roomTypeId?: string;
  roomTypeName?: string;
  floor?: number;
  bookingType: string;
  source: string;
  status: string;
  paymentStatus: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: number;
  paidAmount: number;
  adults: number;
  children: number;
  hasConflict: boolean;
  colorKey: string;
}

export interface CalendarBlockEvent {
  id: string;
  roomId: string;
  roomNumber: string;
  blockType: 'maintenance' | 'housekeeping' | 'blocked' | 'hold';
  title: string;
  from: string;
  to: string;
  status?: string;
  priority?: string;
  colorKey: string;
}

export interface CalendarResource {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  roomTypeName: string;
  floor?: number;
  status: string;
  housekeepingStatus: string;
  maintenanceStatus: string;
  isBlocked: boolean;
  currentGuestName?: string;
  currentBookingId?: string;
}

export interface CalendarRoomTypeGroup {
  id: string;
  name: string;
  code?: string;
  totalRooms: number;
  rooms: CalendarResource[];
}

export interface CalendarOverview {
  generatedAt: string;
  dateRange: CalendarDateRange;
  todayCheckIns: number;
  todayCheckOuts: number;
  upcomingArrivals: number;
  upcomingDepartures: number;
  inHouseGuests: number;
  occupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  blockedRooms: number;
  maintenanceRooms: number;
  dirtyRooms: number;
  conflictCount: number;
  pendingPayments: number;
}

export interface CalendarBookingsResponse {
  generatedAt: string;
  dateRange: CalendarDateRange;
  view: CalendarView;
  events: CalendarEvent[];
  blocks: CalendarBlockEvent[];
  resources: CalendarResource[];
  roomTypeGroups: CalendarRoomTypeGroup[];
}

export interface CalendarOccupancyDay {
  date: string;
  totalRooms: number;
  occupiedRooms: number;
  blockedRooms: number;
  occupancyRate: number;
  checkIns: number;
  checkOuts: number;
}

export interface CalendarOccupancyResponse {
  generatedAt: string;
  dateRange: CalendarDateRange;
  days: CalendarOccupancyDay[];
}

export interface CalendarAvailabilityRoom {
  roomId: string;
  roomNumber: string;
  roomTypeId: string;
  roomTypeName: string;
  floor?: number;
  isAvailable: boolean;
  conflictReason?: string;
}

export interface CalendarAvailabilityResponse {
  dateRange: CalendarDateRange;
  rooms: CalendarAvailabilityRoom[];
}

export interface CalendarConflictResult {
  hasConflict: boolean;
  conflictingBooking?: {
    id: string;
    bookingNumber: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
  };
  roomBlocked?: boolean;
  blockReason?: string;
}

export interface ResolvedCalendarRange {
  from: Date;
  to: Date;
}
