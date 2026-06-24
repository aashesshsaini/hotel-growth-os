'use client';

import type { Room } from '@/types';
import { getRoomTypeName } from '@/features/rooms/utils';
import { RoomStatusBadge } from './RoomStatusBadge';
import { HousekeepingStatusBadge } from './HousekeepingStatusBadge';

interface RoomCardProps {
  room: Room;
  onView: () => void;
  onEdit: () => void;
}

export const RoomCard = ({ room, onView, onEdit }: RoomCardProps) => (
  <div className="card p-4 transition hover:shadow-md">
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
      <HousekeepingStatusBadge status={room.housekeepingStatus} />
    </div>
    <div className="flex gap-2">
      <button type="button" className="btn-secondary flex-1 text-sm" onClick={onView}>View</button>
      <button type="button" className="btn-primary flex-1 text-sm" onClick={onEdit}>Edit</button>
    </div>
  </div>
);
