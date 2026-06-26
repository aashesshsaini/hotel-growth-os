'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Clock, UserCheck, Users } from 'lucide-react';
import type { StaffStats } from '@/types';

interface StaffStatsCardsProps {
  stats: StaffStats | null;
  isLoading: boolean;
}

function StaffStatCard({ title, value, helper, icon, tone = 'indigo' }: { title: string; value: string | number; helper?: string; icon: ReactNode; tone?: 'indigo' | 'emerald' | 'amber' | 'rose' }) {
  const tones = {
    indigo: 'from-indigo-50 to-white text-indigo-700 ring-indigo-100',
    emerald: 'from-emerald-50 to-white text-emerald-700 ring-emerald-100',
    amber: 'from-amber-50 to-white text-amber-700 ring-amber-100',
    rose: 'from-rose-50 to-white text-rose-700 ring-rose-100',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-4 shadow-sm ring-1 ${tones[tone]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
        </div>
        <div className="rounded-xl bg-white/80 p-2 shadow-sm">{icon}</div>
      </div>
    </div>
  );
}

export function StaffStatsCards({ stats, isLoading }: StaffStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-24 animate-pulse bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StaffStatCard title="Total Staff" value={stats.total} helper={`${Object.keys(stats.byDepartment || {}).length} departments`} icon={<Users className="h-5 w-5" />} />
      <StaffStatCard title="On Duty" value={stats.onDuty ?? 0} helper={`${stats.presentToday ?? 0} present today`} icon={<Clock className="h-5 w-5" />} tone="emerald" />
      <StaffStatCard title="Active" value={stats.active} helper={`${stats.offDuty ?? 0} off duty · ${stats.onLeave ?? 0} leave`} icon={<UserCheck className="h-5 w-5" />} tone="indigo" />
      <StaffStatCard title="Exceptions" value={(stats.suspended ?? 0) + (stats.resigned ?? 0)} helper={`${stats.lateToday ?? 0} late today`} icon={<AlertTriangle className="h-5 w-5" />} tone="rose" />
    </div>
  );
}
