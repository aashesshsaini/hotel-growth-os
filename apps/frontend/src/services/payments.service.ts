import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { BookingPaymentSummary, ListParams, PaginatedResponse, Payment, PaymentStats } from '@/types';

export const getPaymentStats = () => apiGet<PaymentStats>('/payments/stats');
export const getPayments = (params?: ListParams) => apiGet<PaginatedResponse<Payment>>('/payments', params);
export const getPaymentById = (id: string) => apiGet<Payment>(`/payments/${id}`);
export const getBookingPaymentSummary = (bookingId: string) => apiGet<BookingPaymentSummary>(`/payments/booking/${bookingId}/summary`);
export const createPayment = (payload: Record<string, unknown>) => apiPost<Payment>('/payments', payload);
export const updatePayment = (id: string, payload: Record<string, unknown>) => apiPatch<Payment>(`/payments/${id}`, payload);
export const deletePayment = (id: string) => apiDelete<void>(`/payments/${id}`);
export const refundPayment = (id: string, payload: { amount?: number; refundReason: string; method?: string; notes?: string }) =>
  apiPost<Payment>(`/payments/${id}/refund`, payload);
export const updatePaymentStatus = (id: string, payload: { status: string; note?: string }) =>
  apiPatch<Payment>(`/payments/${id}/status`, payload);
export const addPaymentNote = (id: string, payload: { text: string }) => apiPatch<Payment>(`/payments/${id}/notes`, payload);

// Backward-compatible aliases
export const getPaymentsById = getPaymentById;
export const createPayments = createPayment;
export const updatePayments = updatePayment;
export const deletePayments = deletePayment;
