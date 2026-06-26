import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  Booking,
  BookingDetails,
  BookingFormData,
  BookingStats,
  ListParams,
  PaginatedResponse,
} from '@/types';

export const getBookings = (params?: ListParams) => apiGet<PaginatedResponse<Booking>>('/bookings', params);
export const getBookingsById = (id: string) => apiGet<BookingDetails>(`/bookings/${id}`);
export const getBookingStats = (params?: ListParams) => apiGet<BookingStats>('/bookings/stats', params);
export const getUpcomingCheckIns = (params?: ListParams) => apiGet<Booking[]>('/bookings/upcoming/check-ins', params);
export const getUpcomingCheckOuts = (params?: ListParams) => apiGet<Booking[]>('/bookings/upcoming/check-outs', params);
export const createBookings = (payload: BookingFormData) => apiPost<BookingDetails>('/bookings', payload);
export const updateBookings = (id: string, payload: Partial<BookingFormData>) => apiPatch<BookingDetails>(`/bookings/${id}`, payload);
export const updateBookingStatus = (id: string, status: string, note?: string) => apiPatch<BookingDetails>(`/bookings/${id}/status`, { status, note });
export const cancelBooking = (id: string, reason: string) => apiPatch<BookingDetails>(`/bookings/${id}/cancel`, { reason });
export const checkInBooking = (id: string) => apiPatch<BookingDetails>(`/bookings/${id}/check-in`, {});
export const checkOutBooking = (id: string) => apiPatch<BookingDetails>(`/bookings/${id}/check-out`, {});
export const assignBookingRoom = (id: string, roomId: string, note?: string) => apiPatch<BookingDetails>(`/bookings/${id}/assign-room`, { roomId, note });
export const updateBookingNotes = (id: string, payload: { notes?: string; internalNotes?: string }) => apiPatch<BookingDetails>(`/bookings/${id}/notes`, payload);
export const recordBookingPayment = (id: string, payload: { amount: number; method: string; status?: string; transactionId?: string; notes?: string }) => apiPost<BookingDetails>(`/bookings/${id}/payments`, payload);
export const deleteBookings = (id: string) => apiDelete<void>(`/bookings/${id}`);
