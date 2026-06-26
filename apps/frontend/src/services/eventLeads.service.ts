import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  EventLead,
  EventLeadDetails,
  EventLeadFormData,
  EventLeadStats,
  EventPipelineColumn,
  ListParams,
  PaginatedResponse,
} from '@/types';

export const getEventLeads = (params?: ListParams) =>
  apiGet<PaginatedResponse<EventLead>>('/event-leads', params);

export const getEventLeadStats = () => apiGet<EventLeadStats>('/event-leads/stats');

export const getEventPipeline = () => apiGet<EventPipelineColumn[]>('/event-leads/pipeline');

export const getEventLeadById = (id: string) => apiGet<EventLeadDetails>(`/event-leads/${id}`);

export const createEventLead = (payload: EventLeadFormData) =>
  apiPost<EventLead>('/event-leads', payload);

export const updateEventLead = (id: string, payload: Partial<EventLeadFormData>) =>
  apiPatch<EventLead>(`/event-leads/${id}`, payload);

export const deleteEventLead = (id: string) => apiDelete<void>(`/event-leads/${id}`);

export const assignEventLead = (id: string, assignedTo: string, notes?: string) =>
  apiPatch<EventLead>(`/event-leads/${id}/assign`, { assignedTo, notes });

export const updateEventLeadStatus = (
  id: string,
  payload: { status: string; notes?: string; lostReason?: string; followUpDate?: string }
) => apiPatch<EventLead>(`/event-leads/${id}/status`, payload);

export const addEventLeadNote = (id: string, note: string) =>
  apiPatch<EventLead>(`/event-leads/${id}/notes`, { note });

export const addEventProposal = (
  id: string,
  payload: { title: string; amount: number; status?: string; notes?: string }
) => apiPost<EventLead>(`/event-leads/${id}/proposals`, payload);

export const addEventPackage = (
  id: string,
  payload: { name: string; price: number; description?: string; inclusions?: string; status?: string }
) => apiPost<EventLead>(`/event-leads/${id}/packages`, payload);

export const addEventSiteVisit = (
  id: string,
  payload: { title: string; scheduledAt: string; location?: string; notes?: string }
) => apiPost<EventLead>(`/event-leads/${id}/site-visits`, payload);

export const recordEventPayment = (
  id: string,
  payload: { amount: number; paymentType?: string; notes?: string }
) => apiPost<EventLead>(`/event-leads/${id}/payments`, payload);

export const convertEventLeadToBooking = (
  id: string,
  payload: {
    guestId?: string; roomId?: string; roomTypeId?: string;
    checkInDate: string; checkOutDate: string; roomCount?: number;
    adults: number; children?: number; roomRate?: number;
    totalAmount: number; paidAmount?: number; notes?: string; assignedTo?: string;
  }
) => apiPost<{ event: EventLead; booking: unknown }>(`/event-leads/${id}/convert/booking`, payload);

// Backward-compatible aliases
export const getEventLeadsById = getEventLeadById;
export const createEventLeads = createEventLead;
export const updateEventLeads = updateEventLead;
export const deleteEventLeads = deleteEventLead;
