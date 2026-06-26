'use client';

import { BedDouble, Ban, Sparkles, Wrench, DoorOpen, Percent } from 'lucide-react';
import type { RoomStats } from '@/types';

interface RoomStatsCardsProps {
  stats: RoomStats | null;
  isLoading: boolean;
}

function RoomStatCard({ title, value, helper, icon, accent }: { title: string; value: React.ReactNode; helper: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
        </div>
        <div className={`rounded-2xl p-3 ${accent}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

export const RoomStatsCards = ({ stats, isLoading }: RoomStatsCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <RoomStatCard title="Total Rooms" value={stats.totalRooms} helper="Physical sellable inventory" icon={<BedDouble className="h-5 w-5" />} accent="bg-indigo-50 text-indigo-700" />
      <RoomStatCard title="Available" value={stats.availableRooms} helper="Ready to assign or sell" icon={<DoorOpen className="h-5 w-5" />} accent="bg-emerald-50 text-emerald-700" />
      <RoomStatCard title="Occupied" value={stats.occupiedRooms} helper={`${stats.occupancyPercentage}% current occupancy`} icon={<BedDouble className="h-5 w-5" />} accent="bg-blue-50 text-blue-700" />
      <RoomStatCard title="Reserved" value={stats.reservedRooms ?? 0} helper="Held for upcoming arrivals" icon={<BedDouble className="h-5 w-5" />} accent="bg-purple-50 text-purple-700" />
      <RoomStatCard title="Dirty / Cleaning" value={`${stats.dirtyRooms}/${stats.cleaningRooms}`} helper="Housekeeping workload" icon={<Sparkles className="h-5 w-5" />} accent="bg-amber-50 text-amber-700" />
      <RoomStatCard title="Maintenance" value={stats.maintenanceRooms} helper={`${stats.outOfOrderRooms} out of order`} icon={<Wrench className="h-5 w-5" />} accent="bg-orange-50 text-orange-700" />
      <RoomStatCard title="Blocked" value={stats.blockedRooms} helper="Temporary or permanent holds" icon={<Ban className="h-5 w-5" />} accent="bg-red-50 text-red-700" />
      <RoomStatCard title="Occupancy" value={`${stats.occupancyPercentage}%`} helper="Occupied rooms / total rooms" icon={<Percent className="h-5 w-5" />} accent="bg-slate-100 text-slate-700" />
    </div>
  );
};
