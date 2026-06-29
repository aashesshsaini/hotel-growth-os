'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
import { FilterPanel } from '@/components/layout';
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
  capacityFilter: string;
  bookableFilter: string;
  blockedFilter: string;
  onStatusChange: (v: string) => void;
  onHkChange: (v: string) => void;
  onMaintChange: (v: string) => void;
  onRoomTypeChange: (v: string) => void;
  onFloorChange: (v: string) => void;
  onCapacityChange: (v: string) => void;
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
  capacityFilter,
  bookableFilter,
  blockedFilter,
  onStatusChange,
  onHkChange,
  onMaintChange,
  onRoomTypeChange,
  onFloorChange,
  onCapacityChange,
  onBookableChange,
  onBlockedChange,
  onReset,
}: RoomFiltersProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <FilterPanel
      title="More Filters"
      activeCount={[roomTypeFilter, statusFilter, hkFilter, maintFilter, floorFilter, capacityFilter, bookableFilter, blockedFilter].filter(Boolean).length}
      onReset={onReset}
      basicFilters={
        <>
          <div className="filter-field">
            <SelectInput label="Room Type" value={roomTypeFilter} onChange={(e) => onRoomTypeChange(e.target.value)} options={[{ value: '', label: 'All types' }, ...roomTypes.map((rt) => ({ value: getEntityId(rt), label: rt.name }))]} />
          </div>
          <div className="filter-field">
            <SelectInput label="Status" value={statusFilter} onChange={(e) => onStatusChange(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...ROOM_STATUSES]} />
          </div>
        </>
      }
    >
      <SelectInput label="Housekeeping" value={hkFilter} onChange={(e) => onHkChange(e.target.value)} options={[{ value: '', label: 'All HK' }, ...HOUSEKEEPING_STATUSES]} />
      <SelectInput label="Maintenance" value={maintFilter} onChange={(e) => onMaintChange(e.target.value)} options={[{ value: '', label: 'All maint.' }, ...MAINTENANCE_STATUSES]} />
      <SelectInput label="Floor" value={floorFilter} onChange={(e) => onFloorChange(e.target.value)} options={[{ value: '', label: 'All floors' }, ...[1, 2, 3, 4, 5, 6].map((f) => ({ value: String(f), label: `Floor ${f}` }))]} />
      <FormInput label="Min Capacity" type="number" value={capacityFilter} onChange={(e) => onCapacityChange(e.target.value)} placeholder="2" />
      <SelectInput label="Bookable" value={bookableFilter} onChange={(e) => onBookableChange(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'true', label: 'Bookable' }, { value: 'false', label: 'Not bookable' }]} />
      <SelectInput label="Blocked" value={blockedFilter} onChange={(e) => onBlockedChange(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'true', label: 'Blocked' }, { value: 'false', label: 'Not blocked' }]} />
    </FilterPanel>
  </div>
);
