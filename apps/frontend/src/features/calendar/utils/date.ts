import type { CalendarView } from '@/types';
import { DAY_MS } from '../constants';

export const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const formatDayLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export const formatShortDate = (date: Date) =>
  date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export const eachDayOfRange = (from: Date, to: Date) => {
  const days: Date[] = [];
  let cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
};

export const resolveDefaultRange = (view: CalendarView, anchor = new Date()) => {
  const now = startOfDay(anchor);
  if (view === 'day') {
    return { from: now, to: endOfDay(now) };
  }
  if (view === 'month') {
    return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const from = addDays(now, -diff);
  return { from: startOfDay(from), to: endOfDay(addDays(from, 6)) };
};

export const getEventPosition = (
  checkIn: string,
  checkOut: string,
  rangeFrom: Date,
  cellWidth: number
) => {
  const start = startOfDay(new Date(checkIn));
  const end = startOfDay(new Date(checkOut));
  const rangeStart = startOfDay(rangeFrom);
  const offsetDays = Math.max(0, Math.round((start.getTime() - rangeStart.getTime()) / DAY_MS));
  const spanDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));
  return {
    left: offsetDays * cellWidth,
    width: spanDays * cellWidth - 4,
  };
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const isToday = (date: Date) => isSameDay(date, new Date());
