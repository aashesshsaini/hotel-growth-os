'use client';

import type { ReactNode } from 'react';
import { BedDouble, CalendarCheck, ImageOff, IndianRupee, Layers, TrendingUp } from 'lucide-react';
import type { RoomTypeStats } from '@/types';
import { formatCurrency } from '@/utils/format';

interface RoomTypeStatsCardsProps {
  stats: RoomTypeStats | null;
  isLoading: boolean;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  tone = 'indigo',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
}) => {
  const tones = {
    indigo: 'from-indigo-50 to-white text-indigo-700 ring-indigo-100',
    emerald: 'from-emerald-50 to-white text-emerald-700 ring-emerald-100',
    amber: 'from-amber-50 to-white text-amber-700 ring-amber-100',
    rose: 'from-rose-50 to-white text-rose-700 ring-rose-100',
    slate: 'from-slate-50 to-white text-slate-700 ring-slate-100',
  };

  return (
    <div className={`rounded-2xl bg-gradient-to-br p-4 shadow-sm ring-1 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="rounded-xl bg-white/80 p-2 shadow-sm">{icon}</div>
      </div>
    </div>
  );
};

export const RoomTypeStatsCards = ({ stats, isLoading }: RoomTypeStatsCardsProps) => {
  if (isLoading) {
    return (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card h-24 animate-pulse bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard title="Room Types" value={stats.totalRoomTypes} subtitle={`${stats.activeRoomTypes} active`} icon={<Layers className="h-5 w-5" />} />
      <StatCard title="Bookable" value={stats.availableForBooking ?? 0} subtitle={`${stats.visibleOnWebsite ?? 0} website visible`} icon={<CalendarCheck className="h-5 w-5" />} tone="emerald" />
      <StatCard title="Rooms Linked" value={stats.totalRoomsLinked ?? stats.totalRooms ?? 0} subtitle={`${stats.totalAvailableRooms ?? 0} available now`} icon={<BedDouble className="h-5 w-5" />} tone="indigo" />
      <StatCard title="Avg Price" value={formatCurrency(stats.averageBasePrice)} subtitle={`${formatCurrency(stats.lowestPrice ?? 0)} - ${formatCurrency(stats.highestPrice ?? 0)}`} icon={<IndianRupee className="h-5 w-5" />} tone="amber" />
      <StatCard title="Revenue" value={formatCurrency(stats.totalRevenue ?? 0)} subtitle={`${stats.totalBookings ?? 0} bookings`} icon={<TrendingUp className="h-5 w-5" />} tone="emerald" />
      <StatCard title="Media Gaps" value={stats.roomTypesWithoutImages ?? 0} subtitle="Types without images" icon={<ImageOff className="h-5 w-5" />} tone="rose" />
    </div>
  );
};
