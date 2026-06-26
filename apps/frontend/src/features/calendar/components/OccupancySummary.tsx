import type { CalendarOverview } from '@/types';
import { BedDouble, LogIn, LogOut, AlertTriangle, Sparkles } from 'lucide-react';

function StatCard({ label, value, helper, tone }: { label: string; value: string | number; helper?: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
      {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
    </div>
  );
}

export function OccupancySummary({ overview }: { overview: CalendarOverview }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Occupancy" value={`${overview.occupancyRate}%`} helper={`${overview.occupiedRooms}/${overview.totalRooms} rooms`} tone="text-indigo-700" />
      <StatCard label="Today's Check-ins" value={overview.todayCheckIns} helper={`${overview.upcomingArrivals} arrivals this week`} tone="text-emerald-700" />
      <StatCard label="Today's Check-outs" value={overview.todayCheckOuts} helper={`${overview.upcomingDepartures} departures this week`} tone="text-amber-700" />
      <StatCard label="In-house Guests" value={overview.inHouseGuests} helper={`${overview.availableRooms} rooms available`} tone="text-violet-700" />
      <StatCard label="Conflicts" value={overview.conflictCount} helper={`${overview.blockedRooms} blocked · ${overview.dirtyRooms} dirty`} tone={overview.conflictCount > 0 ? 'text-rose-700' : 'text-slate-700'} />
    </div>
  );
}

export function OccupancyLegend() {
  const items = [
    { icon: LogIn, label: 'Check-in', color: 'bg-emerald-500' },
    { icon: LogOut, label: 'Check-out', color: 'bg-amber-500' },
    { icon: BedDouble, label: 'In-house', color: 'bg-indigo-500' },
    { icon: AlertTriangle, label: 'Conflict', color: 'bg-rose-500' },
    { icon: Sparkles, label: 'Cleaning', color: 'bg-yellow-400' },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div key={item.label} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
