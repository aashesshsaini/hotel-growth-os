'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
import { GUEST_SOURCES, GUEST_TYPES, MONTHS } from './constants';

interface GuestFiltersProps {
  guestTypeFilter: string;
  sourceFilter: string;
  cityFilter: string;
  repeatFilter: string;
  vipFilter: string;
  blacklistedFilter: string;
  birthdayMonthFilter: string;
  anniversaryMonthFilter: string;
  minSpendFilter: string;
  maxSpendFilter: string;
  lastBookingFrom: string;
  lastBookingTo: string;
  tagsFilter: string;
  whatsappConsentFilter: string;
  campaignEligibleFilter: string;
  onGuestTypeChange: (v: string) => void;
  onSourceChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onRepeatChange: (v: string) => void;
  onVipChange: (v: string) => void;
  onBlacklistedChange: (v: string) => void;
  onBirthdayMonthChange: (v: string) => void;
  onAnniversaryMonthChange: (v: string) => void;
  onMinSpendChange: (v: string) => void;
  onMaxSpendChange: (v: string) => void;
  onLastBookingFromChange: (v: string) => void;
  onLastBookingToChange: (v: string) => void;
  onTagsChange: (v: string) => void;
  onWhatsappConsentChange: (v: string) => void;
  onCampaignEligibleChange: (v: string) => void;
  onReset: () => void;
}

const boolOptions = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export const GuestFilters = ({
  guestTypeFilter,
  sourceFilter,
  cityFilter,
  repeatFilter,
  vipFilter,
  blacklistedFilter,
  birthdayMonthFilter,
  anniversaryMonthFilter,
  minSpendFilter,
  maxSpendFilter,
  lastBookingFrom,
  lastBookingTo,
  tagsFilter,
  whatsappConsentFilter,
  campaignEligibleFilter,
  onGuestTypeChange,
  onSourceChange,
  onCityChange,
  onRepeatChange,
  onVipChange,
  onBlacklistedChange,
  onBirthdayMonthChange,
  onAnniversaryMonthChange,
  onMinSpendChange,
  onMaxSpendChange,
  onLastBookingFromChange,
  onLastBookingToChange,
  onTagsChange,
  onWhatsappConsentChange,
  onCampaignEligibleChange,
  onReset,
}: GuestFiltersProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-base font-semibold text-slate-950">Guest Filters</h3>
        <p className="text-sm text-slate-500">Segment the CRM by profile, activity, source, spend, dates, and consent.</p>
      </div>
      <button type="button" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700" onClick={onReset}>
        Reset filters
      </button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <SelectInput label="Guest Type" value={guestTypeFilter} onChange={(e) => onGuestTypeChange(e.target.value)} options={[{ value: '', label: 'All types' }, ...GUEST_TYPES]} />
      <SelectInput label="Source" value={sourceFilter} onChange={(e) => onSourceChange(e.target.value)} options={[{ value: '', label: 'All sources' }, ...GUEST_SOURCES]} />
      <FormInput label="City" value={cityFilter} onChange={(e) => onCityChange(e.target.value)} placeholder="Filter by city" />
      <SelectInput label="Repeat Guest" value={repeatFilter} onChange={(e) => onRepeatChange(e.target.value)} options={boolOptions} />
      <SelectInput label="VIP" value={vipFilter} onChange={(e) => onVipChange(e.target.value)} options={boolOptions} />
      <SelectInput label="Blacklisted" value={blacklistedFilter} onChange={(e) => onBlacklistedChange(e.target.value)} options={boolOptions} />
      <SelectInput label="Birthday Month" value={birthdayMonthFilter} onChange={(e) => onBirthdayMonthChange(e.target.value)} options={MONTHS} />
      <SelectInput label="Anniversary Month" value={anniversaryMonthFilter} onChange={(e) => onAnniversaryMonthChange(e.target.value)} options={MONTHS} />
      <FormInput label="Min Spend (₹)" type="number" value={minSpendFilter} onChange={(e) => onMinSpendChange(e.target.value)} />
      <FormInput label="Max Spend (₹)" type="number" value={maxSpendFilter} onChange={(e) => onMaxSpendChange(e.target.value)} />
      <FormInput label="Last Booking From" type="date" value={lastBookingFrom} onChange={(e) => onLastBookingFromChange(e.target.value)} />
      <FormInput label="Last Booking To" type="date" value={lastBookingTo} onChange={(e) => onLastBookingToChange(e.target.value)} />
      <FormInput label="Tags" value={tagsFilter} onChange={(e) => onTagsChange(e.target.value)} placeholder="comma-separated" />
      <SelectInput label="WhatsApp Consent" value={whatsappConsentFilter} onChange={(e) => onWhatsappConsentChange(e.target.value)} options={boolOptions} />
      <SelectInput label="Campaign Eligible" value={campaignEligibleFilter} onChange={(e) => onCampaignEligibleChange(e.target.value)} options={boolOptions} />
    </div>
  </div>
);
