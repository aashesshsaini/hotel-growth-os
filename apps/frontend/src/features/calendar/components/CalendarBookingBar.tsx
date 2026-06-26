'use client';

import type { CalendarBlockEvent, CalendarEvent } from '@/types';
import { getEventColors } from '../constants';

interface CalendarBookingBarProps {
  event: CalendarEvent;
  left: number;
  width: number;
  top?: number;
  draggable?: boolean;
  onSelect: (event: CalendarEvent) => void;
  onDragStart?: (event: CalendarEvent) => void;
}

export function CalendarBookingBar({
  event,
  left,
  width,
  top = 6,
  draggable = true,
  onSelect,
  onDragStart,
}: CalendarBookingBarProps) {
  const colors = getEventColors(event.colorKey, event.hasConflict);

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={() => onDragStart?.(event)}
      onClick={() => onSelect(event)}
      style={{ left, width, top }}
      className={`absolute z-10 h-9 overflow-hidden rounded-xl border px-2 text-left shadow-sm transition hover:brightness-110 ${colors.bar} ${colors.border} ${colors.text}`}
      title={`${event.guestName} · ${event.bookingNumber}`}
    >
      <p className="truncate text-xs font-bold">{event.guestName}</p>
      <p className="truncate text-[10px] opacity-90">{event.bookingNumber}{event.guestIsVip ? ' · VIP' : ''}</p>
    </button>
  );
}

export function CalendarBlockBar({
  block,
  left,
  width,
  top = 6,
}: {
  block: CalendarBlockEvent;
  left: number;
  width: number;
  top?: number;
}) {
  const colors = getEventColors(block.colorKey);
  return (
    <div
      style={{ left, width, top }}
      className={`absolute z-[5] h-9 overflow-hidden rounded-xl border px-2 ${colors.bar} ${colors.border} ${colors.text}`}
      title={block.title}
    >
      <p className="truncate text-xs font-semibold">{block.title}</p>
      <p className="truncate text-[10px] opacity-90">{block.blockType.replace(/_/g, ' ')}</p>
    </div>
  );
}
