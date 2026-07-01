import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import type { GenericEntity, ListParams, PaginatedResponse } from '@/types';
export const getHotels = (params?: ListParams) => apiGet<PaginatedResponse<GenericEntity>>('/hotels', params);
export const getHotelsById = (id: string) => apiGet<GenericEntity>(`/hotels/${id}`);
export const createHotels = (payload: Record<string, unknown>) => apiPost<GenericEntity>('/hotels', payload);
export const updateHotels = (id: string, payload: Record<string, unknown>) => apiPatch<GenericEntity>(`/hotels/${id}`, payload);
export const deleteHotels = (id: string) => apiDelete<void>(`/hotels/${id}`);

export interface HotelSettingsPayload {
  general: {
    name: string;
    displayName?: string;
    businessType?: string;
    description?: string;
    establishedYear?: number | '';
    website?: string;
    businessRegistrationNumber?: string;
  };
  branding: {
    logo?: string;
    coverImage?: string;
    primaryColor?: string;
    secondaryColor?: string;
    tagline?: string;
    description?: string;
    signature?: string;
  };
  contact: {
    primaryPhone?: string;
    secondaryPhone?: string;
    primaryEmail?: string;
    supportEmail?: string;
    reservationEmail?: string;
    address?: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
    googleMapUrl?: string;
  };
  preferences: {
    timezone: string;
    currency: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
    language: string;
    weekStartDay: 'sunday' | 'monday';
    businessHours: { openTime?: string; closeTime?: string; days: string[] };
  };
  review: {
    googleReviewUrl?: string;
    automationEnabled: boolean;
    internalFeedbackEnabled: boolean;
    reminderEnabled: boolean;
    maxReminderCount: number;
    delayMinutes: number;
    signature?: string;
  };
  communication: {
    whatsappBusinessNumber?: string;
    senderName?: string;
    businessEmail?: string;
    replyToEmail?: string;
    emailSignature?: string;
    defaultSenderName?: string;
    enabled: boolean;
  };
  notifications: {
    bookings: boolean;
    reviews: boolean;
    payments: boolean;
    maintenance: boolean;
    staff: boolean;
    marketing: boolean;
  };
  security?: {
    twoFactorEnabled?: boolean;
    sessionManagementEnabled?: boolean;
  };
  futureIntegrations?: Record<string, string>;
}

export const getHotelSettings = () => apiGet<HotelSettingsPayload>('/hotels/settings');
export const updateHotelSettings = (payload: HotelSettingsPayload) => apiPut<HotelSettingsPayload>('/hotels/settings', payload);
export const changeHotelPassword = (payload: { currentPassword: string; newPassword: string }) => apiPost<{ changed: boolean }>('/hotels/settings/security/password', payload);
