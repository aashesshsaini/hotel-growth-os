'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Download, IndianRupee, Megaphone, Users } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { PageHeader } from '@/components/PageHeader';
import { getReports } from '@/services/reports.service';
import { formatCurrency } from '@/utils/format';

export default function ReportsPage() {
  const [data, setData] = useState<Record<string, number>>({});

  useEffect(() => {
    getReports().then((result) => setData(result as Record<string, number>)).catch(() => setData({}));
  }, []);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Guest, booking, revenue, campaign, and staff reports." />
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Report builder pending:</span> date filters, exports, campaign reports, and staff performance reports need backend endpoints.
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardCard title="Booking Reports" value={data.bookings ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
        <DashboardCard title="Guest Reports" value={data.guests ?? 0} icon={<Users className="h-5 w-5" />} />
        <DashboardCard title="Revenue Reports" value={formatCurrency(data.revenue ?? 0)} icon={<IndianRupee className="h-5 w-5" />} />
        <DashboardCard title="Campaign Reports" value="Pending" icon={<Megaphone className="h-5 w-5" />} />
        <DashboardCard title="Export Center" value="Pending" icon={<Download className="h-5 w-5" />} />
      </div>
    </div>
  );
}
