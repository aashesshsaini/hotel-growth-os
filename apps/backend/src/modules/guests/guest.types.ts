import { FoodPreference, GuestSource, GuestType, IdProofType } from '../../models/Guest';

export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface GuestStatsResult {
  totalGuests: number;
  newGuestsThisMonth: number;
  repeatGuests: number;
  vipGuests: number;
  blacklistedGuests: number;
  birthdayThisMonth: number;
  anniversaryThisMonth: number;
  topCities: Record<string, number>;
  topSpendingGuests: Array<{ id: string; fullName: string; totalSpend: number }>;
  guestsWithNoBooking: number;
  campaignEligible: number;
}

export interface GuestDocumentInput {
  url: string;
  publicId?: string;
  documentType?: string;
}

export interface GuestHistoryResult {
  guest: SanitizedGuest;
  bookings: unknown[];
  enquiries: unknown[];
  payments: unknown[];
  reviews: unknown[];
  campaigns: unknown[];
  whatsappMessages: unknown[];
  summary: {
    totalSpend: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    noShowCount: number;
    isRepeatGuest: boolean;
  };
}

export interface SanitizedGuest extends Record<string, unknown> {
  id?: string;
  fullName: string;
  name: string;
  guestType?: GuestType;
  source?: GuestSource;
  foodPreference?: FoodPreference;
  idProofType?: IdProofType;
  auditLogs?: unknown[];
}

export interface MergeGuestsResult {
  primaryGuest: SanitizedGuest;
  mergedGuestId: string;
}
