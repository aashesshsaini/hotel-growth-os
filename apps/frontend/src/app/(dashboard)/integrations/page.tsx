'use client';

import { Cloud, CreditCard, MessageCircle, Plug } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { PageHeader } from '@/components/PageHeader';

const integrations = [
  { title: 'WhatsApp Business API', value: 'Not connected', icon: <MessageCircle className="h-5 w-5" /> },
  { title: 'Razorpay', value: 'Not connected', icon: <CreditCard className="h-5 w-5" /> },
  { title: 'Cloudinary', value: 'Ready stub', icon: <Cloud className="h-5 w-5" /> },
  { title: 'AWS S3', value: 'Ready stub', icon: <Plug className="h-5 w-5" /> },
];

export default function IntegrationsPage() {
  return (
    <div>
      <PageHeader title="Integrations" subtitle="Connect payment, messaging, upload, and automation providers." />
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-semibold">Backend gap:</span> config keys and service stubs exist, but provider clients and webhook flows are not wired yet.
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {integrations.map((integration) => (
          <DashboardCard key={integration.title} title={integration.title} value={integration.value} icon={integration.icon} />
        ))}
      </div>
    </div>
  );
}
