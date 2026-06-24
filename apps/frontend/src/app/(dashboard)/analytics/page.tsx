'use client';

import { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, IndianRupee, TrendingUp, Users } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { PageHeader } from '@/components/PageHeader';
import { getDashboard } from '@/services/dashboard.service';
import { getReports } from '@/services/reports.service';
import { formatCurrency } from '@/utils/format';

type RecordData = Record<string, any>;

const n = (value: unknown) => (typeof value === 'number' ? value : 0);

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<RecordData>({});
  const [reports, setReports] = useState<RecordData>({});

  useEffect(() => {
    void Promise.all([getDashboard(), getReports()]).then(([dash, report]) => {
      setDashboard(dash as RecordData);
      setReports(report as RecordData);
    });
  }, []);

  const occupancy = dashboard.occupancy || {};
  const revenue = dashboard.monthlyRevenue || {};

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Revenue, occupancy, booking source, and growth analytics workspace." />
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Advanced analytics pending:</span> source attribution, OTA vs direct analytics, charts, cohorts, and date filters still need backend endpoints.
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardCard title="Occupancy" value={`${n(occupancy.occupancyPercent)}%`} icon={<BarChart3 className="h-5 w-5" />} />
        <DashboardCard title="Monthly Revenue" value={formatCurrency(n(revenue.revenue ?? reports.revenue))} icon={<IndianRupee className="h-5 w-5" />} />
        <DashboardCard title="Bookings" value={n(reports.bookings)} icon={<CalendarDays className="h-5 w-5" />} />
        <DashboardCard title="Guests" value={n(reports.guests)} icon={<Users className="h-5 w-5" />} />
        <DashboardCard title="Direct Growth" value="Pending" icon={<TrendingUp className="h-5 w-5" />} />
      </div>
    </div>
  );
}
