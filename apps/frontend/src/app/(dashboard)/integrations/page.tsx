'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cloud, CreditCard, MessageCircle, Plug } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { LoadingState, ModulePageLayout } from '@/components/layout';
import { getProductSurface } from '@/config/productExperience';
import { useAuth } from '@/hooks/useAuth';
import { getPlatformSettings, type PlatformSettingsResponse } from '@/services/platform.service';

export default function IntegrationsPage() {
  const { user } = useAuth();
  const isPlatform = getProductSurface(user?.role) === 'platform';
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [loading, setLoading] = useState(isPlatform);

  useEffect(() => {
    if (!isPlatform) return;
    getPlatformSettings().then(setSettings).finally(() => setLoading(false));
  }, [isPlatform]);

  const integrations = useMemo(
    () => [
      { title: 'WhatsApp Business API', value: isPlatform ? settings?.whatsapp.status ?? 'not_configured' : 'Not connected', icon: <MessageCircle className="h-5 w-5" /> },
      { title: 'Razorpay', value: 'Not connected', icon: <CreditCard className="h-5 w-5" /> },
      { title: 'Cloudinary', value: isPlatform ? settings?.storage.cloudinary ?? 'not_configured' : 'Ready stub', icon: <Cloud className="h-5 w-5" /> },
      { title: 'AWS S3', value: isPlatform ? settings?.storage.s3 ?? 'not_configured' : 'Ready stub', icon: <Plug className="h-5 w-5" /> },
    ],
    [isPlatform, settings]
  );

  return (
    <ModulePageLayout
      title={isPlatform ? 'Platform Integrations' : 'Hotel Integrations'}
      subtitle={
        isPlatform
          ? 'Manage global provider readiness and SaaS-level integration configuration.'
          : 'Connect hotel payment, messaging, upload, and automation providers.'
      }
    >
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Backend gap:</span>{' '}
        {isPlatform
          ? 'global config keys and service stubs exist, but provider clients, health checks, and webhook flows are not wired yet.'
          : 'hotel integration config keys and service stubs exist, but provider clients and webhook flows are not wired yet.'}
      </div>
      {loading ? (
        <LoadingState variant="cards" count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {integrations.map((integration) => (
            <DashboardCard key={integration.title} title={integration.title} value={integration.value} icon={integration.icon} />
          ))}
        </div>
      )}
    </ModulePageLayout>
  );
}
