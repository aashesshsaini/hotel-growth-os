'use client';

import { Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import type { StaffStats } from '@/types';

interface StaffStatsCardsProps {
  stats: StaffStats | null;
  isLoading: boolean;
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
      <DashboardCard title="Total Staff" value={stats.total} icon={<Users className="h-5 w-5" />} />
      <DashboardCard title="Active" value={stats.active} icon={<UserCheck className="h-5 w-5" />} />
      <DashboardCard title="Inactive" value={stats.inactive} icon={<UserX className="h-5 w-5" />} />
      <DashboardCard title="Suspended" value={stats.suspended} icon={<AlertTriangle className="h-5 w-5" />} />
    </div>
  );
}
