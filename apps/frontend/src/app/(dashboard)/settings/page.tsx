'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Building2, CheckCircle2, Globe2, Hotel, Lock, Mail, MessageCircle, Palette, Save, Settings, Shield, Star } from 'lucide-react';
import { DashboardCard } from '@/components/DashboardCard';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { LoadingState, ModulePageLayout } from '@/components/layout';
import { getProductSurface } from '@/config/productExperience';
import { useAuth } from '@/hooks/useAuth';
import { changeHotelPassword, getHotelSettings, updateHotelSettings, type HotelSettingsPayload } from '@/services/hotels.service';
import { getPlatformSettings, type PlatformSettingsResponse } from '@/services/platform.service';

const sections = [
  { id: 'general', label: 'General', icon: Hotel },
  { id: 'profile', label: 'Business Profile', icon: Building2 },
  { id: 'contact', label: 'Contact Information', icon: Mail },
  { id: 'preferences', label: 'Business Preferences', icon: Globe2 },
  { id: 'reviews', label: 'Review Settings', icon: Star },
  { id: 'communication', label: 'Communication', icon: MessageCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Future Integrations', icon: Settings },
] as const;

const emptySettings: HotelSettingsPayload = {
  general: { name: '', displayName: '', businessType: 'hotel', description: '', establishedYear: '', website: '', businessRegistrationNumber: '' },
  branding: { logo: '', coverImage: '', primaryColor: '#4f46e5', secondaryColor: '#0f172a', tagline: '', description: '', signature: '' },
  contact: { primaryPhone: '', secondaryPhone: '', primaryEmail: '', supportEmail: '', reservationEmail: '', address: '', city: '', state: '', country: 'India', postalCode: '', googleMapUrl: '' },
  preferences: { timezone: 'Asia/Kolkata', currency: 'INR', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', language: 'en', weekStartDay: 'monday', businessHours: { openTime: '09:00', closeTime: '18:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] } },
  review: { googleReviewUrl: '', automationEnabled: true, internalFeedbackEnabled: true, reminderEnabled: true, maxReminderCount: 2, delayMinutes: 120, signature: '' },
  communication: { whatsappBusinessNumber: '', senderName: '', businessEmail: '', replyToEmail: '', emailSignature: '', defaultSenderName: '', enabled: true },
  notifications: { bookings: true, reviews: true, payments: true, maintenance: true, staff: true, marketing: false },
  security: { twoFactorEnabled: false, sessionManagementEnabled: false },
};

function SectionCard({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
      <span>
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </span>
      <span className={`inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <span className={`h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isPlatform = getProductSurface(user?.role) === 'platform';
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsResponse | null>(null);
  const [settings, setSettings] = useState<HotelSettingsPayload>(emptySettings);
  const [snapshot, setSnapshot] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isPlatform) {
          setPlatformSettings(await getPlatformSettings());
        } else {
          const result = await getHotelSettings();
          setSettings(result);
          setSnapshot(JSON.stringify(result));
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isPlatform]);

  const isDirty = useMemo(() => !isPlatform && JSON.stringify(settings) !== snapshot, [isPlatform, settings, snapshot]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const update = <K extends keyof HotelSettingsPayload>(section: K, key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [section]: { ...(prev[section] as Record<string, unknown>), [key]: value } }));
  };

  const updateBusinessHours = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, preferences: { ...prev.preferences, businessHours: { ...prev.preferences.businessHours, [key]: value } } }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!settings.general.name.trim()) next.name = 'Hotel name is required';
    if (!settings.contact.city.trim()) next.city = 'City is required';
    if (!settings.contact.state.trim()) next.state = 'State is required';
    if (!settings.contact.country.trim()) next.country = 'Country is required';
    if (!settings.preferences.timezone.trim()) next.timezone = 'Timezone is required';
    if (!/^[A-Z]{3}$/.test(settings.preferences.currency)) next.currency = 'Currency must be a 3-letter code';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await updateHotelSettings(settings);
      setSettings(saved);
      setSnapshot(JSON.stringify(saved));
      showToast('Hotel settings saved');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    try {
      await changeHotelPassword(passwordForm);
      showToast('Password changed');
      setPasswordOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to change password', 'error');
    }
  };

  if (isPlatform) {
    return (
      <ModulePageLayout title="Global Settings" subtitle="Platform-level controls for tenants, integrations, notifications, and SaaS preferences.">
        {loading ? <LoadingState variant="cards" count={4} /> : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardCard title="Branding" value={platformSettings?.branding.platformName ?? 'Hotel Growth OS'} icon={<Hotel className="h-5 w-5" />} />
              <DashboardCard title="Security" value={platformSettings?.security.defaultPermissions ?? 'role_based'} icon={<Shield className="h-5 w-5" />} />
              <DashboardCard title="Notification Settings" value="Email + Platform" icon={<Bell className="h-5 w-5" />} />
              <DashboardCard title="Maintenance Mode" value={String(platformSettings?.security.maintenanceMode ?? false)} icon={<Settings className="h-5 w-5" />} />
            </div>
          </>
        )}
      </ModulePageLayout>
    );
  }

  return (
    <ModulePageLayout
      title="Hotel Settings"
      subtitle="Central configuration center for hotel identity, branding, communication, reviews, notifications, and security."
      actions={<button type="button" className="btn-primary" disabled={!isDirty || saving} onClick={() => void save()}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Changes'}</button>}
    >
      {loading ? <LoadingState variant="page" /> : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <a key={section.id} href={`#${section.id}`} onClick={() => setActiveSection(section.id)} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold ${activeSection === section.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Icon className="h-4 w-4" />{section.label}
                  </a>
                );
              })}
            </div>
            {isDirty && <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">You have unsaved changes.</div>}
          </aside>

          <div className="space-y-5 pb-24">
            <SectionCard id="general" title="General" subtitle="Core hotel identity used across operations and guest-facing modules.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput label="Hotel Name" value={settings.general.name} error={errors.name} onChange={(e) => update('general', 'name', e.target.value)} required />
                <FormInput label="Hotel Display Name" value={settings.general.displayName ?? ''} onChange={(e) => update('general', 'displayName', e.target.value)} />
                <SelectInput label="Business Type" value={settings.general.businessType ?? 'hotel'} onChange={(e) => update('general', 'businessType', e.target.value)} options={[{ value: 'hotel', label: 'Hotel' }, { value: 'resort', label: 'Resort' }, { value: 'villa', label: 'Villa' }, { value: 'hostel', label: 'Hostel' }, { value: 'serviced_apartment', label: 'Serviced Apartment' }]} />
                <FormInput label="Established Year" type="number" value={settings.general.establishedYear ?? ''} onChange={(e) => update('general', 'establishedYear', e.target.value ? Number(e.target.value) : '')} />
                <FormInput label="Website" value={settings.general.website ?? ''} onChange={(e) => update('general', 'website', e.target.value)} />
                <FormInput label="Business Registration Number" value={settings.general.businessRegistrationNumber ?? ''} onChange={(e) => update('general', 'businessRegistrationNumber', e.target.value)} />
                <div className="md:col-span-2"><TextArea label="Hotel Description" value={settings.general.description ?? ''} onChange={(e) => update('general', 'description', e.target.value)} /></div>
              </div>
            </SectionCard>

            <SectionCard id="profile" title="Business Profile & Branding" subtitle="Brand assets and visual identity shared by current and future modules.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput label="Hotel Logo URL" value={settings.branding.logo ?? ''} onChange={(e) => update('branding', 'logo', e.target.value)} />
                <FormInput label="Cover Image URL" value={settings.branding.coverImage ?? ''} onChange={(e) => update('branding', 'coverImage', e.target.value)} />
                <FormInput label="Primary Color" type="color" value={settings.branding.primaryColor ?? '#4f46e5'} onChange={(e) => update('branding', 'primaryColor', e.target.value)} />
                <FormInput label="Secondary Color" type="color" value={settings.branding.secondaryColor ?? '#0f172a'} onChange={(e) => update('branding', 'secondaryColor', e.target.value)} />
                <FormInput label="Brand Tagline" value={settings.branding.tagline ?? ''} onChange={(e) => update('branding', 'tagline', e.target.value)} />
                <FormInput label="Brand Signature" value={settings.branding.signature ?? ''} onChange={(e) => update('branding', 'signature', e.target.value)} />
                <div className="md:col-span-2"><TextArea label="Brand Description" value={settings.branding.description ?? ''} onChange={(e) => update('branding', 'description', e.target.value)} /></div>
              </div>
            </SectionCard>

            <SectionCard id="contact" title="Contact Information" subtitle="Official phone, email, address, and map details used across communications.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput label="Primary Phone" value={settings.contact.primaryPhone ?? ''} onChange={(e) => update('contact', 'primaryPhone', e.target.value)} />
                <FormInput label="Secondary Phone" value={settings.contact.secondaryPhone ?? ''} onChange={(e) => update('contact', 'secondaryPhone', e.target.value)} />
                <FormInput label="Primary Email" value={settings.contact.primaryEmail ?? ''} onChange={(e) => update('contact', 'primaryEmail', e.target.value)} />
                <FormInput label="Support Email" value={settings.contact.supportEmail ?? ''} onChange={(e) => update('contact', 'supportEmail', e.target.value)} />
                <FormInput label="Reservation Email" value={settings.contact.reservationEmail ?? ''} onChange={(e) => update('contact', 'reservationEmail', e.target.value)} />
                <FormInput label="Google Map URL" value={settings.contact.googleMapUrl ?? ''} onChange={(e) => update('contact', 'googleMapUrl', e.target.value)} />
                <FormInput label="Address" value={settings.contact.address ?? ''} onChange={(e) => update('contact', 'address', e.target.value)} />
                <FormInput label="City" value={settings.contact.city} error={errors.city} onChange={(e) => update('contact', 'city', e.target.value)} required />
                <FormInput label="State" value={settings.contact.state} error={errors.state} onChange={(e) => update('contact', 'state', e.target.value)} required />
                <FormInput label="Country" value={settings.contact.country} error={errors.country} onChange={(e) => update('contact', 'country', e.target.value)} required />
                <FormInput label="Postal Code" value={settings.contact.postalCode ?? ''} onChange={(e) => update('contact', 'postalCode', e.target.value)} />
              </div>
            </SectionCard>

            <SectionCard id="preferences" title="Business Preferences" subtitle="Regional and operating preferences used by bookings, calendar, reports, and automation.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput label="Timezone" value={settings.preferences.timezone} error={errors.timezone} onChange={(e) => update('preferences', 'timezone', e.target.value)} required />
                <FormInput label="Currency" value={settings.preferences.currency} error={errors.currency} onChange={(e) => update('preferences', 'currency', e.target.value.toUpperCase())} required />
                <SelectInput label="Date Format" value={settings.preferences.dateFormat} onChange={(e) => update('preferences', 'dateFormat', e.target.value)} options={[{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }, { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }, { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }]} />
                <SelectInput label="Time Format" value={settings.preferences.timeFormat} onChange={(e) => update('preferences', 'timeFormat', e.target.value)} options={[{ value: '24h', label: '24 Hour' }, { value: '12h', label: '12 Hour' }]} />
                <FormInput label="Language" value={settings.preferences.language} onChange={(e) => update('preferences', 'language', e.target.value)} />
                <SelectInput label="Week Start Day" value={settings.preferences.weekStartDay} onChange={(e) => update('preferences', 'weekStartDay', e.target.value)} options={[{ value: 'monday', label: 'Monday' }, { value: 'sunday', label: 'Sunday' }]} />
                <FormInput label="Business Opens" type="time" value={settings.preferences.businessHours.openTime ?? ''} onChange={(e) => updateBusinessHours('openTime', e.target.value)} />
                <FormInput label="Business Closes" type="time" value={settings.preferences.businessHours.closeTime ?? ''} onChange={(e) => updateBusinessHours('closeTime', e.target.value)} />
              </div>
            </SectionCard>

            <SectionCard id="reviews" title="Review Settings" subtitle="Single source of truth for Review Growth automation preferences.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput label="Google Review URL" value={settings.review.googleReviewUrl ?? ''} onChange={(e) => update('review', 'googleReviewUrl', e.target.value)} />
                <FormInput label="Review Delay (minutes)" type="number" value={settings.review.delayMinutes} onChange={(e) => update('review', 'delayMinutes', Number(e.target.value))} />
                <FormInput label="Maximum Reminder Count" type="number" value={settings.review.maxReminderCount} onChange={(e) => update('review', 'maxReminderCount', Number(e.target.value))} />
                <FormInput label="Review Signature" value={settings.review.signature ?? ''} onChange={(e) => update('review', 'signature', e.target.value)} />
                <Toggle label="Review Automation Enabled" checked={settings.review.automationEnabled} onChange={(value) => update('review', 'automationEnabled', value)} />
                <Toggle label="Internal Feedback Enabled" checked={settings.review.internalFeedbackEnabled} onChange={(value) => update('review', 'internalFeedbackEnabled', value)} />
                <Toggle label="Review Reminder Enabled" checked={settings.review.reminderEnabled} onChange={(value) => update('review', 'reminderEnabled', value)} />
              </div>
            </SectionCard>

            <SectionCard id="communication" title="Communication Settings" subtitle="Configuration-only values for future Communication Engine provider connections.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput label="WhatsApp Business Number" value={settings.communication.whatsappBusinessNumber ?? ''} onChange={(e) => update('communication', 'whatsappBusinessNumber', e.target.value)} />
                <FormInput label="Sender Name" value={settings.communication.senderName ?? ''} onChange={(e) => update('communication', 'senderName', e.target.value)} />
                <FormInput label="Business Email" value={settings.communication.businessEmail ?? ''} onChange={(e) => update('communication', 'businessEmail', e.target.value)} />
                <FormInput label="Reply-To Email" value={settings.communication.replyToEmail ?? ''} onChange={(e) => update('communication', 'replyToEmail', e.target.value)} />
                <FormInput label="Default Sender Name" value={settings.communication.defaultSenderName ?? ''} onChange={(e) => update('communication', 'defaultSenderName', e.target.value)} />
                <Toggle label="Communication Enabled" checked={settings.communication.enabled} onChange={(value) => update('communication', 'enabled', value)} />
                <div className="md:col-span-2"><TextArea label="Email Signature" value={settings.communication.emailSignature ?? ''} onChange={(e) => update('communication', 'emailSignature', e.target.value)} /></div>
              </div>
            </SectionCard>

            <SectionCard id="notifications" title="Notification Preferences" subtitle="Control which operational events generate hotel notifications.">
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(settings.notifications).map(([key, value]) => (
                  <Toggle key={key} label={`${key.charAt(0).toUpperCase()}${key.slice(1)} Notifications`} checked={value} onChange={(checked) => update('notifications', key, checked)} />
                ))}
              </div>
            </SectionCard>

            <SectionCard id="security" title="Security" subtitle="Password management and future-ready session and 2FA controls.">
              <div className="grid gap-4 md:grid-cols-2">
                <button type="button" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left hover:bg-slate-100" onClick={() => setPasswordOpen(true)}>
                  <Lock className="mb-2 h-5 w-5 text-slate-600" />
                  <span className="block font-semibold text-slate-950">Change Password</span>
                  <span className="text-sm text-slate-500">Update your login password securely.</span>
                </button>
                <Toggle label="Two-Factor Authentication" checked={settings.security?.twoFactorEnabled ?? false} onChange={(value) => update('security', 'twoFactorEnabled', value)} hint="Placeholder for future 2FA setup." />
                <Toggle label="Login Sessions" checked={settings.security?.sessionManagementEnabled ?? false} onChange={(value) => update('security', 'sessionManagementEnabled', value)} hint="Placeholder for session management." />
              </div>
            </SectionCard>

            <SectionCard id="integrations" title="Future Integrations" subtitle="Configuration placeholders reserved for provider connections in upcoming phases.">
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(settings.futureIntegrations ?? {}).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <CheckCircle2 className="mb-2 h-5 w-5 text-slate-500" />
                    <p className="font-semibold text-slate-900">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-sm text-slate-500">{value}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {!loading && !isPlatform && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
            <p className="text-sm text-slate-600">{isDirty ? 'Unsaved changes detected' : 'All changes saved'}</p>
            <button type="button" className="btn-primary" disabled={!isDirty || saving} onClick={() => void save()}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      )}

      <Modal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change Password" size="md" footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => setPasswordOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => void savePassword()}>Update Password</button>
        </div>
      }>
        <div className="space-y-4">
          <FormInput label="Current Password" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))} />
          <FormInput label="New Password" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))} />
        </div>
      </Modal>
    </ModulePageLayout>
  );
}
