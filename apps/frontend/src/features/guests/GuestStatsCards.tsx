'use client';

import { Cake, Crown, Gift, MapPin, Megaphone, RefreshCw, Users } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import type { GuestStats } from '@/types';
import { capitalize } from '@/utils/format';

interface GuestStatsCardsProps {
  stats: GuestStats | null;
  isLoading: boolean;
}

export const GuestStatsCards = ({ stats, isLoading }: GuestStatsCardsProps) => {
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

  const topCity = Object.entries(stats.topCities ?? {})[0];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <DashboardCard title="Total Guests" value={stats.totalGuests} icon={<Users className="h-5 w-5" />} />
      <DashboardCard title="New This Month" value={stats.newGuestsThisMonth} icon={<Gift className="h-5 w-5" />} />
      <DashboardCard title="Repeat Guests" value={stats.repeatGuests} icon={<RefreshCw className="h-5 w-5" />} />
      <DashboardCard title="VIP Guests" value={stats.vipGuests} icon={<Crown className="h-5 w-5" />} />
      <DashboardCard title="Birthdays" value={stats.birthdayThisMonth} icon={<Cake className="h-5 w-5" />} />
      <DashboardCard title="Anniversaries" value={stats.anniversaryThisMonth} icon={<Cake className="h-5 w-5" />} />
      <DashboardCard
        title="Top City"
        value={topCity ? `${capitalize(topCity[0])} (${topCity[1]})` : '—'}
        icon={<MapPin className="h-5 w-5" />}
      />
      <DashboardCard title="Campaign Eligible" value={stats.campaignEligible} icon={<Megaphone className="h-5 w-5" />} />
    </div>
  );
};
