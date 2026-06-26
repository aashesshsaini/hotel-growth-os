'use client';

import type { CalendarOccupancyDay } from '@/types';
import { addDays, eachDayOfRange, formatShortDate, isToday, startOfDay } from '../utils/date';

interface MiniCalendarProps {
  anchorDate: Date;
  rangeFrom: Date;
  rangeTo: Date;
  days: CalendarOccupancyDay[];
  onSelectDate: (date: Date) => void;
}

export function MiniCalendar({ anchorDate, rangeFrom, rangeTo, days, onSelectDate }: MiniCalendarProps) {
  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const gridStart = addDays(monthStart, -(monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1));
  const gridDays = eachDayOfRange(gridStart, addDays(gridStart, 41));

  const occupancyMap = new Map(days.map((day) => [day.date.slice(0, 10), day.occupancyRate]));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">
        {anchorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {gridDays.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const rate = occupancyMap.get(key) ?? 0;
          const inRange = day >= startOfDay(rangeFrom) && day <= startOfDay(rangeTo);
          const inMonth = day.getMonth() === anchorDate.getMonth();
          const heat = rate >= 80 ? 'bg-rose-100 text-rose-700' : rate >= 50 ? 'bg-amber-100 text-amber-700' : rate > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600';
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`rounded-lg px-1 py-2 text-xs font-semibold transition ${heat} ${
                isToday(day) ? 'ring-2 ring-indigo-400' : ''
              } ${inRange ? 'outline outline-1 outline-indigo-200' : ''} ${inMonth ? '' : 'opacity-40'}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">Heatmap shows daily occupancy rate.</p>
    </div>
  );
}

export function OccupancyHeatmapBar({ days }: { days: CalendarOccupancyDay[] }) {
  if (days.length === 0) return null;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Occupancy Heatmap</p>
      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {days.map((day) => (
          <div key={day.date} className="min-w-[52px] text-center">
            <div
              className={`mx-auto h-16 w-10 rounded-xl ${
                day.occupancyRate >= 80 ? 'bg-rose-500' : day.occupancyRate >= 50 ? 'bg-amber-400' : day.occupancyRate > 0 ? 'bg-emerald-400' : 'bg-slate-200'
              }`}
              title={`${day.occupancyRate}% occupancy`}
            />
            <p className="mt-1 text-[10px] font-semibold text-slate-500">{formatShortDate(new Date(day.date))}</p>
            <p className="text-[10px] text-slate-400">{day.occupancyRate}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
