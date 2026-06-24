'use client';

import { Globe, Users } from 'lucide-react';
import type { RoomType } from '@/types';
import { formatCurrency, capitalize } from '@/utils/format';
import { RoomTypeStatusBadge } from './RoomTypeStatusBadge';

interface RoomTypeCardProps {
  roomType: RoomType;
  onView: () => void;
  onEdit: () => void;
}

export const RoomTypeCard = ({ roomType, onView, onEdit }: RoomTypeCardProps) => {
  return (
    <div className="card overflow-hidden transition hover:shadow-md">
      <div className="relative h-40 bg-slate-100">
        {roomType.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={roomType.coverImage} alt={roomType.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
        <div className="absolute left-3 top-3">
          <RoomTypeStatusBadge status={roomType.status || (roomType.isActive ? 'active' : 'inactive')} />
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-semibold text-slate-900">{roomType.name}</h3>
          <p className="text-xs text-slate-500">{roomType.code || '—'}</p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary-700">{formatCurrency(roomType.basePrice)}</span>
          {roomType.weekendPrice ? (
            <span className="text-slate-500">W/E {formatCurrency(roomType.weekendPrice)}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {roomType.maxGuests} guests</span>
          {roomType.bedType ? <span>{capitalize(roomType.bedType)}</span> : null}
        </div>
        <div className="flex gap-2 text-xs">
          {roomType.isVisibleOnWebsite && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
              <Globe className="h-3 w-3" /> Website
            </span>
          )}
          {roomType.isAvailableForBooking && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Bookable</span>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" className="btn-secondary flex-1 text-sm" onClick={onView}>View</button>
          <button type="button" className="btn-primary flex-1 text-sm" onClick={onEdit}>Edit</button>
        </div>
      </div>
    </div>
  );
};
