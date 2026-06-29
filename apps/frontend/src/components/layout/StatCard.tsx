'use client';

import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  accent?: string;
}

export function StatCard({
  title,
  value,
  helper,
  icon,
  accent = 'bg-indigo-50 text-indigo-700',
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
          {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
        </div>
        {icon && <div className={`shrink-0 rounded-2xl p-3 ${accent}`}>{icon}</div>}
      </div>
    </div>
  );
}
