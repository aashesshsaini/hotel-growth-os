import type { CalendarView } from '@/types';

export const CALENDAR_VIEWS: Array<{ value: CalendarView; label: string }> = [
  { value: 'resource', label: 'Room Resource' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
];

export const BOOKING_STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked In' },
  { value: 'checked_out', label: 'Checked Out' },
  { value: 'pending', label: 'Pending' },
  { value: 'reserved', label: 'Reserved' },
];

export const BOOKING_TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'individual', label: 'Individual' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'group', label: 'Group' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'ota', label: 'OTA' },
  { value: 'direct', label: 'Direct' },
];

export const EVENT_COLOR_CLASSES: Record<string, { bar: string; border: string; text: string; label: string }> = {
  confirmed: { bar: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-white', label: 'Confirmed' },
  checked_in: { bar: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', label: 'Checked In' },
  checked_out: { bar: 'bg-slate-400', border: 'border-slate-500', text: 'text-white', label: 'Checked Out' },
  pending: { bar: 'bg-amber-400', border: 'border-amber-500', text: 'text-slate-900', label: 'Pending' },
  reserved: { bar: 'bg-sky-400', border: 'border-sky-500', text: 'text-white', label: 'Reserved' },
  cancelled: { bar: 'bg-rose-300', border: 'border-rose-400', text: 'text-rose-900', label: 'Cancelled' },
  no_show: { bar: 'bg-rose-500', border: 'border-rose-600', text: 'text-white', label: 'No Show' },
  vip: { bar: 'bg-violet-600', border: 'border-violet-700', text: 'text-white', label: 'VIP' },
  corporate: { bar: 'bg-blue-600', border: 'border-blue-700', text: 'text-white', label: 'Corporate' },
  wedding: { bar: 'bg-pink-500', border: 'border-pink-600', text: 'text-white', label: 'Wedding' },
  group: { bar: 'bg-cyan-600', border: 'border-cyan-700', text: 'text-white', label: 'Group' },
  walk_in: { bar: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', label: 'Walk-in' },
  ota: { bar: 'bg-teal-500', border: 'border-teal-600', text: 'text-white', label: 'OTA' },
  direct: { bar: 'bg-indigo-400', border: 'border-indigo-500', text: 'text-white', label: 'Direct' },
  maintenance: { bar: 'bg-red-500/80', border: 'border-red-600', text: 'text-white', label: 'Maintenance' },
  maintenance_urgent: { bar: 'bg-red-600', border: 'border-red-700', text: 'text-white', label: 'Urgent Maintenance' },
  cleaning: { bar: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-slate-900', label: 'Cleaning' },
  blocked: { bar: 'bg-slate-700', border: 'border-slate-800', text: 'text-white', label: 'Blocked' },
  hold: { bar: 'bg-slate-500', border: 'border-slate-600', text: 'text-white', label: 'Hold' },
  overbooked: { bar: 'bg-rose-600 ring-2 ring-rose-300', border: 'border-rose-700', text: 'text-white', label: 'Conflict' },
};

export const getEventColors = (colorKey: string, hasConflict?: boolean) => {
  if (hasConflict) return EVENT_COLOR_CLASSES.overbooked;
  return EVENT_COLOR_CLASSES[colorKey] || EVENT_COLOR_CLASSES.confirmed;
};

export const DAY_MS = 24 * 60 * 60 * 1000;
export const CELL_WIDTH = 96;
