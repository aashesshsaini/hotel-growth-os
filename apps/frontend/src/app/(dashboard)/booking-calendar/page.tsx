'use client';

import { CalendarDays, Grid3X3, Hotel, Sparkles } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { PageHeader } from '@/components/PageHeader';

export default function BookingCalendarPage() {
  return (
    <div>
      <PageHeader title="Booking Calendar" subtitle="Calendar-first view for reservations, room blocks, and occupancy." />
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Calendar workflow pending:</span> backend calendar and room assignment routes are currently not restored, so this page is a roadmap shell.
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Calendar View" value="Pending" icon={<CalendarDays className="h-5 w-5" />} />
        <DashboardCard title="Room Assignment" value="Pending" icon={<Hotel className="h-5 w-5" />} />
        <DashboardCard title="Availability Grid" value="Use Rooms" icon={<Grid3X3 className="h-5 w-5" />} />
        <DashboardCard title="Automation" value="Pending" icon={<Sparkles className="h-5 w-5" />} />
      </div>
    </div>
  );
}
