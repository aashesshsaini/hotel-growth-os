'use client';

import type { Room } from '@/types';
import { getRoomTypeName } from '@/features/rooms/utils';
import { RoomStatusBadge } from './RoomStatusBadge';
import { HousekeepingStatusBadge } from './HousekeepingStatusBadge';
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge';

interface RoomCardProps {
  room: Room;
  onView: () => void;
  onEdit: () => void;
}

export const RoomCard = ({ room, onView, onEdit }: RoomCardProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{room.roomNumber}</h3>
        <p className="text-sm text-slate-500">{getRoomTypeName(room)}</p>
      </div>
      <RoomStatusBadge status={room.status} />
    </div>
    <div className="mb-3 space-y-1 text-sm text-slate-600">
      <p>Floor: {room.floorNumber ?? room.floor ?? '—'}</p>
      {room.buildingName && <p>Building: {room.buildingName}</p>}
      <p>Capacity: {room.capacity ?? room.maxGuestsOverride ?? '—'} guests</p>
      {(room.bedType || room.viewType) && <p>{[room.bedType, room.viewType].filter(Boolean).join(' · ')}</p>}
      <div className="flex flex-wrap gap-1 pt-1">
        <HousekeepingStatusBadge status={room.housekeepingStatus} />
        <MaintenanceStatusBadge status={room.maintenanceStatus} />
      </div>
    </div>
    <div className="flex gap-2">
      <button type="button" className="btn-secondary flex-1 text-sm" onClick={onView}>View</button>
      <button type="button" className="btn-primary flex-1 text-sm" onClick={onEdit}>Edit</button>
    </div>
  </div>
);
