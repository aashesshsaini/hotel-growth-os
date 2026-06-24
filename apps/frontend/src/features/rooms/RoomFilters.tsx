'use client';

import { SelectInput } from '@/components/FormInput';
import type { RoomType } from '@/types';
import { getEntityId } from '@/types';
import {
  HOUSEKEEPING_STATUSES,
  MAINTENANCE_STATUSES,
  ROOM_STATUSES,
} from './constants';

interface RoomFiltersProps {
  roomTypes: RoomType[];
  statusFilter: string;
  hkFilter: string;
  maintFilter: string;
  roomTypeFilter: string;
  floorFilter: string;
  bookableFilter: string;
  blockedFilter: string;
  onStatusChange: (v: string) => void;
  onHkChange: (v: string) => void;
  onMaintChange: (v: string) => void;
  onRoomTypeChange: (v: string) => void;
  onFloorChange: (v: string) => void;
  onBookableChange: (v: string) => void;
  onBlockedChange: (v: string) => void;
  onReset: () => void;
}

export const RoomFilters = ({
  roomTypes,
  statusFilter,
  hkFilter,
  maintFilter,
  roomTypeFilter,
  floorFilter,
  bookableFilter,
  blockedFilter,
  onStatusChange,
  onHkChange,
  onMaintChange,
  onRoomTypeChange,
  onFloorChange,
  onBookableChange,
  onBlockedChange,
  onReset,
}: RoomFiltersProps) => (
  <div className="card mb-6 space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
      <button type="button" className="text-sm text-primary-600 hover:text-primary-700" onClick={onReset}>
        Reset filters
      </button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <SelectInput label="Room Type" value={roomTypeFilter} onChange={(e) => onRoomTypeChange(e.target.value)} options={[{ value: '', label: 'All types' }, ...roomTypes.map((rt) => ({ value: getEntityId(rt), label: rt.name }))]} />
      <SelectInput label="Status" value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...ROOM_STATUSES]} />
      <SelectInput label="Housekeeping" value={hkFilter} onChange={(e) => onHkChange(e.target.value)} options={[{ value: '', label: 'All HK' }, ...HOUSEKEEPING_STATUSES]} />
      <SelectInput label="Maintenance" value={maintFilter} onChange={(e) => onMaintChange(e.target.value)} options={[{ value: '', label: 'All maint.' }, ...MAINTENANCE_STATUSES]} />
      <SelectInput label="Floor" value={floorFilter} onChange={(e) => onFloorChange(e.target.value)} options={[{ value: '', label: 'All floors' }, ...[1, 2, 3, 4, 5, 6].map((f) => ({ value: String(f), label: `Floor ${f}` }))]} />
      <SelectInput label="Bookable" value={bookableFilter} onChange={(e) => onBookableChange(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'true', label: 'Bookable' }, { value: 'false', label: 'Not bookable' }]} />
      <SelectInput label="Blocked" value={blockedFilter} onChange={(e) => onBlockedChange(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'true', label: 'Blocked' }, { value: 'false', label: 'Not blocked' }]} />
    </div>
  </div>
);
