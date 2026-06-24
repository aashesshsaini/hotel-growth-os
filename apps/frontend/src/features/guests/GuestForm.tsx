'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
import type { GuestFormData } from '@/types';
import { FOOD_PREFERENCES, GUEST_SOURCES, GUEST_TYPES } from './constants';

interface GuestFormProps {
  form: GuestFormData;
  errors: Record<string, string>;
  onChange: (form: GuestFormData) => void;
  disabled?: boolean;
}

export const GuestForm = ({ form, errors, onChange, disabled }: GuestFormProps) => {
  const set = (patch: Partial<GuestFormData>) => onChange({ ...form, ...patch });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput label="Full Name" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} error={errors.fullName} required disabled={disabled} className="sm:col-span-2" />
      <FormInput label="Phone" value={form.phone} onChange={(e) => set({ phone: e.target.value })} error={errors.phone} required disabled={disabled} />
      <FormInput label="Alternate Phone" value={form.alternatePhone ?? ''} onChange={(e) => set({ alternatePhone: e.target.value })} disabled={disabled} />
      <FormInput label="Email" type="email" value={form.email ?? ''} onChange={(e) => set({ email: e.target.value })} error={errors.email} disabled={disabled} />
      <FormInput label="Gender" value={form.gender ?? ''} onChange={(e) => set({ gender: e.target.value })} disabled={disabled} />
      <FormInput label="Date of Birth" type="date" value={form.dateOfBirth ?? ''} onChange={(e) => set({ dateOfBirth: e.target.value })} disabled={disabled} />
      <FormInput label="Anniversary Date" type="date" value={form.anniversaryDate ?? ''} onChange={(e) => set({ anniversaryDate: e.target.value })} disabled={disabled} />
      <FormInput label="City" value={form.city ?? ''} onChange={(e) => set({ city: e.target.value })} disabled={disabled} />
      <FormInput label="State" value={form.state ?? ''} onChange={(e) => set({ state: e.target.value })} disabled={disabled} />
      <FormInput label="Country" value={form.country ?? 'India'} onChange={(e) => set({ country: e.target.value })} disabled={disabled} />
      <FormInput label="Address" value={form.address ?? ''} onChange={(e) => set({ address: e.target.value })} disabled={disabled} className="sm:col-span-2" />
      <SelectInput label="Guest Type" value={form.guestType ?? 'individual'} onChange={(e) => set({ guestType: e.target.value })} options={GUEST_TYPES} disabled={disabled} />
      <SelectInput label="Source" value={form.source ?? 'manual'} onChange={(e) => set({ source: e.target.value })} options={GUEST_SOURCES} disabled={disabled} />
      <SelectInput label="Food Preference" value={form.foodPreference ?? 'no_preference'} onChange={(e) => set({ foodPreference: e.target.value })} options={FOOD_PREFERENCES} disabled={disabled} />
      <FormInput label="Room Preference" value={form.roomPreference ?? ''} onChange={(e) => set({ roomPreference: e.target.value })} disabled={disabled} />
      <FormInput label="Special Requests" value={form.specialRequests ?? ''} onChange={(e) => set({ specialRequests: e.target.value })} disabled={disabled} className="sm:col-span-2" />
      <FormInput label="Tags" value={(form.tags ?? []).join(', ')} onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} placeholder="corporate, high-value" disabled={disabled} className="sm:col-span-2" />
      <FormInput label="Notes" value={form.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} disabled={disabled} className="sm:col-span-2" />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={form.marketingConsent ?? false} onChange={(e) => set({ marketingConsent: e.target.checked })} disabled={disabled} />
        Marketing consent
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={form.whatsappConsent ?? false} onChange={(e) => set({ whatsappConsent: e.target.checked })} disabled={disabled} />
        WhatsApp consent
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={form.emailConsent ?? false} onChange={(e) => set({ emailConsent: e.target.checked })} disabled={disabled} />
        Email consent
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={form.isVip ?? false} onChange={(e) => set({ isVip: e.target.checked })} disabled={disabled} />
        Mark as VIP
      </label>
    </div>
  );
};
