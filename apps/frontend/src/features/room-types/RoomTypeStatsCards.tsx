'use client';

import { Layers, Globe, CalendarCheck, IndianRupee, ImageOff, CheckCircle } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import type { RoomTypeStats } from '@/types';
import { formatCurrency } from '@/utils/format';

interface RoomTypeStatsCardsProps {
  stats: RoomTypeStats | null;
  isLoading: boolean;
}

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
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <DashboardCard title="Total Room Types" value={stats.totalRoomTypes} icon={<Layers className="h-5 w-5" />} />
      <DashboardCard title="Active" value={stats.activeRoomTypes} icon={<CheckCircle className="h-5 w-5" />} />
      <DashboardCard title="On Website" value={stats.visibleOnWebsite} icon={<Globe className="h-5 w-5" />} />
      <DashboardCard title="Bookable" value={stats.availableForBooking} icon={<CalendarCheck className="h-5 w-5" />} />
      <DashboardCard title="Avg Price" value={formatCurrency(stats.averageBasePrice)} icon={<IndianRupee className="h-5 w-5" />} />
      <DashboardCard title="No Images" value={stats.roomTypesWithoutImages} icon={<ImageOff className="h-5 w-5" />} />
    </div>
  );
};
