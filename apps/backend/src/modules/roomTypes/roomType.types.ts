import {
  BedType,
  InventoryType,
  MealPlan,
  RoomSizeUnit,
  RoomTypeStatus,
} from '../../models/RoomType';

export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface RoomTypeStatsResult {
  totalRoomTypes: number;
  activeRoomTypes: number;
  inactiveRoomTypes: number;
  visibleOnWebsite: number;
  availableForBooking: number;
  averageBasePrice: number;
  lowestPrice: number;
  highestPrice: number;
  totalRoomsLinked: number;
  roomTypesWithoutImages: number;
}

export interface RoomTypeImageInput {
  url: string;
  publicId?: string;
  altText?: string;
  sortOrder?: number;
}

export interface PublicRoomType {
  id: string;
  name: string;
  slug: string;
  code?: string;
  description?: string;
  shortDescription?: string;
  basePrice: number;
  weekdayPrice?: number;
  weekendPrice?: number;
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  bedType?: BedType;
  roomSize?: number;
  roomSizeUnit?: RoomSizeUnit;
  amenities: string[];
  facilities: string[];
  images: Array<{ url: string; altText?: string; sortOrder: number }>;
  coverImage?: string;
  mealPlan?: MealPlan;
  inventoryType?: InventoryType;
  cancellationPolicy?: string;
  checkInInstructions?: string;
  tags: string[];
}

export interface SanitizedRoomType extends Record<string, unknown> {
  id?: string;
  status: RoomTypeStatus;
  isActive: boolean;
  auditLogs?: unknown[];
  linkedRoomsCount?: number;
}

export interface PricingPreviewInput {
  basePrice: number;
  weekdayPrice?: number;
  weekendPrice?: number;
  taxPercentage?: number;
  discountPercentage?: number;
  extraAdultPrice?: number;
  extraChildPrice?: number;
  extraAdults?: number;
  extraChildren?: number;
  isWeekend?: boolean;
}

export interface PricingBreakdown {
  basePrice: number;
  effectivePrice: number;
  discountAmount: number;
  taxAmount: number;
  extraGuestCharges: number;
  finalPrice: number;
  weekdayPrice?: number;
  weekendPrice?: number;
}
