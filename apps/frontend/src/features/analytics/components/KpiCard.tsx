'use client';

import type { LucideIcon } from 'lucide-react';

export function KpiCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = 'slate',
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
}) {
  const tones = {
    slate: 'from-slate-900 to-slate-700',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
    violet: 'from-violet-500 to-purple-600',
    sky: 'from-sky-500 to-blue-600',
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{value}</p>
          {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
        </div>
        <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-3 text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
