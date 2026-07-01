'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Cloud, CreditCard, Mail, MessageCircle, Plug, RefreshCcw, Settings, Star, Trash2 } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { FormInput, SelectInput } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { LoadingState, ModulePageLayout } from '@/components/layout';
import { getProductSurface } from '@/config/productExperience';
import { useAuth } from '@/hooks/useAuth';
import {
  disconnectHotelIntegration,
  getHotelIntegrations,
  testHotelIntegration,
  updateEmailIntegration,
  updateGoogleReviewIntegration,
  updateWhatsAppIntegration,
  type EmailIntegrationPayload,
  type GoogleReviewIntegrationPayload,
  type HotelIntegrationSettings,
  type IntegrationType,
  type WhatsAppIntegrationPayload,
} from '@/services/integrations.service';
import { getPlatformSettings, type PlatformSettingsResponse } from '@/services/platform.service';
import { formatDate } from '@/utils/format';

const emptyWhatsApp: WhatsAppIntegrationPayload = { businessName: '', phoneNumber: '', phoneNumberId: '', businessAccountId: '', permanentAccessToken: '', webhookVerifyToken: '', webhookSecret: '' };
const emptyEmail: EmailIntegrationPayload = { smtpHost: '', smtpPort: 587, username: '', password: '', encryption: 'tls', senderName: '', senderEmail: '', replyToEmail: '' };
const emptyGoogle: GoogleReviewIntegrationPayload = { googleReviewUrl: '', googleBusinessName: '', googlePlaceId: '', reviewButtonLabel: 'Review us on Google', automationEnabled: true };

function IntegrationCard({
  type,
  title,
  description,
  icon,
  status,
  lastTestedAt,
  lastUpdatedAt,
  onConfigure,
  onTest,
  onDisconnect,
}: {
  type: IntegrationType;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: string;
  lastTestedAt?: string;
  lastUpdatedAt?: string;
  onConfigure: () => void;
  onTest: () => void;
  onDisconnect: () => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">{icon}</div>
          <div>
            <h2 className="font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 px-3 py-2"><span className="text-slate-500">Last test</span><p className="font-semibold text-slate-900">{lastTestedAt ? formatDate(lastTestedAt) : 'Never'}</p></div>
        <div className="rounded-2xl bg-slate-50 px-3 py-2"><span className="text-slate-500">Last updated</span><p className="font-semibold text-slate-900">{lastUpdatedAt ? formatDate(lastUpdatedAt) : 'Not updated'}</p></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={onConfigure}><Settings className="mr-2 h-4 w-4" />Settings</button>
        <button type="button" className="btn-secondary" onClick={onTest}><RefreshCcw className="mr-2 h-4 w-4" />Test</button>
        <button type="button" className="btn-secondary text-red-700 hover:bg-red-50" disabled={status === 'disconnected'} onClick={onDisconnect}><Trash2 className="mr-2 h-4 w-4" />Disconnect</button>
      </div>
    </section>
  );
}

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isPlatform = getProductSurface(user?.role) === 'platform';
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsResponse | null>(null);
  const [settings, setSettings] = useState<HotelIntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<IntegrationType | null>(null);
  const [disconnecting, setDisconnecting] = useState<IntegrationType | null>(null);
  const [saving, setSaving] = useState(false);
  const [whatsappForm, setWhatsAppForm] = useState<WhatsAppIntegrationPayload>(emptyWhatsApp);
  const [emailForm, setEmailForm] = useState<EmailIntegrationPayload>(emptyEmail);
  const [googleForm, setGoogleForm] = useState<GoogleReviewIntegrationPayload>(emptyGoogle);

  const load = async () => {
    setLoading(true);
    try {
      if (isPlatform) setPlatformSettings(await getPlatformSettings());
      else {
        const data = await getHotelIntegrations();
        setSettings(data);
        setWhatsAppForm({ ...emptyWhatsApp, businessName: data.whatsapp.businessName, phoneNumber: data.whatsapp.phoneNumber, phoneNumberId: data.whatsapp.phoneNumberId, businessAccountId: data.whatsapp.businessAccountId });
        setEmailForm({ ...emptyEmail, smtpHost: data.email.smtpHost, smtpPort: data.email.smtpPort, username: data.email.username, encryption: data.email.encryption, senderName: data.email.senderName, senderEmail: data.email.senderEmail, replyToEmail: data.email.replyToEmail });
        setGoogleForm({ googleReviewUrl: data.googleReview.googleReviewUrl, googleBusinessName: data.googleReview.googleBusinessName, googlePlaceId: data.googleReview.googlePlaceId ?? '', reviewButtonLabel: data.googleReview.reviewButtonLabel, automationEnabled: data.googleReview.automationEnabled });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [isPlatform]);

  const cards = useMemo(() => settings ? [
    { type: 'whatsapp' as const, title: 'Meta WhatsApp Cloud API', description: 'Connect Meta WhatsApp credentials for future guest communication and marketing automation.', icon: <MessageCircle className="h-5 w-5" />, health: settings.whatsapp.health },
    { type: 'email' as const, title: 'SMTP Email', description: 'Configure SMTP sender details for future transactional and marketing email delivery.', icon: <Mail className="h-5 w-5" />, health: settings.email.health },
    { type: 'googleReview' as const, title: 'Google Review', description: 'Configure Google review destination and button label for Review Growth journeys.', icon: <Star className="h-5 w-5" />, health: settings.googleReview.health },
  ] : [], [settings]);

  const test = async (type: IntegrationType) => {
    try {
      const result = await testHotelIntegration(type);
      showToast(result.message, result.success ? 'success' : 'error');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Connection test failed', 'error');
    }
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const updated = active === 'whatsapp' ? await updateWhatsAppIntegration(whatsappForm) : active === 'email' ? await updateEmailIntegration(emailForm) : await updateGoogleReviewIntegration(googleForm);
      setSettings(updated);
      setActive(null);
      showToast('Integration saved');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save integration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    if (!disconnecting) return;
    try {
      setSettings(await disconnectHotelIntegration(disconnecting));
      showToast('Integration disconnected');
      setDisconnecting(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to disconnect integration', 'error');
    }
  };

  if (isPlatform) {
    const integrations = [
      { title: 'WhatsApp Business API', value: platformSettings?.whatsapp.status ?? 'not_configured', icon: <MessageCircle className="h-5 w-5" /> },
      { title: 'Razorpay', value: 'Not connected', icon: <CreditCard className="h-5 w-5" /> },
      { title: 'Cloudinary', value: platformSettings?.storage.cloudinary ?? 'not_configured', icon: <Cloud className="h-5 w-5" /> },
      { title: 'AWS S3', value: platformSettings?.storage.s3 ?? 'not_configured', icon: <Plug className="h-5 w-5" /> },
    ];
    return (
      <ModulePageLayout title="Platform Integrations" subtitle="Manage global provider readiness and SaaS-level integration configuration.">
        {loading ? <LoadingState variant="cards" count={4} /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{integrations.map((integration) => <DashboardCard key={integration.title} title={integration.title} value={integration.value} icon={integration.icon} />)}</div>}
      </ModulePageLayout>
    );
  }

  return (
    <ModulePageLayout title="Hotel Integrations" subtitle="Securely connect marketing, communication, and review growth services for this hotel.">
      {loading || !settings ? <LoadingState variant="page" /> : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            Credentials are encrypted at rest and are never returned in plain text. Saved secrets can only be replaced.
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            {cards.map((card) => (
              <IntegrationCard key={card.type} type={card.type} title={card.title} description={card.description} icon={card.icon} status={card.health.status} lastTestedAt={card.health.lastTestedAt} lastUpdatedAt={card.health.lastUpdatedAt} onConfigure={() => setActive(card.type)} onTest={() => void test(card.type)} onDisconnect={() => setDisconnecting(card.type)} />
            ))}
          </div>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">Security & Health</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {cards.map((card) => (
                <div key={card.type} className="rounded-2xl bg-slate-50 p-4">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-slate-500" />
                  <p className="font-semibold text-slate-900">{card.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{card.health.lastError || 'No provider errors exposed.'}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <Modal isOpen={!!active} onClose={() => setActive(null)} title={active === 'whatsapp' ? 'WhatsApp Business Settings' : active === 'email' ? 'SMTP Email Settings' : 'Google Review Settings'} size="lg" footer={
        <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setActive(null)}>Cancel</button><button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : 'Save Integration'}</button></div>
      }>
        {active === 'whatsapp' && (
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Business Name" value={whatsappForm.businessName} onChange={(e) => setWhatsAppForm((p) => ({ ...p, businessName: e.target.value }))} />
            <FormInput label="Phone Number" value={whatsappForm.phoneNumber} onChange={(e) => setWhatsAppForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
            <FormInput label="Phone Number ID" value={whatsappForm.phoneNumberId} onChange={(e) => setWhatsAppForm((p) => ({ ...p, phoneNumberId: e.target.value }))} />
            <FormInput label="Business Account ID" value={whatsappForm.businessAccountId} onChange={(e) => setWhatsAppForm((p) => ({ ...p, businessAccountId: e.target.value }))} />
            <FormInput label={`Permanent Access Token ${settings?.whatsapp.permanentAccessTokenMasked ? `(${settings.whatsapp.permanentAccessTokenMasked})` : ''}`} type="password" value={whatsappForm.permanentAccessToken ?? ''} onChange={(e) => setWhatsAppForm((p) => ({ ...p, permanentAccessToken: e.target.value }))} hint="Leave blank to keep existing token." />
            <FormInput label={`Webhook Verify Token ${settings?.whatsapp.webhookVerifyTokenMasked ? `(${settings.whatsapp.webhookVerifyTokenMasked})` : ''}`} type="password" value={whatsappForm.webhookVerifyToken ?? ''} onChange={(e) => setWhatsAppForm((p) => ({ ...p, webhookVerifyToken: e.target.value }))} hint="Leave blank to keep existing token." />
            <FormInput label={`Webhook Secret ${settings?.whatsapp.webhookSecretMasked ? `(${settings.whatsapp.webhookSecretMasked})` : ''}`} type="password" value={whatsappForm.webhookSecret ?? ''} onChange={(e) => setWhatsAppForm((p) => ({ ...p, webhookSecret: e.target.value }))} hint="Leave blank to keep existing secret." />
          </div>
        )}
        {active === 'email' && (
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="SMTP Host" value={emailForm.smtpHost} onChange={(e) => setEmailForm((p) => ({ ...p, smtpHost: e.target.value }))} />
            <FormInput label="SMTP Port" type="number" value={emailForm.smtpPort} onChange={(e) => setEmailForm((p) => ({ ...p, smtpPort: Number(e.target.value) }))} />
            <FormInput label="Username" value={emailForm.username} onChange={(e) => setEmailForm((p) => ({ ...p, username: e.target.value }))} />
            <FormInput label={`Password ${settings?.email.passwordMasked ? `(${settings.email.passwordMasked})` : ''}`} type="password" value={emailForm.password ?? ''} onChange={(e) => setEmailForm((p) => ({ ...p, password: e.target.value }))} hint="Leave blank to keep existing password." />
            <SelectInput label="Encryption" value={emailForm.encryption} onChange={(e) => setEmailForm((p) => ({ ...p, encryption: e.target.value as EmailIntegrationPayload['encryption'] }))} options={[{ value: 'none', label: 'None' }, { value: 'ssl', label: 'SSL' }, { value: 'tls', label: 'TLS' }, { value: 'starttls', label: 'STARTTLS' }]} />
            <FormInput label="Sender Name" value={emailForm.senderName} onChange={(e) => setEmailForm((p) => ({ ...p, senderName: e.target.value }))} />
            <FormInput label="Sender Email" value={emailForm.senderEmail} onChange={(e) => setEmailForm((p) => ({ ...p, senderEmail: e.target.value }))} />
            <FormInput label="Reply-To Email" value={emailForm.replyToEmail ?? ''} onChange={(e) => setEmailForm((p) => ({ ...p, replyToEmail: e.target.value }))} />
          </div>
        )}
        {active === 'googleReview' && (
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Google Review URL" value={googleForm.googleReviewUrl} onChange={(e) => setGoogleForm((p) => ({ ...p, googleReviewUrl: e.target.value }))} />
            <FormInput label="Google Business Name" value={googleForm.googleBusinessName} onChange={(e) => setGoogleForm((p) => ({ ...p, googleBusinessName: e.target.value }))} />
            <FormInput label="Google Place ID" value={googleForm.googlePlaceId ?? ''} onChange={(e) => setGoogleForm((p) => ({ ...p, googlePlaceId: e.target.value }))} />
            <FormInput label="Review Button Label" value={googleForm.reviewButtonLabel} onChange={(e) => setGoogleForm((p) => ({ ...p, reviewButtonLabel: e.target.value }))} />
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800"><input type="checkbox" checked={googleForm.automationEnabled} onChange={(e) => setGoogleForm((p) => ({ ...p, automationEnabled: e.target.checked }))} />Enable Review Automation</label>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!disconnecting} onClose={() => setDisconnecting(null)} title="Disconnect Integration" size="md" footer={
        <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setDisconnecting(null)}>Cancel</button><button type="button" className="btn-primary bg-red-600 hover:bg-red-700" onClick={() => void disconnect()}>Disconnect</button></div>
      }>
        <p className="text-sm text-slate-600">This removes saved configuration and encrypted credentials for this integration. Future provider actions will remain disabled until reconnected.</p>
      </Modal>
    </ModulePageLayout>
  );
}
