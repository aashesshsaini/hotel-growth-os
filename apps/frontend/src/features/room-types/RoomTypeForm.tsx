'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
import {
  BED_TYPES,
  COMMON_AMENITIES,
  INVENTORY_TYPES,
  MEAL_PLANS,
  ROOM_SIZE_UNITS,
  ROOM_TYPE_STATUSES,
} from './constants';
import { RoomTypePricingPreview } from './RoomTypePricingPreview';
import type { RoomTypeFormData } from '@/types';

interface RoomTypeFormProps {
  form: RoomTypeFormData;
  errors: Record<string, string>;
  isEdit?: boolean;
  onChange: (field: keyof RoomTypeFormData, value: string | number | boolean | string[]) => void;
}

export const RoomTypeForm = ({ form, errors, onChange }: RoomTypeFormProps) => {
  const toggleAmenity = (amenity: string) => {
    const current = form.amenities ?? [];
    const next = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    onChange('amenities', next);
  };

  return (
    <div className="space-y-6">
      {errors.form && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>
      )}

      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-900">Basic Information</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Name" value={form.name} onChange={(e) => onChange('name', e.target.value)} error={errors.name} required />
          <FormInput label="Code" value={form.code || ''} onChange={(e) => onChange('code', e.target.value)} placeholder="Auto-generated if empty" />
          <FormInput label="Short Description" value={form.shortDescription || ''} onChange={(e) => onChange('shortDescription', e.target.value)} className="sm:col-span-2" />
          <FormInput label="Description" value={form.description || ''} onChange={(e) => onChange('description', e.target.value)} className="sm:col-span-2" />
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-900">Pricing</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput label="Base Price (₹)" type="number" value={String(form.basePrice || '')} onChange={(e) => onChange('basePrice', Number(e.target.value))} error={errors.basePrice} required />
          <FormInput label="Weekday Price (₹)" type="number" value={form.weekdayPrice !== undefined ? String(form.weekdayPrice) : ''} onChange={(e) => onChange('weekdayPrice', e.target.value ? Number(e.target.value) : 0)} />
          <FormInput label="Weekend Price (₹)" type="number" value={form.weekendPrice !== undefined ? String(form.weekendPrice) : ''} onChange={(e) => onChange('weekendPrice', e.target.value ? Number(e.target.value) : 0)} />
          <FormInput label="Extra Adult (₹)" type="number" value={String(form.extraAdultPrice || 0)} onChange={(e) => onChange('extraAdultPrice', Number(e.target.value))} />
          <FormInput label="Extra Child (₹)" type="number" value={String(form.extraChildPrice || 0)} onChange={(e) => onChange('extraChildPrice', Number(e.target.value))} />
          <FormInput label="Tax %" type="number" value={String(form.taxPercentage || 0)} onChange={(e) => onChange('taxPercentage', Number(e.target.value))} />
          <FormInput label="Discount %" type="number" value={String(form.discountPercentage || 0)} onChange={(e) => onChange('discountPercentage', Number(e.target.value))} />
        </div>
        <RoomTypePricingPreview form={form} />
      </section>

      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-900">Capacity & Layout</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput label="Max Guests" type="number" value={String(form.maxGuests || '')} onChange={(e) => onChange('maxGuests', Number(e.target.value))} error={errors.maxGuests} required />
          <FormInput label="Max Adults" type="number" value={String(form.maxAdults || '')} onChange={(e) => onChange('maxAdults', Number(e.target.value))} />
          <FormInput label="Max Children" type="number" value={String(form.maxChildren || 0)} onChange={(e) => onChange('maxChildren', Number(e.target.value))} />
          <SelectInput label="Bed Type" value={form.bedType || ''} onChange={(e) => onChange('bedType', e.target.value)}>
            {BED_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </SelectInput>
          <FormInput label="Room Size" type="number" value={form.roomSize !== undefined ? String(form.roomSize) : ''} onChange={(e) => onChange('roomSize', e.target.value ? Number(e.target.value) : 0)} />
          <SelectInput label="Size Unit" value={form.roomSizeUnit || 'sqft'} onChange={(e) => onChange('roomSizeUnit', e.target.value)}>
            {ROOM_SIZE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </SelectInput>
          <FormInput label="Total Rooms" type="number" value={String(form.totalRooms || 0)} onChange={(e) => onChange('totalRooms', Number(e.target.value))} />
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-900">Amenities</h4>
        <div className="flex flex-wrap gap-2">
          {COMMON_AMENITIES.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                (form.amenities ?? []).includes(amenity)
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {amenity}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-900">Settings</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SelectInput label="Meal Plan" value={form.mealPlan || 'room_only'} onChange={(e) => onChange('mealPlan', e.target.value)}>
            {MEAL_PLANS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </SelectInput>
          <SelectInput label="Inventory Type" value={form.inventoryType || 'standard'} onChange={(e) => onChange('inventoryType', e.target.value)}>
            {INVENTORY_TYPES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </SelectInput>
          <SelectInput label="Status" value={form.status || 'active'} onChange={(e) => onChange('status', e.target.value)}>
            {ROOM_TYPE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </SelectInput>
          <FormInput label="Sort Order" type="number" value={String(form.sortOrder || 0)} onChange={(e) => onChange('sortOrder', Number(e.target.value))} />
          <FormInput label="Tags (comma separated)" value={(form.tags ?? []).join(', ')} onChange={(e) => onChange('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} className="sm:col-span-2" />
          <FormInput label="Cancellation Policy" value={form.cancellationPolicy || ''} onChange={(e) => onChange('cancellationPolicy', e.target.value)} className="sm:col-span-2" />
          <FormInput label="Check-in Instructions" value={form.checkInInstructions || ''} onChange={(e) => onChange('checkInInstructions', e.target.value)} className="sm:col-span-2" />
          <FormInput label="Internal Notes" value={form.internalNotes || ''} onChange={(e) => onChange('internalNotes', e.target.value)} className="sm:col-span-2" />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isVisibleOnWebsite ?? true} onChange={(e) => onChange('isVisibleOnWebsite', e.target.checked)} className="rounded border-slate-300" />
            Visible on website
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isAvailableForBooking ?? true} onChange={(e) => onChange('isAvailableForBooking', e.target.checked)} className="rounded border-slate-300" />
            Available for booking
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isPopular ?? false} onChange={(e) => onChange('isPopular', e.target.checked)} className="rounded border-slate-300" />
            Mark as popular
          </label>
        </div>
      </section>
    </div>
  );
};
