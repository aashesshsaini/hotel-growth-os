import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type { Lead, LeadFormData, LeadStats, ListParams, PaginatedResponse } from '@/types';

export const getLeads = async (params?: ListParams): Promise<PaginatedResponse<Lead>> => {
  return apiGet<PaginatedResponse<Lead>>('/leads', params);
};

export const getLeadStats = async (): Promise<LeadStats> => {
  return apiGet<LeadStats>('/leads/stats');
};

export const getLeadById = async (id: string): Promise<Lead> => {
  return apiGet<Lead>(`/leads/${id}`);
};

export const createLead = async (payload: LeadFormData): Promise<Lead> => {
  return apiPost<Lead>('/leads', payload);
};

export const updateLead = async (id: string, payload: Partial<LeadFormData>): Promise<Lead> => {
  return apiPatch<Lead>(`/leads/${id}`, payload);
};

export const assignLead = async (id: string, assignedTo: string, notes?: string): Promise<Lead> => {
  return apiPatch<Lead>(`/leads/${id}/assign`, { assignedTo, notes });
};

export const updateLeadStatus = async (
  id: string,
  payload: { status: string; notes?: string; lostReason?: string; followUpDate?: string }
): Promise<Lead> => {
  return apiPatch<Lead>(`/leads/${id}/status`, payload);
};

export const addLeadNote = async (id: string, note: string): Promise<Lead> => {
  return apiPatch<Lead>(`/leads/${id}/notes`, { note });
};

export const convertLeadToGuest = async (id: string): Promise<{ lead: Lead; guest: unknown }> => {
  return apiPost<{ lead: Lead; guest: unknown }>(`/leads/${id}/convert/guest`, {});
};

export const convertLeadToBooking = async (
  id: string,
  payload: {
    guestId?: string;
    roomId?: string;
    roomTypeId?: string;
    checkInDate: string;
    checkOutDate: string;
    roomCount?: number;
    adults?: number;
    children?: number;
    roomRate?: number;
    totalAmount: number;
    paidAmount?: number;
    notes?: string;
    assignedTo?: string;
  }
): Promise<{ lead: Lead; booking: unknown }> => {
  return apiPost<{ lead: Lead; booking: unknown }>(`/leads/${id}/convert/booking`, payload);
};

export const deleteLead = async (id: string): Promise<void> => {
  return apiDelete<void>(`/leads/${id}`);
};
