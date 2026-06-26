import type { CorporateLeadStats } from '@/types';
import { Building2, CalendarClock, FileText, IndianRupee, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

function StatCard({ title, value, helper, icon: Icon, tone }: {
  title: string; value: string | number; helper?: string;
  icon: typeof Building2; tone: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
        </div>
        <div className={`rounded-2xl p-3 text-white shadow-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function CorporateStatsCards({ stats, isLoading }: { stats: CorporateLeadStats | null; isLoading?: boolean }) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-slate-100" />)}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard title="Total Companies" value={stats.totalCompanies} helper={`${stats.activeClients} active clients`} icon={Building2} tone="bg-gradient-to-br from-indigo-500 to-blue-600" />
      <StatCard title="Pipeline Value" value={formatCurrency(stats.pipelineValue)} helper="Open opportunities" icon={TrendingUp} tone="bg-gradient-to-br from-violet-500 to-purple-600" />
      <StatCard title="Corporate Revenue" value={formatCurrency(stats.totalRevenue)} helper={`${formatCurrency(stats.monthlyRevenue)} this month`} icon={IndianRupee} tone="bg-gradient-to-br from-emerald-500 to-teal-600" />
      <StatCard title="Outstanding" value={formatCurrency(stats.outstandingAmount)} helper="Pending collections" icon={IndianRupee} tone="bg-gradient-to-br from-amber-500 to-orange-600" />
      <StatCard title="Follow-ups Due" value={stats.pendingFollowUps} helper={`${stats.meetingsThisWeek} meetings this week`} icon={CalendarClock} tone="bg-gradient-to-br from-sky-500 to-cyan-600" />
      <StatCard title="Proposals Sent" value={stats.proposalsSent} helper="Active negotiations" icon={FileText} tone="bg-gradient-to-br from-rose-500 to-red-600" />
    </div>
  );
}
