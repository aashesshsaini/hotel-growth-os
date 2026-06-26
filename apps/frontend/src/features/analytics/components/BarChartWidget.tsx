'use client';

import { capitalize } from '@/utils/format';

export function BarChartWidget({
  title,
  data,
  valueFormatter,
  emptyLabel = 'No data available.',
}: {
  title: string;
  data: Record<string, number>;
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
}) {
  const entries = Object.entries(data).filter(([, value]) => value > 0);
  const max = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : entries.map(([key, value]) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{capitalize(key.replace(/_/g, ' '))}</span>
              <span className="font-semibold text-slate-950">{valueFormatter ? valueFormatter(value) : value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.round((value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
