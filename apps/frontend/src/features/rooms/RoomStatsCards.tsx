'use client';

import { BedDouble, Ban, Sparkles, Wrench, DoorOpen, Percent } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import type { RoomStats } from '@/types';

interface RoomStatsCardsProps {
  stats: RoomStats | null;
  isLoading: boolean;
}

export const RoomStatsCards = ({ stats, isLoading }: RoomStatsCardsProps) => {
  if (isLoading) {
    return (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card h-24 animate-pulse bg-slate-100" />
        ))}
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <DashboardCard title="Total" value={stats.totalRooms} icon={<BedDouble className="h-5 w-5" />} />
      <DashboardCard title="Available" value={stats.availableRooms} icon={<DoorOpen className="h-5 w-5" />} />
      <DashboardCard title="Occupied" value={stats.occupiedRooms} icon={<BedDouble className="h-5 w-5" />} />
      <DashboardCard title="Dirty" value={stats.dirtyRooms} icon={<Sparkles className="h-5 w-5" />} />
      <DashboardCard title="Cleaning" value={stats.cleaningRooms} icon={<Sparkles className="h-5 w-5" />} />
      <DashboardCard title="Maintenance" value={stats.maintenanceRooms} icon={<Wrench className="h-5 w-5" />} />
      <DashboardCard title="Blocked" value={stats.blockedRooms} icon={<Ban className="h-5 w-5" />} />
      <DashboardCard title="Occupancy" value={`${stats.occupancyPercentage}%`} icon={<Percent className="h-5 w-5" />} />
    </div>
  );
};
