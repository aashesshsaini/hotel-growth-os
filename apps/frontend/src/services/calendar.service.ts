import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  CalendarAvailabilityResponse,
  CalendarBookingsResponse,
  CalendarConflictResult,
  CalendarOccupancyResponse,
  CalendarOverview,
  CalendarView,
} from '@/types';

export interface CalendarQueryParams {
  view?: CalendarView;
  fromDate?: string;
  toDate?: string;
  roomId?: string;
  roomTypeId?: string;
  floor?: number;
  status?: string;
  bookingType?: string;
  search?: string;
  hotelId?: string;
}

export interface ConflictQueryParams {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  excludeBookingId?: string;
}

export interface MoveBookingPayload {
  checkInDate: string;
  checkOutDate: string;
  roomId?: string;
  note?: string;
}

export interface ResizeBookingPayload {
  checkInDate?: string;
  checkOutDate?: string;
  note?: string;
}

export interface QuickBookingPayload {
  guestId: string;
  roomId?: string;
  roomTypeId?: string;
  bookingType?: string;
  source?: string;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  totalAmount?: number;
  status?: string;
  notes?: string;
}

export const getCalendarOverview = (params?: CalendarQueryParams) =>
  apiGet<CalendarOverview>('/calendar/overview', params);

export const getCalendarBookings = (params?: CalendarQueryParams) =>
  apiGet<CalendarBookingsResponse>('/calendar/bookings', params);

export const getCalendarOccupancy = (params?: CalendarQueryParams) =>
  apiGet<CalendarOccupancyResponse>('/calendar/occupancy', params);

export const getCalendarAvailability = (params?: CalendarQueryParams) =>
  apiGet<CalendarAvailabilityResponse>('/calendar/availability', params);

export const checkCalendarConflict = (params: ConflictQueryParams) =>
  apiGet<CalendarConflictResult>('/calendar/conflicts', params);

export const moveCalendarBooking = (id: string, payload: MoveBookingPayload) =>
  apiPatch(`/calendar/bookings/${id}/move`, payload);

export const resizeCalendarBooking = (id: string, payload: ResizeBookingPayload) =>
  apiPatch(`/calendar/bookings/${id}/resize`, payload);

export const transferCalendarRoom = (id: string, payload: { roomId: string; note?: string }) =>
  apiPatch(`/calendar/bookings/${id}/transfer-room`, payload);

export const createQuickCalendarBooking = (payload: QuickBookingPayload) =>
  apiPost('/calendar/bookings/quick', payload);
