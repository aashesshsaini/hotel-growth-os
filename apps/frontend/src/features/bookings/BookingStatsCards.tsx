'use client';

import { CalendarCheck, CalendarClock, IndianRupee, LogIn, LogOut, XCircle } from 'lucide-react';
import type { BookingStats } from '@/types';
import { formatCurrency } from '@/utils/format';

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

export function BookingStatsCards({ stats, isLoading }: { stats: BookingStats | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }

  const data = stats ?? {
    totalBookings: 0,
    todayBookings: 0,
    upcomingCheckIns: 0,
    upcomingCheckOuts: 0,
    checkedIn: 0,
    cancelled: 0,
    bookingRevenue: 0,
    pendingRevenue: 0,
    statusBreakdown: {},
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Total Bookings" value={data.totalBookings} helper={`${data.todayBookings} created today`} icon={<CalendarCheck className="h-5 w-5" />} accent="bg-indigo-50 text-indigo-700" />
      <StatCard title="Upcoming Check-ins" value={data.upcomingCheckIns} helper="Next 7 days arrival workload" icon={<LogIn className="h-5 w-5" />} accent="bg-emerald-50 text-emerald-700" />
      <StatCard title="Upcoming Check-outs" value={data.upcomingCheckOuts} helper="Rooms leaving soon" icon={<LogOut className="h-5 w-5" />} accent="bg-sky-50 text-sky-700" />
      <StatCard title="In-house Guests" value={data.checkedIn} helper="Currently checked in" icon={<CalendarClock className="h-5 w-5" />} accent="bg-purple-50 text-purple-700" />
      <StatCard title="Booking Revenue" value={formatCurrency(data.bookingRevenue)} helper="Collected booking revenue" icon={<IndianRupee className="h-5 w-5" />} accent="bg-amber-50 text-amber-700" />
      <StatCard title="Pending Revenue" value={formatCurrency(data.pendingRevenue)} helper="Unpaid and partial balances" icon={<IndianRupee className="h-5 w-5" />} accent="bg-orange-50 text-orange-700" />
      <StatCard title="Cancelled" value={data.cancelled} helper="Cancelled reservations" icon={<XCircle className="h-5 w-5" />} accent="bg-red-50 text-red-700" />
      <StatCard title="Confirmed" value={data.statusBreakdown.confirmed ?? 0} helper="Ready for arrival" icon={<CalendarCheck className="h-5 w-5" />} accent="bg-teal-50 text-teal-700" />
    </div>
  );
}

