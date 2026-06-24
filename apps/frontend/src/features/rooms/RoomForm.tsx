'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
import type { RoomFormData, RoomType } from '@/types';
import { getEntityId } from '@/types';
import { HOUSEKEEPING_STATUSES, MAINTENANCE_STATUSES, ROOM_STATUSES } from './constants';

interface RoomFormProps {
  form: RoomFormData;
  roomTypes: RoomType[];
  errors: Record<string, string>;
  onChange: (field: keyof RoomFormData, value: string | number | boolean | string[]) => void;
}

export const RoomForm = ({ form, roomTypes, errors, onChange }: RoomFormProps) => (
  <div className="space-y-4">
    {errors.form && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput label="Room Number" value={form.roomNumber} onChange={(e) => onChange('roomNumber', e.target.value)} error={errors.roomNumber} required />
      <SelectInput label="Room Type" value={form.roomTypeId} onChange={(e) => onChange('roomTypeId', e.target.value)} options={[{ value: '', label: 'Select room type' }, ...roomTypes.map((rt) => ({ value: getEntityId(rt), label: rt.name }))]} error={errors.roomTypeId} required />
      <FormInput label="Floor Number" type="number" value={form.floorNumber !== undefined ? String(form.floorNumber) : ''} onChange={(e) => onChange('floorNumber', e.target.value ? Number(e.target.value) : 0)} />
      <FormInput label="Building Name" value={form.buildingName || ''} onChange={(e) => onChange('buildingName', e.target.value)} />
      <FormInput label="Wing" value={form.wing || ''} onChange={(e) => onChange('wing', e.target.value)} />
      <FormInput label="Room Name" value={form.roomName || ''} onChange={(e) => onChange('roomName', e.target.value)} />
      <SelectInput label="Status" value={form.status || 'available'} onChange={(e) => onChange('status', e.target.value)} options={ROOM_STATUSES} />
      <SelectInput label="Housekeeping" value={form.housekeepingStatus || 'clean'} onChange={(e) => onChange('housekeepingStatus', e.target.value)} options={HOUSEKEEPING_STATUSES} />
      <SelectInput label="Maintenance" value={form.maintenanceStatus || 'none'} onChange={(e) => onChange('maintenanceStatus', e.target.value)} options={MAINTENANCE_STATUSES} />
      <FormInput label="Max Guests Override" type="number" value={form.maxGuestsOverride !== undefined ? String(form.maxGuestsOverride) : ''} onChange={(e) => onChange('maxGuestsOverride', e.target.value ? Number(e.target.value) : 0)} />
      <FormInput label="Price Override (₹)" type="number" value={form.priceOverride !== undefined ? String(form.priceOverride) : ''} onChange={(e) => onChange('priceOverride', e.target.value ? Number(e.target.value) : 0)} />
      <FormInput label="Description" value={form.description || ''} onChange={(e) => onChange('description', e.target.value)} className="sm:col-span-2" />
      <FormInput label="Notes" value={form.notes || ''} onChange={(e) => onChange('notes', e.target.value)} className="sm:col-span-2" />
    </div>
    <div className="flex flex-wrap gap-6">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPriceOverridden ?? false} onChange={(e) => onChange('isPriceOverridden', e.target.checked)} className="rounded" /> Price overridden</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isBookable ?? true} onChange={(e) => onChange('isBookable', e.target.checked)} className="rounded" /> Bookable</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isVisibleToStaff ?? true} onChange={(e) => onChange('isVisibleToStaff', e.target.checked)} className="rounded" /> Visible to staff</label>
    </div>
  </div>
);
