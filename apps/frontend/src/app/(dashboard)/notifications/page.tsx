'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState, ModulePageLayout, StatCard, SummaryCardGrid } from '@/components/layout';
import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { useAuth } from '@/hooks/useAuth';
import { createNotification, deleteNotification, getNotifications, updateNotification } from '@/services/notifications.service';
import { getPlatformNotifications, type PlatformNotification } from '@/services/platform.service';
import { formatDate } from '@/utils/format';

const statusOptions = undefined;

export default function Page() {
  const { user } = useAuth();
  const [items, setItems] = useState<PlatformNotification[]>([]);
  const [loading, setLoading] = useState(user?.role === 'super_admin');

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    getPlatformNotifications().then(setItems).finally(() => setLoading(false));
  }, [user?.role]);

  if (user?.role === 'super_admin') {
    return (
      <PlatformOnly>
        <ModulePageLayout
          title="Platform Notifications"
          subtitle="Global platform events, tenant lifecycle updates, service issues, and system notices."
          summary={
            <SummaryCardGrid columns={3}>
              <StatCard title="Notifications" value={items.length} helper="Latest global events" icon={<Bell className="h-5 w-5" />} />
              <StatCard title="Critical" value={items.filter((item) => item.severity === 'error').length} helper="Requires attention" />
              <StatCard title="Source" value="Platform" helper="No hotel guest/booking notifications" />
            </SummaryCardGrid>
          }
        >
          {loading ? (
            <LoadingState variant="table" />
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">No platform notifications yet.</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                        <StatusBadge status={item.severity} />
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                      <p className="mt-2 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </ModulePageLayout>
      </PlatformOnly>
    );
  }

  return (
    <ModuleCrudPage
      title="Notifications"
      subtitle="Create and review operational notifications."
      searchPlaceholder="Search notifications..."
      list={getNotifications}
      create={createNotification}
      update={updateNotification}
      remove={deleteNotification}
      statusOptions={statusOptions}
      comingSoon={'Mark-read endpoints and user notification center UX are still pending.'}
      fields={[ { key: 'title', label: 'Title', required: true }, { key: 'message', label: 'Message', type: 'textarea', required: true }, { key: 'type', label: 'Type', type: 'select', options: [{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'success', label: 'Success' }, { value: 'error', label: 'Error' }] }, { key: 'isRead', label: 'Read State', type: 'select', options: [{ value: 'true', label: 'Read' }, { value: 'false', label: 'Unread' }] } ]}
      columns={[ { key: 'title', header: 'Notification' }, { key: 'type', header: 'Type', type: 'status' }, { key: 'isRead', header: 'Read' }, { key: 'createdAt', header: 'Created', type: 'date' } ]}
    />
  );
}
