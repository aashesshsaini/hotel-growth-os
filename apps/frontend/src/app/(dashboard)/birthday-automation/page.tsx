'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarHeart, Copy, Download, Eye, Gift, LineChart, Pause, Play, Plus, RefreshCw, Send, Settings, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { capitalize, formatDate, formatDateTime } from '@/utils/format';
import {
  cancelOccasionCampaign,
  createOccasionCampaign,
  createOccasionTemplate,
  deleteOccasionTemplate,
  duplicateOccasionTemplate,
  entityId,
  exportOccasionHistory,
  getOccasionAnalytics,
  getOccasionCampaigns,
  getOccasionDashboard,
  getOccasionHistory,
  getOccasionSettings,
  getOccasionTemplates,
  pauseOccasionAutomation,
  previewOccasionRecipients,
  previewOccasionTemplate,
  retryFailedOccasionMessages,
  resumeOccasionAutomation,
  scanOccasionAutomation,
  sendOccasionManual,
  sendOccasionTestMessage,
  updateOccasionSettings,
  updateOccasionTemplate,
  type OccasionAnalytics,
  type OccasionCampaign,
  type OccasionChannel,
  type OccasionDashboard,
  type OccasionDelivery,
  type OccasionSettings,
  type OccasionTemplate,
} from '@/services/birthdayAutomation.service';

const channelOptions = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
];

const occasionOptions = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
];

const defaultSettings: OccasionSettings = {
  birthdayEnabled: true,
  anniversaryEnabled: true,
  daysBeforeBirthday: 0,
  daysBeforeAnniversary: 0,
  sendTime: '10:00',
  timezone: 'Asia/Kolkata',
  preferredChannel: 'whatsapp',
  fallbackChannel: 'email',
  signature: '',
  reminderEnabled: true,
  retryEnabled: true,
  isPaused: false,
};

const templateDefaults: Partial<OccasionTemplate> = {
  name: '',
  occasion: 'birthday',
  channel: 'whatsapp',
  subject: '',
  body: 'Happy Birthday {{Guest Name}}! Wishing you a wonderful day from {{Hotel Name}}. {{Signature}}',
  isActive: true,
};

function Badge({ value }: { value: string }) {
  const tone = ['sent', 'delivered', 'opened', 'healthy', 'completed'].includes(value)
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : ['failed', 'cancelled', 'disabled'].includes(value)
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : ['paused', 'scheduled', 'pending', 'queued'].includes(value)
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-slate-50 text-slate-700 ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(value.replace(/_/g, ' '))}</span>;
}

function StatCard({ title, value, helper, icon: Icon }: { title: string; value: string | number; helper?: string; icon: typeof Gift }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <Icon className="h-5 w-5 text-indigo-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function BirthdayAutomationPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState<OccasionDashboard | null>(null);
  const [analytics, setAnalytics] = useState<OccasionAnalytics | null>(null);
  const [settings, setSettings] = useState<OccasionSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<Partial<OccasionTemplate>>(templateDefaults);
  const [editingTemplate, setEditingTemplate] = useState<OccasionTemplate | null>(null);
  const [templatePreview, setTemplatePreview] = useState<{ subject: string; body: string; variables: string[] } | null>(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ name: '', occasion: 'birthday', channel: 'whatsapp', scheduledAt: '', sendNow: true });
  const [recipientPreview, setRecipientPreview] = useState<{ total: number; sample: Array<{ id: string; name: string; contact: string }> } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OccasionCampaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OccasionTemplate | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testForm, setTestForm] = useState({ occasion: 'birthday', channel: 'whatsapp', recipient: '' });
  const [isSaving, setIsSaving] = useState(false);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextDashboard, nextSettings, nextAnalytics] = await Promise.all([
        getOccasionDashboard(),
        getOccasionSettings(),
        getOccasionAnalytics({ months: 6 }),
      ]);
      setDashboard(nextDashboard);
      setSettings(nextSettings);
      setAnalytics(nextAnalytics);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const templateFiltersRef = useRef({});
  const templatesQuery = usePaginatedQuery<OccasionTemplate>({ fetchFn: (params) => getOccasionTemplates({ ...params, ...templateFiltersRef.current }), initialParams: { limit: 10 } });
  const campaignsQuery = usePaginatedQuery<OccasionCampaign>({ fetchFn: getOccasionCampaigns, initialParams: { limit: 10 } });
  const historyQuery = usePaginatedQuery<OccasionDelivery>({ fetchFn: getOccasionHistory, initialParams: { limit: 10 } });

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      setSettings(await updateOccasionSettings(settings));
      showToast('Automation settings saved', 'success');
      await loadOverview();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const quickAction = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      showToast(message, 'success');
      await Promise.all([loadOverview(), historyQuery.refresh(), campaignsQuery.refresh()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action failed', 'error');
    }
  };

  const openTemplate = (template?: OccasionTemplate) => {
    setEditingTemplate(template || null);
    setTemplateForm(template || templateDefaults);
    setTemplatePreview(null);
    setTemplateModalOpen(true);
  };

  const saveTemplate = async () => {
    setIsSaving(true);
    try {
      if (editingTemplate) {
        await updateOccasionTemplate(entityId(editingTemplate), templateForm);
      } else {
        await createOccasionTemplate(templateForm);
      }
      showToast(editingTemplate ? 'Template updated' : 'Template created', 'success');
      setTemplateModalOpen(false);
      await templatesQuery.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save template', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveCampaign = async () => {
    setIsSaving(true);
    try {
      await createOccasionCampaign({
        ...campaignForm,
        scheduledAt: campaignForm.sendNow || !campaignForm.scheduledAt ? undefined : campaignForm.scheduledAt,
      });
      showToast('Campaign created', 'success');
      setCampaignModalOpen(false);
      await Promise.all([campaignsQuery.refresh(), historyQuery.refresh(), loadOverview()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create campaign', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => [
    { title: "Today's Birthdays", value: dashboard?.todayBirthdays ?? 0, helper: 'Eligible consented guests', icon: Gift },
    { title: "Today's Anniversaries", value: dashboard?.todayAnniversaries ?? 0, helper: 'Matching guest profiles', icon: CalendarHeart },
    { title: 'Messages Sent', value: dashboard?.messagesSent ?? 0, helper: 'Delivered through automation logs', icon: Send },
    { title: 'Automation Health', value: dashboard?.automationHealth || 'Loading', helper: `${dashboard?.pendingMessages ?? 0} pending, ${dashboard?.failedMessages ?? 0} failed`, icon: Settings },
  ], [dashboard]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Growth Automation</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Birthday & Anniversary Automation</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Send personalized occasion greetings, track delivery, run manual campaigns, and monitor automation health without sending real provider messages during setup.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setTestOpen(true)}><Send className="h-4 w-4" /> Send test</button>
          <button className="btn-secondary" onClick={() => void quickAction(scanOccasionAutomation, 'Automation scan queued')}><RefreshCw className="h-4 w-4" /> Scan now</button>
          <button className="btn-secondary" onClick={() => void quickAction(exportOccasionHistory, 'History export generated')}><Download className="h-4 w-4" /> Export</button>
          <button className="btn-primary" onClick={() => setCampaignModalOpen(true)}><Plus className="h-4 w-4" /> Manual campaign</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
        {['dashboard', 'settings', 'templates', 'campaigns', 'history', 'analytics'].map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
            {capitalize(tab)}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Upcoming occasion queue</h2>
              <Badge value={dashboard?.automationHealth || 'loading'} />
            </div>
            {isLoading ? (
              <div className="mt-4 space-y-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : dashboard?.todayGuests?.length ? (
              <div className="mt-4 divide-y divide-slate-100">
                {dashboard.todayGuests.map((guest) => (
                  <div key={guest.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-slate-900">{guest.name}</p>
                      <p className="text-sm text-slate-500">{guest.contact}</p>
                    </div>
                    <Badge value="queued-ready" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-slate-50 p-6 text-sm text-slate-600">No birthday or anniversary matches for today.</div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Quick actions</h2>
            <div className="mt-4 grid gap-3">
              <button className="btn-secondary justify-start" onClick={() => void quickAction(settings.isPaused ? resumeOccasionAutomation : pauseOccasionAutomation, settings.isPaused ? 'Automation resumed' : 'Automation paused')}>
                {settings.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {settings.isPaused ? 'Resume automation' : 'Pause automation'}
              </button>
              <button className="btn-secondary justify-start" onClick={() => void quickAction(retryFailedOccasionMessages, 'Failed messages queued for retry')}><RefreshCw className="h-4 w-4" /> Retry failed</button>
              <button className="btn-secondary justify-start" onClick={() => openTemplate()}><Plus className="h-4 w-4" /> Create template</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SelectInput label="Birthday automation" value={String(settings.birthdayEnabled)} onChange={(e) => setSettings({ ...settings, birthdayEnabled: e.target.value === 'true' })} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} />
            <SelectInput label="Anniversary automation" value={String(settings.anniversaryEnabled)} onChange={(e) => setSettings({ ...settings, anniversaryEnabled: e.target.value === 'true' })} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} />
            <FormInput label="Days before birthday" type="number" min={0} max={30} value={settings.daysBeforeBirthday} onChange={(e) => setSettings({ ...settings, daysBeforeBirthday: Number(e.target.value) })} />
            <FormInput label="Days before anniversary" type="number" min={0} max={30} value={settings.daysBeforeAnniversary} onChange={(e) => setSettings({ ...settings, daysBeforeAnniversary: Number(e.target.value) })} />
            <FormInput label="Send time" type="time" value={settings.sendTime} onChange={(e) => setSettings({ ...settings, sendTime: e.target.value })} />
            <FormInput label="Timezone" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} />
            <SelectInput label="Preferred channel" value={settings.preferredChannel} onChange={(e) => setSettings({ ...settings, preferredChannel: e.target.value as OccasionChannel })} options={channelOptions} />
            <SelectInput label="Fallback channel" value={settings.fallbackChannel} onChange={(e) => setSettings({ ...settings, fallbackChannel: e.target.value as OccasionSettings['fallbackChannel'] })} options={[...channelOptions, { value: 'none', label: 'None' }]} />
            <SelectInput label="Retry failed sends" value={String(settings.retryEnabled)} onChange={(e) => setSettings({ ...settings, retryEnabled: e.target.value === 'true' })} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} />
          </div>
          <div className="mt-4">
            <TextArea label="Signature" value={settings.signature || ''} onChange={(e) => setSettings({ ...settings, signature: e.target.value })} />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn-primary" disabled={isSaving} onClick={() => void saveSettings()}>Save settings</button>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <DataTable
          columns={[
            { key: 'name', header: 'Template' },
            { key: 'occasion', header: 'Occasion', render: (row) => <Badge value={row.occasion} /> },
            { key: 'channel', header: 'Channel', render: (row) => capitalize(row.channel) },
            { key: 'isActive', header: 'Status', render: (row) => <Badge value={row.isActive ? 'active' : 'inactive'} /> },
            { key: 'actions', header: 'Actions', render: (row) => (
              <div className="flex gap-2">
                <button className="btn-ghost btn-sm" onClick={() => openTemplate(row)}><Eye className="h-4 w-4" /></button>
                <button className="btn-ghost btn-sm" onClick={() => void quickAction(() => duplicateOccasionTemplate(entityId(row)), 'Template duplicated').then(templatesQuery.refresh)}><Copy className="h-4 w-4" /></button>
                <button className="btn-ghost btn-sm text-rose-600" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /></button>
              </div>
            ) },
          ]}
          data={templatesQuery.data}
          isLoading={templatesQuery.isLoading}
          error={templatesQuery.error}
          onSearch={templatesQuery.setSearch}
          filters={<button className="btn-primary" onClick={() => openTemplate()}><Plus className="h-4 w-4" /> New template</button>}
          rowKey={(row) => entityId(row)}
          pagination={{ page: templatesQuery.pagination.page, totalPages: templatesQuery.pagination.totalPages, total: templatesQuery.pagination.total, onPageChange: templatesQuery.setPage }}
          emptyTitle="No occasion templates"
          emptyDescription="Create birthday and anniversary templates with guest personalization variables."
        />
      )}

      {activeTab === 'campaigns' && (
        <DataTable
          columns={[
            { key: 'name', header: 'Campaign' },
            { key: 'occasion', header: 'Occasion', render: (row) => <Badge value={row.occasion} /> },
            { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> },
            { key: 'recipientCount', header: 'Recipients' },
            { key: 'scheduledAt', header: 'Schedule', render: (row) => row.scheduledAt ? formatDateTime(row.scheduledAt) : 'Immediate' },
            { key: 'actions', header: 'Actions', render: (row) => row.status === 'scheduled' ? <button className="btn-ghost btn-sm text-rose-600" onClick={() => setCancelTarget(row)}>Cancel</button> : '—' },
          ]}
          data={campaignsQuery.data}
          isLoading={campaignsQuery.isLoading}
          error={campaignsQuery.error}
          onSearch={campaignsQuery.setSearch}
          filters={<button className="btn-primary" onClick={() => setCampaignModalOpen(true)}><Plus className="h-4 w-4" /> Campaign</button>}
          rowKey={(row) => entityId(row)}
          pagination={{ page: campaignsQuery.pagination.page, totalPages: campaignsQuery.pagination.totalPages, total: campaignsQuery.pagination.total, onPageChange: campaignsQuery.setPage }}
          emptyTitle="No manual campaigns"
          emptyDescription="Schedule or send birthday and anniversary wishes to eligible guests."
        />
      )}

      {activeTab === 'history' && (
        <DataTable
          columns={[
            { key: 'recipientName', header: 'Guest' },
            { key: 'occasion', header: 'Occasion', render: (row) => <Badge value={row.occasion} /> },
            { key: 'channel', header: 'Channel', render: (row) => capitalize(row.channel) },
            { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> },
            { key: 'sentAt', header: 'Sent time', render: (row) => row.sentAt ? formatDateTime(row.sentAt) : 'Pending' },
            { key: 'retryCount', header: 'Retries' },
            { key: 'failedReason', header: 'Failure', render: (row) => row.failedReason || '—' },
          ]}
          data={historyQuery.data}
          isLoading={historyQuery.isLoading}
          error={historyQuery.error}
          onSearch={historyQuery.setSearch}
          rowKey={(row) => entityId(row)}
          pagination={{ page: historyQuery.pagination.page, totalPages: historyQuery.pagination.totalPages, total: historyQuery.pagination.total, onPageChange: historyQuery.setPage }}
          emptyTitle="No delivery history"
          emptyDescription="Delivery logs appear here after automated or manual sends are queued."
        />
      )}

      {activeTab === 'analytics' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <StatCard title="Birthday messages sent" value={analytics?.birthdayMessagesSent ?? 0} icon={Gift} />
          <StatCard title="Anniversary messages sent" value={analytics?.anniversaryMessagesSent ?? 0} icon={CalendarHeart} />
          <StatCard title="Delivery rate" value={`${analytics?.deliveryRate ?? 0}%`} icon={LineChart} />
          <StatCard title="Failure rate" value={`${analytics?.failureRate ?? 0}%`} icon={RefreshCw} />
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-950">Monthly trend</h2>
            <div className="mt-4 space-y-3">
              {(analytics?.monthlyTrend || []).map((item) => (
                <div key={`${item.month}-${item.occasion}`}>
                  <div className="mb-1 flex justify-between text-sm"><span>{formatDate(`${item.month}-01`)} · {capitalize(item.occasion)}</span><span className="font-semibold">{item.count}</span></div>
                  <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.min(item.count * 10, 100)}%` }} /></div>
                </div>
              ))}
              {!analytics?.monthlyTrend?.length ? <p className="text-sm text-slate-500">No analytics data yet.</p> : null}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title={editingTemplate ? 'Edit template' : 'Create template'} size="lg" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setTemplateModalOpen(false)}>Cancel</button><button className="btn-primary" disabled={isSaving} onClick={() => void saveTemplate()}>Save template</button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label="Name" value={templateForm.name || ''} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
          <SelectInput label="Occasion" value={templateForm.occasion} onChange={(e) => setTemplateForm({ ...templateForm, occasion: e.target.value as OccasionTemplate['occasion'] })} options={occasionOptions} />
          <SelectInput label="Channel" value={templateForm.channel} onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value as OccasionChannel })} options={channelOptions} />
          <SelectInput label="Status" value={String(templateForm.isActive)} onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.value === 'true' })} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
          <FormInput className="md:col-span-2" label="Subject" value={templateForm.subject || ''} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} />
        </div>
        <div className="mt-4">
          <TextArea label="Message body" value={templateForm.body || ''} onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })} />
          <p className="mt-2 text-xs text-slate-500">Variables: {'{{Guest Name}}'}, {'{{Hotel Name}}'}, {'{{Birthday}}'}, {'{{Anniversary}}'}, {'{{Coupon Code}}'}, {'{{Manager Name}}'}, {'{{Review Link}}'}, {'{{WhatsApp Number}}'}</p>
        </div>
        {editingTemplate ? <button className="btn-secondary mt-4" onClick={() => void previewOccasionTemplate(entityId(editingTemplate)).then(setTemplatePreview)}><Eye className="h-4 w-4" /> Preview</button> : null}
        {templatePreview ? <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold">{templatePreview.subject}</p><p className="mt-2 whitespace-pre-wrap">{templatePreview.body}</p></div> : null}
      </Modal>

      <Modal isOpen={campaignModalOpen} onClose={() => setCampaignModalOpen(false)} title="Manual occasion campaign" size="lg" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setCampaignModalOpen(false)}>Cancel</button><button className="btn-primary" disabled={isSaving} onClick={() => void saveCampaign()}>Create campaign</button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label="Campaign name" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} />
          <SelectInput label="Occasion" value={campaignForm.occasion} onChange={(e) => setCampaignForm({ ...campaignForm, occasion: e.target.value })} options={occasionOptions} />
          <SelectInput label="Channel" value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })} options={channelOptions} />
          <SelectInput label="Delivery" value={String(campaignForm.sendNow)} onChange={(e) => setCampaignForm({ ...campaignForm, sendNow: e.target.value === 'true' })} options={[{ value: 'true', label: 'Send immediately' }, { value: 'false', label: 'Schedule campaign' }]} />
          {!campaignForm.sendNow ? <FormInput label="Scheduled at" type="datetime-local" value={campaignForm.scheduledAt} onChange={(e) => setCampaignForm({ ...campaignForm, scheduledAt: e.target.value })} /> : null}
        </div>
        <button className="btn-secondary mt-4" onClick={() => void previewOccasionRecipients({ occasion: campaignForm.occasion, channel: campaignForm.channel }).then(setRecipientPreview)}>Preview recipients</button>
        {recipientPreview ? <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold">{recipientPreview.total} eligible recipients</p><div className="mt-2 grid gap-2">{recipientPreview.sample.map((guest) => <p key={guest.id}>{guest.name} · {guest.contact}</p>)}</div></div> : null}
      </Modal>

      <Modal isOpen={testOpen} onClose={() => setTestOpen(false)} title="Send test message" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setTestOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void quickAction(() => sendOccasionTestMessage(testForm), 'Test message simulated').then(() => setTestOpen(false))}>Send test</button></div>}>
        <div className="space-y-4">
          <SelectInput label="Occasion" value={testForm.occasion} onChange={(e) => setTestForm({ ...testForm, occasion: e.target.value })} options={occasionOptions} />
          <SelectInput label="Channel" value={testForm.channel} onChange={(e) => setTestForm({ ...testForm, channel: e.target.value })} options={channelOptions} />
          <FormInput label="Recipient phone or email" value={testForm.recipient} onChange={(e) => setTestForm({ ...testForm, recipient: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (!cancelTarget) return;
          await quickAction(() => cancelOccasionCampaign(entityId(cancelTarget)), 'Campaign cancelled');
          setCancelTarget(null);
        }}
        title="Cancel scheduled campaign?"
        message="Pending delivery logs for this campaign will be marked cancelled."
        confirmLabel="Cancel campaign"
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await quickAction(() => deleteOccasionTemplate(entityId(deleteTarget)), 'Template deleted');
          await templatesQuery.refresh();
          setDeleteTarget(null);
        }}
        title="Delete template?"
        message="This template will no longer be available for automation or manual campaigns."
        confirmLabel="Delete template"
      />
    </div>
  );
}
