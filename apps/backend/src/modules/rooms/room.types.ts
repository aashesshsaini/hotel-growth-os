import { HousekeepingStatus, MaintenanceStatus, RoomStatus } from '@hotel-growth-os/shared';

export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface RoomStatsResult {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  dirtyRooms: number;
  cleaningRooms: number;
  maintenanceRooms: number;
  blockedRooms: number;
  outOfOrderRooms: number;
  occupancyPercentage: number;
  roomTypeWiseCount: Record<string, number>;
  floorWiseCount: Record<string, number>;
  housekeepingSummary: Record<string, number>;
}

export interface SanitizedRoom extends Record<string, unknown> {
  id?: string;
  floorNumber?: number;
  auditLogs?: unknown[];
}

export interface AvailableRoomResult {
  id: string;
  roomNumber: string;
  floorNumber?: number;
  buildingName?: string;
  wing?: string;
  status: RoomStatus;
  roomType?: {
    id: string;
    name: string;
    basePrice: number;
    maxGuests: number;
    amenities?: string[];
  };
  effectivePrice: number;
  effectiveMaxGuests: number;
}

export interface BulkCreateRoomsResult {
  created: number;
  skipped: number;
  rooms: SanitizedRoom[];
}
