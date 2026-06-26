'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
import type { RoomFormData, RoomType, Staff } from '@/types';
import { getEntityId } from '@/types';
import { HOUSEKEEPING_STATUSES, MAINTENANCE_STATUSES, ROOM_STATUSES } from './constants';

interface RoomFormProps {
  form: RoomFormData;
  roomTypes: RoomType[];
  staff?: Staff[];
  errors: Record<string, string>;
  onChange: (field: keyof RoomFormData, value: string | number | boolean | string[]) => void;
}

export const RoomForm = ({ form, roomTypes, staff = [], errors, onChange }: RoomFormProps) => {
  const housekeepers = staff.filter((member) => member.role === 'housekeeping');
  const maintenanceStaff = staff.filter((member) => member.role === 'maintenance');

  return (
  <div className="space-y-4">
    {errors.form && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput label="Room Number" value={form.roomNumber} onChange={(e) => onChange('roomNumber', e.target.value)} error={errors.roomNumber} required />
      <SelectInput
        label="Room Type"
        value={form.roomTypeId}
        onChange={(e) => {
          const selected = roomTypes.find((rt) => getEntityId(rt) === e.target.value);
          onChange('roomTypeId', e.target.value);
          if (selected) {
            onChange('capacity', selected.maxGuests ?? form.capacity ?? 0);
            onChange('maxAdults', selected.maxAdults ?? form.maxAdults ?? 0);
            onChange('maxChildren', selected.maxChildren ?? form.maxChildren ?? 0);
            onChange('bedType', selected.bedType ?? form.bedType ?? '');
          }
        }}
        options={[{ value: '', label: 'Select room type' }, ...roomTypes.map((rt) => ({ value: getEntityId(rt), label: `${rt.name} · ${rt.maxGuests ?? 0} guests · ₹${rt.basePrice ?? 0}` }))]}
        error={errors.roomTypeId}
        required
      />
      <FormInput label="Floor Number" type="number" value={form.floorNumber !== undefined ? String(form.floorNumber) : ''} onChange={(e) => onChange('floorNumber', e.target.value ? Number(e.target.value) : 0)} />
      <FormInput label="Building Name" value={form.buildingName || ''} onChange={(e) => onChange('buildingName', e.target.value)} />
      <FormInput label="Wing" value={form.wing || ''} onChange={(e) => onChange('wing', e.target.value)} />
      <FormInput label="Room Name" value={form.roomName || ''} onChange={(e) => onChange('roomName', e.target.value)} />
      <FormInput label="Capacity" type="number" value={form.capacity !== undefined ? String(form.capacity) : ''} onChange={(e) => onChange('capacity', e.target.value ? Number(e.target.value) : 0)} />
      <FormInput label="Max Adults" type="number" value={form.maxAdults !== undefined ? String(form.maxAdults) : ''} onChange={(e) => onChange('maxAdults', e.target.value ? Number(e.target.value) : 0)} />
      <FormInput label="Max Children" type="number" value={form.maxChildren !== undefined ? String(form.maxChildren) : ''} onChange={(e) => onChange('maxChildren', e.target.value ? Number(e.target.value) : 0)} />
      <FormInput label="Bed Type" value={form.bedType || ''} onChange={(e) => onChange('bedType', e.target.value)} placeholder="King, Queen, Twin" />
      <FormInput label="View Type" value={form.viewType || ''} onChange={(e) => onChange('viewType', e.target.value)} placeholder="Garden, City, Pool" />
      <SelectInput label="Smoking Policy" value={form.smokingPolicy || 'non_smoking'} onChange={(e) => onChange('smokingPolicy', e.target.value)} options={[{ value: 'non_smoking', label: 'Non-Smoking' }, { value: 'smoking', label: 'Smoking' }]} />
      <SelectInput label="Status" value={form.status || 'available'} onChange={(e) => onChange('status', e.target.value)} options={ROOM_STATUSES} />
      <SelectInput label="Housekeeping" value={form.housekeepingStatus || 'clean'} onChange={(e) => onChange('housekeepingStatus', e.target.value)} options={HOUSEKEEPING_STATUSES} />
      <SelectInput label="Maintenance" value={form.maintenanceStatus || 'none'} onChange={(e) => onChange('maintenanceStatus', e.target.value)} options={MAINTENANCE_STATUSES} />
      <SelectInput label="Assigned Housekeeper" value={form.assignedHousekeeperId || ''} onChange={(e) => onChange('assignedHousekeeperId', e.target.value)} options={[{ value: '', label: 'Assign later' }, ...housekeepers.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
      <SelectInput label="Assigned Maintenance" value={form.assignedMaintenanceStaffId || ''} onChange={(e) => onChange('assignedMaintenanceStaffId', e.target.value)} options={[{ value: '', label: 'Assign later' }, ...maintenanceStaff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
      <FormInput label="Max Guests Override" type="number" value={form.maxGuestsOverride !== undefined ? String(form.maxGuestsOverride) : ''} onChange={(e) => onChange('maxGuestsOverride', e.target.value ? Number(e.target.value) : 0)} />
      <FormInput label="Price Override (₹)" type="number" value={form.priceOverride !== undefined ? String(form.priceOverride) : ''} onChange={(e) => onChange('priceOverride', e.target.value ? Number(e.target.value) : 0)} />
      <FormInput label="Housekeeping Schedule" type="datetime-local" value={form.housekeepingSchedule || ''} onChange={(e) => onChange('housekeepingSchedule', e.target.value)} />
      <FormInput label="Maintenance Schedule" type="datetime-local" value={form.maintenanceSchedule || ''} onChange={(e) => onChange('maintenanceSchedule', e.target.value)} />
      <FormInput label="Description" value={form.description || ''} onChange={(e) => onChange('description', e.target.value)} className="sm:col-span-2" />
      <FormInput label="Amenities Override" value={(form.amenitiesOverride ?? []).join(', ')} onChange={(e) => onChange('amenitiesOverride', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="wifi, balcony, minibar" className="sm:col-span-2" />
      <FormInput label="Cleaning Notes" value={form.cleaningNotes || ''} onChange={(e) => onChange('cleaningNotes', e.target.value)} className="sm:col-span-2" />
      <FormInput label="Maintenance Notes" value={form.maintenanceNotes || ''} onChange={(e) => onChange('maintenanceNotes', e.target.value)} className="sm:col-span-2" />
      <FormInput label="Internal Notes" value={form.internalNotes || ''} onChange={(e) => onChange('internalNotes', e.target.value)} className="sm:col-span-2" />
      <FormInput label="Notes" value={form.notes || ''} onChange={(e) => onChange('notes', e.target.value)} className="sm:col-span-2" />
    </div>
    <div className="flex flex-wrap gap-6">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPriceOverridden ?? false} onChange={(e) => onChange('isPriceOverridden', e.target.checked)} className="rounded" /> Price overridden</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isBookable ?? true} onChange={(e) => onChange('isBookable', e.target.checked)} className="rounded" /> Bookable</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isVisibleToStaff ?? true} onChange={(e) => onChange('isVisibleToStaff', e.target.checked)} className="rounded" /> Visible to staff</label>
    </div>
  </div>
  );
};
