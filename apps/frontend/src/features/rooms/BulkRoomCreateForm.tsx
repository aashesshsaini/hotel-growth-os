'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
import type { BulkRoomFormData, RoomType } from '@/types';
import { getEntityId } from '@/types';

interface BulkRoomCreateModalProps {
  form: BulkRoomFormData;
  roomTypes: RoomType[];
  errors: Record<string, string>;
  onChange: (field: keyof BulkRoomFormData, value: string | number) => void;
}

export const BulkRoomCreateForm = ({ form, roomTypes, errors, onChange }: BulkRoomCreateModalProps) => (
  <div className="space-y-4">
    {errors.form && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
    <SelectInput label="Room Type" value={form.roomTypeId} onChange={(e) => onChange('roomTypeId', e.target.value)} options={[{ value: '', label: 'Select room type' }, ...roomTypes.map((rt) => ({ value: getEntityId(rt), label: rt.name }))]} error={errors.roomTypeId} required />
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput label="Prefix (optional)" value={form.prefix || ''} onChange={(e) => onChange('prefix', e.target.value)} placeholder="e.g. A" />
      <FormInput label="Floor Number" type="number" value={form.floorNumber !== undefined ? String(form.floorNumber) : ''} onChange={(e) => onChange('floorNumber', e.target.value ? Number(e.target.value) : 0)} />
      <FormInput label="Start Room Number" type="number" value={String(form.startRoomNumber)} onChange={(e) => onChange('startRoomNumber', Number(e.target.value))} required />
      <FormInput label="End Room Number" type="number" value={String(form.endRoomNumber)} onChange={(e) => onChange('endRoomNumber', Number(e.target.value))} required />
      <FormInput label="Building Name" value={form.buildingName || ''} onChange={(e) => onChange('buildingName', e.target.value)} />
      <FormInput label="Wing" value={form.wing || ''} onChange={(e) => onChange('wing', e.target.value)} />
    </div>
    <p className="text-sm text-slate-500">
      Will create rooms from {form.prefix}{form.startRoomNumber} to {form.prefix}{form.endRoomNumber}.
      Existing numbers will be skipped.
    </p>
  </div>
);
