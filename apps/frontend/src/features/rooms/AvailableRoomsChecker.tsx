'use client';

import { useState } from 'react';
import { FormInput, SelectInput } from '@/components/FormInput';
import type { AvailableRoom, RoomType } from '@/types';
import { getEntityId } from '@/types';
import { getAvailableRooms } from '@/services/rooms.service';
import { formatCurrency } from '@/utils/format';
import { RoomStatusBadge } from './RoomStatusBadge';

interface AvailableRoomsCheckerProps {
  roomTypes: RoomType[];
}

export const AvailableRoomsChecker = ({ roomTypes }: AvailableRoomsCheckerProps) => {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [guests, setGuests] = useState('2');
  const [results, setResults] = useState<AvailableRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const rooms = await getAvailableRooms({
        checkInDate: checkIn,
        checkOutDate: checkOut,
        roomTypeId: roomTypeId || undefined,
        numberOfGuests: Number(guests) || undefined,
      });
      setResults(rooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check availability');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card mb-6 space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">Check Available Rooms</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <FormInput label="Check-in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        <FormInput label="Check-out" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        <SelectInput label="Room Type" value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)} options={[{ value: '', label: 'All types' }, ...roomTypes.map((rt) => ({ value: getEntityId(rt), label: rt.name }))]} />
        <FormInput label="Guests" type="number" value={guests} onChange={(e) => setGuests(e.target.value)} />
        <div className="flex items-end">
          <button type="button" className="btn-primary w-full" onClick={() => void handleCheck()} disabled={isLoading}>
            {isLoading ? 'Checking...' : 'Check Availability'}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((room) => (
            <div key={room.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-900">{room.roomNumber}</span>
                <RoomStatusBadge status={room.status} />
              </div>
              <p className="text-sm text-slate-600">{room.roomType?.name || '—'}</p>
              <p className="text-sm font-medium text-primary-700">{formatCurrency(room.effectivePrice)}/night</p>
              <p className="text-xs text-slate-500">Max {room.effectiveMaxGuests} guests</p>
            </div>
          ))}
        </div>
      )}
      {!isLoading && results.length === 0 && checkIn && checkOut && !error && (
        <p className="text-sm text-slate-500">No available rooms found for selected dates.</p>
      )}
    </div>
  );
};
