'use client';

import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

interface FilterPanelProps {
  title?: string;
  activeCount?: number;
  onReset?: () => void;
  defaultOpen?: boolean;
  children: ReactNode;
  basicFilters?: ReactNode;
}

export function FilterPanel({
  title = 'Advanced Filters',
  activeCount = 0,
  onReset,
  defaultOpen = false,
  children,
  basicFilters,
}: FilterPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {basicFilters && <div className="flex flex-1 flex-wrap items-end gap-3">{basicFilters}</div>}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className={`btn-secondary !px-3 !py-2 ${open ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : ''}`}
            onClick={() => setOpen((value) => !value)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            {title}
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-indigo-600 px-1.5 py-0.5 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
            <ChevronDown className={`ml-2 h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
          </button>
          {activeCount > 0 && onReset && (
            <button type="button" className="btn-secondary !px-3 !py-2 text-slate-600" onClick={onReset}>
              <X className="mr-1.5 h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
        </div>
      )}
    </div>
  );
}
