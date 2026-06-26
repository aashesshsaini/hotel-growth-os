import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { Enquiry, EnquiryFormData, EnquiryStats, GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getEnquiries = (params?: ListParams) => apiGet<PaginatedResponse<Enquiry>>('/enquiries', params);
export const getEnquiriesById = (id: string) => apiGet<Enquiry>(`/enquiries/${id}`);
export const getEnquiryStats = () => apiGet<EnquiryStats>('/enquiries/stats');
export const createEnquiries = (payload: EnquiryFormData | Record<string, unknown>) => apiPost<Enquiry>('/enquiries', payload);
export const updateEnquiries = (id: string, payload: Partial<EnquiryFormData> | Record<string, unknown>) => apiPatch<Enquiry>(`/enquiries/${id}`, payload);
export const deleteEnquiries = (id: string) => apiDelete<void>(`/enquiries/${id}`);
export const assignEnquiry = (id: string, assignedTo: string, notes?: string) => apiPatch<Enquiry>(`/enquiries/${id}/assign`, { assignedTo, notes });
export const updateEnquiryStatus = (id: string, payload: { status: string; notes?: string; lostReason?: string; followUpDate?: string }) => apiPatch<Enquiry>(`/enquiries/${id}/status`, payload);
export const addEnquiryNote = (id: string, note: string, internal?: boolean) => apiPatch<Enquiry>(`/enquiries/${id}/notes`, { note, internal });
export const convertEnquiryToLead = (id: string) => apiPost<{ enquiry: Enquiry; lead: unknown }>(`/enquiries/${id}/convert/lead`, {});
export const convertEnquiryToGuest = (id: string) => apiPost<{ enquiry: Enquiry; guest: unknown }>(`/enquiries/${id}/convert/guest`, {});
export const convertEnquiryToBooking = (id: string, payload: { guestId?: string; roomId?: string; roomTypeId?: string; checkInDate: string; checkOutDate: string; roomCount?: number; adults?: number; children?: number; roomRate?: number; totalAmount: number; paidAmount?: number; notes?: string; assignedTo?: string }) => apiPost<{ enquiry: Enquiry; booking: unknown }>(`/enquiries/${id}/convert/booking`, payload);

export type EnquiryEntity = GenericEntity;
