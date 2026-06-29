'use client';

import { useEffect, useState } from 'react';
import { Bell, Clock, Globe2, KeyRound, Languages, Moon, ShieldCheck, UserCircle } from 'lucide-react';
import { LoadingState, ModulePageLayout, StatCard, SummaryCardGrid } from '@/components/layout';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { getPlatformProfile, type PlatformProfileResponse } from '@/services/platform.service';
import { formatDate } from '@/utils/format';

export default function PlatformProfilePage() {
  const [profile, setProfile] = useState<PlatformProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlatformProfile()
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load profile'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PlatformOnly>
      <ModulePageLayout title="Platform Profile" subtitle="Manage Super Admin identity, security posture, sessions, and preferences.">
        {loading ? (
          <LoadingState variant="page" />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : profile ? (
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <UserCircle className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">{profile.name}</h2>
                    <p className="text-sm text-slate-500">{profile.email}</p>
                    <p className="text-sm text-slate-500">{profile.phone || 'Phone not configured'}</p>
                  </div>
                </div>
                <StatusBadge status={profile.role} />
              </div>
            </section>

            <SummaryCardGrid columns={4}>
              <StatCard title="Password" value="Protected" helper="Managed by authentication service" icon={<KeyRound className="h-5 w-5" />} />
              <StatCard title="2FA" value="Future Ready" helper={profile.twoFactor.status.replace(/_/g, ' ')} icon={<ShieldCheck className="h-5 w-5" />} />
              <StatCard title="Active Sessions" value={profile.activeSessions.length} helper="Recent impersonation/support sessions" icon={<Clock className="h-5 w-5" />} />
              <StatCard title="Notifications" value={profile.notificationPreferences.email ? 'Enabled' : 'Disabled'} helper="Email and platform preferences" icon={<Bell className="h-5 w-5" />} />
            </SummaryCardGrid>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-950">Preferences</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="flex items-center gap-2 text-sm text-slate-600"><Moon className="h-4 w-4" />Theme</span><span className="text-sm font-semibold">{profile.preferences.theme}</span></div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="flex items-center gap-2 text-sm text-slate-600"><Languages className="h-4 w-4" />Language</span><span className="text-sm font-semibold">{profile.preferences.language}</span></div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="flex items-center gap-2 text-sm text-slate-600"><Globe2 className="h-4 w-4" />Timezone</span><span className="text-sm font-semibold">{profile.preferences.timezone}</span></div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-950">Recent Activity Logs</h3>
                <div className="mt-4 space-y-3">
                  {profile.activityLogs.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">No activity logs yet.</p>
                  ) : (
                    profile.activityLogs.map((log, index) => (
                      <div key={log.id || log._id || index} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">{log.action || 'Activity'}</p>
                        <p className="text-xs text-slate-500">{log.entity || 'Platform'} · {log.createdAt ? formatDate(log.createdAt) : '—'}</p>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </ModulePageLayout>
    </PlatformOnly>
  );
}
