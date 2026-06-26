'use client';

import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { SelectInput } from '@/components/FormInput';
import type { CalendarView } from '@/types';
import { CALENDAR_VIEWS } from '../constants';
import { formatDayLabel } from '../utils/date';

interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  rangeLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function CalendarToolbar({
  view,
  onViewChange,
  rangeLabel,
  onPrevious,
  onNext,
  onToday,
  onRefresh,
  isLoading,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onPrevious} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" onClick={onToday} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Today
        </button>
        <button type="button" onClick={onNext} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50">
          <ChevronRight className="h-4 w-4" />
        </button>
        <p className="px-2 text-sm font-semibold text-slate-800">{rangeLabel}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SelectInput
          value={view}
          onChange={(event) => onViewChange(event.target.value as CalendarView)}
          options={CALENDAR_VIEWS}
          className="min-w-[160px]"
        />
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}

export function buildRangeLabel(from: Date, to: Date, view: CalendarView) {
  if (view === 'day') return formatDayLabel(from);
  if (view === 'month') return from.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return `${formatDayLabel(from)} – ${formatDayLabel(to)}`;
}
