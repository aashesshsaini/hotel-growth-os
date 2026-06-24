'use client';

import { Bell, Hotel, Shield, SlidersHorizontal } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { PageHeader } from '@/components/PageHeader';

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" subtitle="Hotel settings, permissions, integrations, and notification preferences." />
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Settings restoration pending:</span> hotel settings APIs exist partially, but roles UI, integration settings, and notification settings are not complete.
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Hotel Settings" value="Use Hotel Management" icon={<Hotel className="h-5 w-5" />} />
        <DashboardCard title="Roles & Permissions" value="Staff module" icon={<Shield className="h-5 w-5" />} />
        <DashboardCard title="Notification Settings" value="Pending" icon={<Bell className="h-5 w-5" />} />
        <DashboardCard title="Platform Preferences" value="Pending" icon={<SlidersHorizontal className="h-5 w-5" />} />
      </div>
    </div>
  );
}
