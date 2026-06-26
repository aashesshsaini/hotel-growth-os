'use client';

import type { TrendPoint } from '@/types';

export function TrendAreaChart({
  title,
  data,
  valueFormatter,
  emptyLabel = 'No trend data for this period.',
  color = 'indigo',
}: {
  title: string;
  data: TrendPoint[];
  valueFormatter?: (value: number) => string;
  emptyLabel?: string;
  color?: 'indigo' | 'emerald' | 'amber' | 'violet';
}) {
  const colors = {
    indigo: { stroke: '#6366f1', fill: 'rgba(99,102,241,0.15)' },
    emerald: { stroke: '#10b981', fill: 'rgba(16,185,129,0.15)' },
    amber: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.15)' },
    violet: { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.15)' },
  }[color];

  const max = Math.max(...data.map((point) => point.value), 1);
  const width = 640;
  const height = 180;
  const padding = 24;
  const points = data.map((point, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (point.value / max) * (height - padding * 2);
    return { x, y, ...point };
  });

  const path = points.length
    ? `M ${points.map((point) => `${point.x},${point.y}`).join(' L ')} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`
    : '';

  const linePath = points.length ? `M ${points.map((point) => `${point.x},${point.y}`).join(' L ')}` : '';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-44 w-full">
            <path d={path} fill={colors.fill} />
            <path d={linePath} fill="none" stroke={colors.stroke} strokeWidth="3" strokeLinecap="round" />
            {points.map((point) => (
              <circle key={point.label} cx={point.x} cy={point.y} r="4" fill={colors.stroke} />
            ))}
          </svg>
          <div className="mt-2 flex flex-wrap gap-2">
            {points.slice(-6).map((point) => (
              <span key={point.label} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                {point.label}: {valueFormatter ? valueFormatter(point.value) : point.value}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
