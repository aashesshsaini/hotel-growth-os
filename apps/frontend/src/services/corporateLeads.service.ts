import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import type {
  CorporateLead,
  CorporateLeadDetails,
  CorporateLeadFormData,
  CorporateLeadStats,
  CorporatePipelineColumn,
  ListParams,
  PaginatedResponse,
} from '@/types';

export const getCorporateLeads = (params?: ListParams) =>
  apiGet<PaginatedResponse<CorporateLead>>('/corporate-leads', params);

export const getCorporateLeadStats = () => apiGet<CorporateLeadStats>('/corporate-leads/stats');

export const getCorporatePipeline = () => apiGet<CorporatePipelineColumn[]>('/corporate-leads/pipeline');

export const getCorporateLeadById = (id: string) => apiGet<CorporateLeadDetails>(`/corporate-leads/${id}`);

export const createCorporateLead = (payload: CorporateLeadFormData) =>
  apiPost<CorporateLead>('/corporate-leads', payload);

export const updateCorporateLead = (id: string, payload: Partial<CorporateLeadFormData>) =>
  apiPatch<CorporateLead>(`/corporate-leads/${id}`, payload);

export const deleteCorporateLead = (id: string) => apiDelete<void>(`/corporate-leads/${id}`);

export const assignCorporateLead = (id: string, assignedTo: string, notes?: string) =>
  apiPatch<CorporateLead>(`/corporate-leads/${id}/assign`, { assignedTo, notes });

export const updateCorporateLeadStatus = (
  id: string,
  payload: { status: string; notes?: string; lostReason?: string; followUpDate?: string }
) => apiPatch<CorporateLead>(`/corporate-leads/${id}/status`, payload);

export const addCorporateLeadNote = (id: string, note: string) =>
  apiPatch<CorporateLead>(`/corporate-leads/${id}/notes`, { note });

export const addCorporateMeeting = (
  id: string,
  payload: { title: string; scheduledAt: string; location?: string; attendees?: string; notes?: string }
) => apiPost<CorporateLead>(`/corporate-leads/${id}/meetings`, payload);

export const addCorporateProposal = (
  id: string,
  payload: { title: string; amount: number; status?: string; sentAt?: string; validUntil?: string; notes?: string }
) => apiPost<CorporateLead>(`/corporate-leads/${id}/proposals`, payload);

export const addCorporateDocument = (
  id: string,
  payload: { name: string; url: string; documentType?: string }
) => apiPost<CorporateLead>(`/corporate-leads/${id}/documents`, payload);

export const recordCorporatePayment = (id: string, payload: { amount: number; notes?: string }) =>
  apiPost<CorporateLead>(`/corporate-leads/${id}/payments`, payload);

// Backward-compatible aliases used by generic CRUD
export const getCorporateLeadsById = getCorporateLeadById;
export const createCorporateLeads = createCorporateLead;
export const updateCorporateLeads = updateCorporateLead;
export const deleteCorporateLeads = deleteCorporateLead;
