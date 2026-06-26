'use client';

import { capitalize } from '@/utils/format';

const palette = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

export function DonutChartWidget({
  title,
  data,
  emptyLabel = 'No distribution data.',
}: {
  title: string;
  data: Record<string, number>;
  emptyLabel?: string;
}) {
  const entries = Object.entries(data).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  let offset = 0;
  const segments = entries.map(([key, value], index) => {
    const percent = total > 0 ? (value / total) * 100 : 0;
    const segment = { key, value, percent, color: palette[index % palette.length], offset };
    offset += percent;
    return segment;
  });

  const gradient = segments.length
    ? `conic-gradient(${segments.map((segment) => `${segment.color} ${segment.offset}% ${segment.offset + segment.percent}%`).join(', ')})`
    : '#e2e8f0';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
          <div className="mx-auto h-40 w-40 rounded-full" style={{ background: gradient }} />
          <div className="space-y-2">
            {segments.map((segment) => (
              <div key={segment.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-slate-700">{capitalize(segment.key.replace(/_/g, ' '))}</span>
                </div>
                <span className="font-semibold text-slate-950">{segment.value} ({Math.round(segment.percent)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
