'use client';

import { CalendarCheck, Crown, Globe, IndianRupee, Users } from 'lucide-react';
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
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="relative h-44 bg-gradient-to-br from-slate-200 to-slate-100">
        {roomType.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={roomType.coverImage} alt={roomType.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
        <div className="absolute left-3 top-3">
          <RoomTypeStatusBadge status={roomType.status || (roomType.isActive ? 'active' : 'inactive')} />
        </div>
        {roomType.isPopular ? (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-sm">
            <Crown className="h-3.5 w-3.5" /> Popular
          </div>
        ) : null}
      </div>
      <div className="space-y-4 p-4">
        <div>
          <h3 className="font-semibold text-slate-900">{roomType.name}</h3>
          <p className="text-xs text-slate-500">{roomType.code || '—'}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1 font-semibold text-primary-700"><IndianRupee className="h-3.5 w-3.5" /> {formatCurrency(roomType.basePrice)}</span>
          {roomType.weekendPrice ? (
            <span className="text-slate-500">W/E {formatCurrency(roomType.weekendPrice)}</span>
          ) : null}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white p-2">
              <p className="font-semibold text-slate-900">{roomType.linkedRoomsCount ?? roomType.totalRooms ?? 0}</p>
              <p className="text-slate-500">Rooms</p>
            </div>
            <div className="rounded-xl bg-white p-2">
              <p className="font-semibold text-emerald-700">{roomType.availableRoomsCount ?? '—'}</p>
              <p className="text-slate-500">Avail</p>
            </div>
            <div className="rounded-xl bg-white p-2">
              <p className="font-semibold text-slate-900">{roomType.bookingCount ?? '—'}</p>
              <p className="text-slate-500">Bookings</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {roomType.maxGuests} guests</span>
          {roomType.bedType ? <span>{capitalize(roomType.bedType)}</span> : null}
          {roomType.revenue !== undefined ? <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" /> {formatCurrency(roomType.revenue)}</span> : null}
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
