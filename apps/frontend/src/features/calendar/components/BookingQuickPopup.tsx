'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
import type { CalendarEvent, Guest, Room, RoomType } from '@/types';
import { getEventColors } from '../constants';
import { formatDate } from '@/utils/format';

interface BookingQuickPopupProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onOpenDetails: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onTransfer?: () => void;
}

export function BookingQuickPopup({
  event,
  onClose,
  onOpenDetails,
  onCheckIn,
  onCheckOut,
  onTransfer,
}: BookingQuickPopupProps) {
  if (!event) return null;
  const colors = getEventColors(event.colorKey, event.hasConflict);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reservation</p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">{event.guestName}</h3>
            <p className="text-sm text-slate-500">{event.bookingNumber}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors.bar} ${colors.text}`}>
            {colors.label}
          </span>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-slate-700">
          <p><span className="font-semibold">Room:</span> {event.roomNumber ? `Room ${event.roomNumber}` : 'Unassigned'}</p>
          <p><span className="font-semibold">Stay:</span> {formatDate(event.checkInDate)} → {formatDate(event.checkOutDate)} ({event.nights} nights)</p>
          <p><span className="font-semibold">Type:</span> {event.bookingType} · {event.source}</p>
          <p><span className="font-semibold">Payment:</span> {event.paymentStatus}</p>
          {event.hasConflict && <p className="font-semibold text-rose-600">Conflict detected on this room/dates.</p>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={onOpenDetails}>Open Details</button>
          {onCheckIn && <button type="button" className="btn-secondary" onClick={onCheckIn}>Check-in</button>}
          {onCheckOut && <button type="button" className="btn-secondary" onClick={onCheckOut}>Check-out</button>}
          {onTransfer && <button type="button" className="btn-secondary" onClick={onTransfer}>Transfer Room</button>}
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

interface QuickBookingModalProps {
  isOpen: boolean;
  guests: Guest[];
  rooms: Room[];
  roomTypes: RoomType[];
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultRoomId?: string;
  form: {
    guestId: string;
    roomId: string;
    roomTypeId: string;
    bookingType: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    totalAmount: number;
    notes: string;
  };
  onChange: (updates: Partial<QuickBookingModalProps['form']>) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export function QuickBookingModal({
  isOpen,
  guests,
  rooms,
  roomTypes,
  form,
  onChange,
  onClose,
  onSubmit,
  isSubmitting,
}: QuickBookingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-slate-950">Quick Reservation</h3>
        <p className="mt-1 text-sm text-slate-500">Create a reservation directly from the calendar.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <SelectInput
            label="Guest"
            value={form.guestId}
            onChange={(event) => onChange({ guestId: event.target.value })}
            options={guests.map((guest) => ({ value: guest._id, label: guest.fullName || guest.name || guest.phone }))}
          />
          <SelectInput
            label="Room"
            value={form.roomId}
            onChange={(event) => onChange({ roomId: event.target.value })}
            options={[{ value: '', label: 'Unassigned' }, ...rooms.map((room) => ({ value: room._id, label: `Room ${room.roomNumber}` }))]}
          />
          <FormInput label="Check-in" type="date" value={form.checkInDate} onChange={(event) => onChange({ checkInDate: event.target.value })} />
          <FormInput label="Check-out" type="date" value={form.checkOutDate} onChange={(event) => onChange({ checkOutDate: event.target.value })} />
          <SelectInput
            label="Booking Type"
            value={form.bookingType}
            onChange={(event) => onChange({ bookingType: event.target.value })}
            options={[
              { value: 'individual', label: 'Individual' },
              { value: 'corporate', label: 'Corporate' },
              { value: 'walk_in', label: 'Walk-in' },
              { value: 'ota', label: 'OTA' },
            ]}
          />
          <FormInput label="Total Amount" type="number" value={form.totalAmount} onChange={(event) => onChange({ totalAmount: Number(event.target.value) })} />
          <div className="sm:col-span-2">
            <FormInput label="Notes" value={form.notes} onChange={(event) => onChange({ notes: event.target.value })} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={isSubmitting} onClick={onSubmit}>
            {isSubmitting ? 'Creating...' : 'Create Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
