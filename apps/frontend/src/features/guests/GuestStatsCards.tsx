'use client';

import { Cake, Crown, Gift, MapPin, Megaphone, RefreshCw, Users } from 'lucide-react';
import type { GuestStats } from '@/types';
import { capitalize } from '@/utils/format';

interface GuestStatsCardsProps {
  stats: GuestStats | null;
  isLoading: boolean;
}

function StatCard({
  title,
  value,
  helper,
  icon,
  accent,
}: {
  title: string;
  value: React.ReactNode;
  helper: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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

export const GuestStatsCards = ({ stats, isLoading }: GuestStatsCardsProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }
  if (!stats) return null;

  const topCity = Object.entries(stats.topCities ?? {})[0];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total Guests" value={stats.totalGuests} helper="All active guest profiles" icon={<Users className="h-5 w-5" />} accent="bg-indigo-50 text-indigo-700" />
      <StatCard title="New This Month" value={stats.newGuestsThisMonth} helper="Fresh CRM profiles" icon={<Gift className="h-5 w-5" />} accent="bg-sky-50 text-sky-700" />
      <StatCard title="Repeat Guests" value={stats.repeatGuests} helper="Guests with loyalty signals" icon={<RefreshCw className="h-5 w-5" />} accent="bg-emerald-50 text-emerald-700" />
      <StatCard title="VIP Guests" value={stats.vipGuests} helper="High-touch relationships" icon={<Crown className="h-5 w-5" />} accent="bg-amber-50 text-amber-700" />
      <StatCard title="Inactive Guests" value={stats.inactiveGuests ?? 0} helper="No recent booking activity" icon={<Users className="h-5 w-5" />} accent="bg-slate-100 text-slate-700" />
      <StatCard title="Special Dates" value={stats.birthdayThisMonth + stats.anniversaryThisMonth} helper={`${stats.birthdayThisMonth} birthdays, ${stats.anniversaryThisMonth} anniversaries`} icon={<Cake className="h-5 w-5" />} accent="bg-pink-50 text-pink-700" />
      <StatCard title="Top City" value={topCity ? `${capitalize(topCity[0])} (${topCity[1]})` : '—'} helper="Strongest guest location" icon={<MapPin className="h-5 w-5" />} accent="bg-purple-50 text-purple-700" />
      <StatCard title="Campaign Eligible" value={stats.campaignEligible} helper="Opted-in guests for campaigns" icon={<Megaphone className="h-5 w-5" />} accent="bg-orange-50 text-orange-700" />
    </div>
  );
};
