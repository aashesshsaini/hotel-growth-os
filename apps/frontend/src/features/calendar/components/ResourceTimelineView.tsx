'use client';

import { useMemo, useState } from 'react';
import type { CalendarBlockEvent, CalendarBookingsResponse, CalendarEvent, CalendarResource } from '@/types';
import { CELL_WIDTH } from '../constants';
import { eachDayOfRange, formatDayLabel, getEventPosition, isToday, startOfDay } from '../utils/date';
import { CalendarBlockBar, CalendarBookingBar } from './CalendarBookingBar';

interface ResourceTimelineViewProps {
  data: CalendarBookingsResponse;
  rangeFrom: Date;
  rangeTo: Date;
  onSelectEvent: (event: CalendarEvent) => void;
  onMoveEvent: (event: CalendarEvent, roomId: string, day: Date) => void;
}

export function ResourceTimelineView({
  data,
  rangeFrom,
  rangeTo,
  onSelectEvent,
  onMoveEvent,
}: ResourceTimelineViewProps) {
  const days = useMemo(() => eachDayOfRange(rangeFrom, rangeTo), [rangeFrom, rangeTo]);
  const [dragEvent, setDragEvent] = useState<CalendarEvent | null>(null);

  const eventsByRoom = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    data.events.forEach((event) => {
      if (!event.roomId) return;
      map.set(event.roomId, [...(map.get(event.roomId) ?? []), event]);
    });
    return map;
  }, [data.events]);

  const blocksByRoom = useMemo(() => {
    const map = new Map<string, CalendarBlockEvent[]>();
    data.blocks.forEach((block) => {
      map.set(block.roomId, [...(map.get(block.roomId) ?? []), block]);
    });
    return map;
  }, [data.blocks]);

  const handleDrop = (room: CalendarResource, day: Date) => {
    if (!dragEvent) return;
    onMoveEvent(dragEvent, room.id, day);
    setDragEvent(null);
  };

  if (data.resources.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-700">No rooms available for calendar view</p>
        <p className="mt-1 text-sm text-slate-500">Add rooms to start managing reservations on the timeline.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 220 + days.length * CELL_WIDTH }}>
          <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-slate-50">
            <div className="sticky left-0 z-30 w-[220px] shrink-0 border-r border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Room
            </div>
            <div className="flex">
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  style={{ width: CELL_WIDTH }}
                  className={`border-r border-slate-100 px-2 py-3 text-center ${isToday(day) ? 'bg-indigo-50' : ''}`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </p>
                  <p className={`text-sm font-bold ${isToday(day) ? 'text-indigo-700' : 'text-slate-800'}`}>
                    {day.getDate()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="max-h-[640px] overflow-y-auto">
            {data.roomTypeGroups.map((group) => (
              <div key={group.id}>
                <div className="sticky left-0 bg-indigo-50/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-indigo-700">
                  {group.name} · {group.totalRooms} rooms
                </div>
                {group.rooms.map((room) => (
                  <RoomRow
                    key={room.id}
                    room={room}
                    days={days}
                    events={eventsByRoom.get(room.id) ?? []}
                    blocks={blocksByRoom.get(room.id) ?? []}
                    rangeFrom={rangeFrom}
                    dragEvent={dragEvent}
                    onDrop={handleDrop}
                    onSelectEvent={onSelectEvent}
                    onDragStart={setDragEvent}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomRow({
  room,
  days,
  events,
  blocks,
  rangeFrom,
  dragEvent,
  onDrop,
  onSelectEvent,
  onDragStart,
}: {
  room: CalendarResource;
  days: Date[];
  events: CalendarEvent[];
  blocks: CalendarBlockEvent[];
  rangeFrom: Date;
  dragEvent: CalendarEvent | null;
  onDrop: (room: CalendarResource, day: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onDragStart: (event: CalendarEvent) => void;
}) {
  return (
    <div className="flex border-b border-slate-100">
      <div className="sticky left-0 z-10 w-[220px] shrink-0 border-r border-slate-200 bg-white px-4 py-3">
        <p className="text-sm font-bold text-slate-900">Room {room.roomNumber}</p>
        <p className="text-xs text-slate-500">{room.roomTypeName}{room.floor !== undefined ? ` · Floor ${room.floor}` : ''}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {room.status.replace(/_/g, ' ')}{room.currentGuestName ? ` · ${room.currentGuestName}` : ''}
        </p>
      </div>
      <div className="relative flex" style={{ width: days.length * CELL_WIDTH, minHeight: 56 }}>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            style={{ width: CELL_WIDTH }}
            className={`border-r border-slate-50 ${isToday(day) ? 'bg-indigo-50/40' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDrop(room, day)}
          />
        ))}
        {blocks.map((block) => {
          const pos = getEventPosition(block.from, block.to, rangeFrom, CELL_WIDTH);
          return <CalendarBlockBar key={block.id} block={block} {...pos} top={34} />;
        })}
        {events.map((event, index) => {
          const pos = getEventPosition(event.checkInDate, event.checkOutDate, rangeFrom, CELL_WIDTH);
          return (
            <CalendarBookingBar
              key={event.id}
              event={event}
              {...pos}
              top={6 + (index % 2) * 0}
              onSelect={onSelectEvent}
              onDragStart={onDragStart}
            />
          );
        })}
        {dragEvent && (
          <div className="pointer-events-none absolute inset-0 bg-indigo-500/5" />
        )}
      </div>
    </div>
  );
}

export function WeekGridView({
  data,
  rangeFrom,
  rangeTo,
  onSelectEvent,
}: {
  data: CalendarBookingsResponse;
  rangeFrom: Date;
  rangeTo: Date;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const days = useMemo(() => eachDayOfRange(rangeFrom, rangeTo), [rangeFrom, rangeTo]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {days.map((day) => {
        const dayEvents = data.events.filter((event) => {
          const checkIn = startOfDay(new Date(event.checkInDate));
          const checkOut = startOfDay(new Date(event.checkOutDate));
          const current = startOfDay(day);
          return current >= checkIn && current < checkOut;
        });
        return (
          <div key={day.toISOString()} className={`rounded-3xl border p-4 ${isToday(day) ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-white'}`}>
            <p className="text-sm font-bold text-slate-900">{formatDayLabel(day)}</p>
            <div className="mt-3 space-y-2">
              {dayEvents.length === 0 ? (
                <p className="text-sm text-slate-500">No reservations</p>
              ) : (
                dayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <p className="text-sm font-semibold text-slate-900">{event.guestName}</p>
                    <p className="text-xs text-slate-500">{event.roomNumber ? `Room ${event.roomNumber}` : 'Unassigned'} · {event.bookingNumber}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MonthGridView({
  data,
  anchorDate,
  onSelectEvent,
}: {
  data: CalendarBookingsResponse;
  anchorDate: Date;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const days = eachDayOfRange(monthStart, monthEnd);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {days.map((day) => {
        const dayEvents = data.events.filter((event) => {
          const checkIn = startOfDay(new Date(event.checkInDate));
          const checkOut = startOfDay(new Date(event.checkOutDate));
          const current = startOfDay(day);
          return current >= checkIn && current < checkOut;
        });
        return (
          <div key={day.toISOString()} className={`min-h-[120px] rounded-2xl border p-3 ${isToday(day) ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 bg-white'}`}>
            <p className="text-sm font-bold text-slate-800">{day.getDate()}</p>
            <div className="mt-2 space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <button key={event.id} type="button" onClick={() => onSelectEvent(event)} className="block w-full truncate rounded-lg bg-indigo-100 px-2 py-1 text-left text-[11px] font-semibold text-indigo-800">
                  {event.guestName}
                </button>
              ))}
              {dayEvents.length > 3 && <p className="text-[10px] text-slate-500">+{dayEvents.length - 3} more</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
