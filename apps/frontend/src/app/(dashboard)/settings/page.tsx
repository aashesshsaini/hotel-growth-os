'use client';

import { useEffect, useState } from 'react';
import { Bell, Hotel, Shield, SlidersHorizontal } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { LoadingState, ModulePageLayout } from '@/components/layout';
import { getProductSurface } from '@/config/productExperience';
import { useAuth } from '@/hooks/useAuth';
import { getPlatformSettings, type PlatformSettingsResponse } from '@/services/platform.service';

export default function SettingsPage() {
  const { user } = useAuth();
  const isPlatform = getProductSurface(user?.role) === 'platform';
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [loading, setLoading] = useState(isPlatform);

  useEffect(() => {
    if (!isPlatform) return;
    getPlatformSettings().then(setSettings).finally(() => setLoading(false));
  }, [isPlatform]);

  return (
    <ModulePageLayout
      title={isPlatform ? 'Global Settings' : 'Settings'}
      subtitle={
        isPlatform
          ? 'Platform-level controls for tenants, integrations, notifications, and SaaS preferences.'
          : 'Hotel settings, staff permissions, integrations, and notification preferences.'
      }
    >
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Settings restoration pending:</span>{' '}
        {isPlatform
          ? 'global platform settings are separated from hotel operations, but provider setup and audit controls are not complete.'
          : 'hotel settings APIs exist partially, but roles UI, integration settings, and notification settings are not complete.'}
      </div>
      {loading ? (
        <LoadingState variant="cards" count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard title={isPlatform ? 'Branding' : 'Hotel Settings'} value={isPlatform ? settings?.branding.platformName ?? 'Hotel Growth OS' : 'Use Hotel Management'} icon={<Hotel className="h-5 w-5" />} />
          <DashboardCard title={isPlatform ? 'Security' : 'Roles & Permissions'} value={isPlatform ? settings?.security.defaultPermissions ?? 'role_based' : 'Staff module'} icon={<Shield className="h-5 w-5" />} />
          <DashboardCard title="Notification Settings" value={isPlatform ? 'Email + Platform' : 'Pending'} icon={<Bell className="h-5 w-5" />} />
          <DashboardCard title={isPlatform ? 'Maintenance Mode' : 'Hotel Preferences'} value={isPlatform ? String(settings?.security.maintenanceMode ?? false) : 'Pending'} icon={<SlidersHorizontal className="h-5 w-5" />} />
        </div>
      )}

      {isPlatform && settings && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">Platform Configuration</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Email</span><span className="font-semibold">{settings.email.status}</span></div>
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span>WhatsApp</span><span className="font-semibold">{settings.whatsapp.status}</span></div>
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span>CDN</span><span className="font-semibold">{settings.cdn.status}</span></div>
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2"><span>API Keys</span><span className="font-semibold">{settings.apiKeys.status}</span></div>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">Feature Toggles</h2>
            <div className="mt-4 space-y-3 text-sm">
              {Object.entries(settings.featureToggles).map(([key, value]) => (
                <div key={key} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="font-semibold">{value ? 'Enabled' : 'Disabled'}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </ModulePageLayout>
  );
}
