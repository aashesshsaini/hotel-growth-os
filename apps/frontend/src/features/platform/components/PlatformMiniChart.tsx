'use client';

import type { PlatformChartPoint } from '@/services/platform.service';

export function PlatformMiniChart({ title, data }: { title: string; data: PlatformChartPoint[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-5 flex h-36 items-end gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-end rounded-full bg-slate-100" style={{ height: 120 }}>
              <div
                className="w-full rounded-full bg-gradient-to-t from-indigo-700 to-sky-400"
                style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
