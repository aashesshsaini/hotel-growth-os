'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Download, Eye, LineChart, Pause, Play, Plus, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { capitalize, formatDate, formatDateTime } from '@/utils/format';
import {
  archiveComebackCampaign,
  archiveComebackTemplate,
  createComebackCampaign,
  createComebackTemplate,
  duplicateComebackCampaign,
  duplicateComebackTemplate,
  entityId,
  exportComebackHistory,
  getComebackAnalytics,
  getComebackCampaigns,
  getComebackDashboard,
  getComebackHistory,
  getComebackSettings,
  getComebackTemplates,
  pauseComebackAutomation,
  pauseComebackCampaign,
  previewComebackAudience,
  previewComebackTemplate,
  resumeComebackAutomation,
  resumeComebackCampaign,
  retryFailedComebackMessages,
  scanComebackAudience,
  sendComebackTest,
  updateComebackCampaign,
  updateComebackSettings,
  updateComebackTemplate,
  type ComebackAnalytics,
  type ComebackCampaign,
  type ComebackChannel,
  type ComebackDashboard,
  type ComebackDelivery,
  type ComebackSettings,
  type ComebackTemplate,
} from '@/services/comebackCampaigns.service';

const channelOptions = [{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }];
const inactiveOptions = [30, 60, 90, 180, 365].map((value) => ({ value: String(value), label: `${value} days inactive` }));
const guestTypeOptions = ['individual', 'family', 'corporate', 'event_guest', 'vip'].map((value) => ({ value, label: capitalize(value.replace(/_/g, ' ')) }));
const offerOptions = ['flat_discount', 'percentage_discount', 'free_breakfast', 'free_upgrade', 'late_checkout', 'welcome_drink', 'package_deal', 'coupon_code', 'custom_offer'].map((value) => ({ value, label: capitalize(value.replace(/_/g, ' ')) }));

const defaultSettings: ComebackSettings = { isEnabled: true, isPaused: false, inactiveAfterDays: [30, 60, 90, 180, 365], cooldownDays: 60, defaultChannel: 'whatsapp', fallbackChannel: 'email', sendTime: '10:00', timezone: 'Asia/Kolkata', retryEnabled: true, signature: '' };
const defaultTemplate = { name: '', channel: 'whatsapp', subject: '', body: 'Hi {{Guest Name}}, we miss hosting you at {{Hotel Name}}. Enjoy {{Offer}} with coupon {{Coupon Code}} before {{Expiry Date}}.', isActive: true, isDefault: false };
const defaultCampaign = { name: '', channel: 'whatsapp', inactiveAfterDays: 90, scheduledAt: '', sendNow: true, offer: { type: 'percentage_discount', title: 'Comeback special offer', value: 15, couponCode: 'COMEBACK15', expiryDate: '', bookingLink: '', description: '' }, audienceFilters: { city: '', country: '', minSpend: '', minBookings: '', guestType: '', tags: '' } };

function Badge({ value }: { value: string }) {
  const tone = ['completed', 'sent', 'delivered', 'running', 'active'].includes(value) ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : ['failed', 'cancelled', 'archived'].includes(value) ? 'bg-rose-50 text-rose-700 ring-rose-200' : ['scheduled', 'pending', 'queued', 'paused'].includes(value) ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-slate-50 text-slate-700 ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(value.replace(/_/g, ' '))}</span>;
}

function StatCard({ title, value, helper, icon: Icon }: { title: string; value: string | number; helper?: string; icon: typeof RotateCcw }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><Icon className="h-5 w-5 text-indigo-500" /></div><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>{helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}</div>;
}

export default function ComebackCampaignsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState<ComebackDashboard | null>(null);
  const [analytics, setAnalytics] = useState<ComebackAnalytics | null>(null);
  const [settings, setSettings] = useState<ComebackSettings>(defaultSettings);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<Partial<ComebackTemplate>>(defaultTemplate as Partial<ComebackTemplate>);
  const [editingTemplate, setEditingTemplate] = useState<ComebackTemplate | null>(null);
  const [templatePreview, setTemplatePreview] = useState<{ subject: string; body: string; variables: string[] } | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState(defaultCampaign);
  const [editingCampaign, setEditingCampaign] = useState<ComebackCampaign | null>(null);
  const [recipientPreview, setRecipientPreview] = useState<{ total: number; sample: Array<{ id: string; name: string; contact: string; lastStayDate?: string; totalSpend?: number; totalBookings?: number }> } | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testForm, setTestForm] = useState({ recipient: '', channel: 'whatsapp' });

  const templatesQuery = usePaginatedQuery<ComebackTemplate>({ fetchFn: getComebackTemplates, initialParams: { limit: 10 } });
  const campaignsQuery = usePaginatedQuery<ComebackCampaign>({ fetchFn: getComebackCampaigns, initialParams: { limit: 10 } });
  const historyQuery = usePaginatedQuery<ComebackDelivery>({ fetchFn: getComebackHistory, initialParams: { limit: 10 } });

  const loadOverview = useCallback(async () => {
    const [nextDashboard, nextAnalytics, nextSettings] = await Promise.all([getComebackDashboard(), getComebackAnalytics({ months: 6 }), getComebackSettings()]);
    setDashboard(nextDashboard);
    setAnalytics(nextAnalytics);
    setSettings(nextSettings);
  }, []);
  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const quickAction = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      showToast(message, 'success');
      await Promise.all([loadOverview(), campaignsQuery.refresh(), historyQuery.refresh(), templatesQuery.refresh()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action failed', 'error');
    }
  };

  const openTemplate = (template?: ComebackTemplate) => {
    setEditingTemplate(template || null);
    setTemplateForm(template || defaultTemplate as Partial<ComebackTemplate>);
    setTemplatePreview(null);
    setTemplateOpen(true);
  };
  const saveTemplate = async () => {
    if (editingTemplate) await updateComebackTemplate(entityId(editingTemplate), templateForm);
    else await createComebackTemplate(templateForm);
    showToast(editingTemplate ? 'Template updated' : 'Template created', 'success');
    setTemplateOpen(false);
    await templatesQuery.refresh();
  };

  const openCampaign = (campaign?: ComebackCampaign) => {
    setEditingCampaign(campaign || null);
    setCampaignForm(campaign ? {
      name: campaign.name,
      channel: campaign.channel,
      inactiveAfterDays: campaign.inactiveAfterDays,
      scheduledAt: campaign.scheduledAt?.slice(0, 16) || '',
      sendNow: false,
      offer: { type: campaign.offer.type, title: campaign.offer.title, value: campaign.offer.value || 0, couponCode: campaign.offer.couponCode || '', expiryDate: campaign.offer.expiryDate?.slice(0, 10) || '', bookingLink: campaign.offer.bookingLink || '', description: campaign.offer.description || '' },
      audienceFilters: { city: String(campaign.audienceFilters?.city || ''), country: String(campaign.audienceFilters?.country || ''), minSpend: String(campaign.audienceFilters?.minSpend || ''), minBookings: String(campaign.audienceFilters?.minBookings || ''), guestType: String(campaign.audienceFilters?.guestType || ''), tags: Array.isArray(campaign.audienceFilters?.tags) ? (campaign.audienceFilters.tags as string[]).join(',') : '' },
    } : defaultCampaign);
    setRecipientPreview(null);
    setCampaignOpen(true);
  };
  const campaignPayload = () => ({
    ...campaignForm,
    scheduledAt: campaignForm.sendNow || !campaignForm.scheduledAt ? undefined : campaignForm.scheduledAt,
    audienceFilters: {
      city: campaignForm.audienceFilters.city || undefined,
      country: campaignForm.audienceFilters.country || undefined,
      minSpend: campaignForm.audienceFilters.minSpend ? Number(campaignForm.audienceFilters.minSpend) : undefined,
      minBookings: campaignForm.audienceFilters.minBookings ? Number(campaignForm.audienceFilters.minBookings) : undefined,
      guestType: campaignForm.audienceFilters.guestType || undefined,
      tags: campaignForm.audienceFilters.tags ? campaignForm.audienceFilters.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
    },
    offer: { ...campaignForm.offer, expiryDate: campaignForm.offer.expiryDate || undefined, bookingLink: campaignForm.offer.bookingLink || undefined },
  });
  const saveCampaign = async () => {
    if (editingCampaign) await updateComebackCampaign(entityId(editingCampaign), campaignPayload());
    else await createComebackCampaign(campaignPayload());
    showToast(editingCampaign ? 'Campaign updated' : 'Campaign created', 'success');
    setCampaignOpen(false);
    await Promise.all([campaignsQuery.refresh(), loadOverview()]);
  };

  const stats = useMemo(() => [
    { title: 'Inactive guests', value: dashboard?.inactiveGuests ?? 0, helper: '90-day default audience', icon: RotateCcw },
    { title: 'Campaigns running', value: dashboard?.campaignsRunning ?? 0, helper: 'Active win-back flows', icon: Play },
    { title: 'Guests re-engaged', value: dashboard?.guestsReengaged ?? 0, helper: 'Future-ready booking attribution', icon: LineChart },
    { title: 'Messages sent', value: dashboard?.messagesSent ?? 0, helper: `${dashboard?.pendingMessages ?? 0} pending, ${dashboard?.failedMessages ?? 0} failed`, icon: Send },
  ], [dashboard]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Retention Growth</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Comeback / Win-back Campaigns</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Identify inactive guests, build targeted offers, and schedule simulated WhatsApp/email campaigns that bring guests back.</p></div>
        <div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => setTestOpen(true)}><Send className="h-4 w-4" /> Test</button><button className="btn-secondary" onClick={() => void quickAction(scanComebackAudience, 'Inactive guest scan queued')}><RefreshCw className="h-4 w-4" /> Scan</button><button className="btn-secondary" onClick={() => void quickAction(exportComebackHistory, 'History export generated')}><Download className="h-4 w-4" /> Export</button><button className="btn-primary" onClick={() => openCampaign()}><Plus className="h-4 w-4" /> New campaign</button></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.title} {...stat} />)}</div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">{['dashboard', 'campaigns', 'templates', 'settings', 'history', 'analytics'].map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>{capitalize(tab)}</button>)}</div>

      {activeTab === 'dashboard' && <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Automation overview</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><StatCard title="Upcoming" value={dashboard?.upcomingCampaigns ?? 0} icon={RefreshCw} /><StatCard title="Delivery rate" value={`${analytics?.deliveryRate ?? 0}%`} icon={LineChart} /><StatCard title="Failure rate" value={`${analytics?.failureRate ?? 0}%`} icon={Pause} /></div></div><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-950">Quick actions</h2><div className="mt-4 grid gap-3"><button className="btn-secondary justify-start" onClick={() => void quickAction(settings.isPaused ? resumeComebackAutomation : pauseComebackAutomation, settings.isPaused ? 'Automation resumed' : 'Automation paused')}>{settings.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {settings.isPaused ? 'Resume automation' : 'Pause automation'}</button><button className="btn-secondary justify-start" onClick={() => void quickAction(retryFailedComebackMessages, 'Failed messages queued for retry')}><RefreshCw className="h-4 w-4" /> Retry failed</button><button className="btn-secondary justify-start" onClick={() => openTemplate()}><Plus className="h-4 w-4" /> Create template</button></div></div></div>}

      {activeTab === 'campaigns' && <DataTable columns={[{ key: 'name', header: 'Campaign' }, { key: 'inactiveAfterDays', header: 'Inactive window', render: (row) => `${row.inactiveAfterDays} days` }, { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> }, { key: 'recipientCount', header: 'Audience' }, { key: 'scheduledAt', header: 'Schedule', render: (row) => row.scheduledAt ? formatDateTime(row.scheduledAt) : 'Immediate/Draft' }, { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={() => openCampaign(row)}><Eye className="h-4 w-4" /></button><button className="btn-ghost btn-sm" onClick={() => void quickAction(() => duplicateComebackCampaign(entityId(row)), 'Campaign duplicated')}><Copy className="h-4 w-4" /></button><button className="btn-ghost btn-sm" onClick={() => void quickAction(() => row.status === 'paused' ? resumeComebackCampaign(entityId(row)) : pauseComebackCampaign(entityId(row)), row.status === 'paused' ? 'Campaign resumed' : 'Campaign paused')}>{row.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button><button className="btn-ghost btn-sm" onClick={() => void quickAction(() => archiveComebackCampaign(entityId(row)), 'Campaign archived')}>Archive</button></div> }]} data={campaignsQuery.data} isLoading={campaignsQuery.isLoading} error={campaignsQuery.error} onSearch={campaignsQuery.setSearch} filters={<button className="btn-primary" onClick={() => openCampaign()}><Plus className="h-4 w-4" /> Campaign</button>} rowKey={entityId} pagination={{ page: campaignsQuery.pagination.page, totalPages: campaignsQuery.pagination.totalPages, total: campaignsQuery.pagination.total, onPageChange: campaignsQuery.setPage }} emptyTitle="No win-back campaigns" emptyDescription="Create a campaign for inactive guests with a targeted comeback offer." />}

      {activeTab === 'templates' && <DataTable columns={[{ key: 'name', header: 'Template' }, { key: 'channel', header: 'Channel', render: (row) => capitalize(row.channel) }, { key: 'isActive', header: 'Status', render: (row) => <Badge value={row.isActive ? 'active' : 'archived'} /> }, { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={() => openTemplate(row)}><Eye className="h-4 w-4" /></button><button className="btn-ghost btn-sm" onClick={() => void quickAction(() => duplicateComebackTemplate(entityId(row)), 'Template duplicated')}><Copy className="h-4 w-4" /></button><button className="btn-ghost btn-sm" onClick={() => void quickAction(() => archiveComebackTemplate(entityId(row)), 'Template archived')}>Archive</button></div> }]} data={templatesQuery.data} isLoading={templatesQuery.isLoading} error={templatesQuery.error} onSearch={templatesQuery.setSearch} filters={<button className="btn-primary" onClick={() => openTemplate()}><Plus className="h-4 w-4" /> Template</button>} rowKey={entityId} pagination={{ page: templatesQuery.pagination.page, totalPages: templatesQuery.pagination.totalPages, total: templatesQuery.pagination.total, onPageChange: templatesQuery.setPage }} emptyTitle="No win-back templates" emptyDescription="Create WhatsApp or email templates for comeback offers." />}

      {activeTab === 'settings' && <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><SelectInput label="Automation" value={String(settings.isEnabled)} onChange={(e) => setSettings({ ...settings, isEnabled: e.target.value === 'true' })} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} /><FormInput label="Cooldown days" type="number" value={settings.cooldownDays} onChange={(e) => setSettings({ ...settings, cooldownDays: Number(e.target.value) })} /><SelectInput label="Default channel" value={settings.defaultChannel} onChange={(e) => setSettings({ ...settings, defaultChannel: e.target.value as ComebackChannel })} options={channelOptions} /><FormInput label="Send time" type="time" value={settings.sendTime} onChange={(e) => setSettings({ ...settings, sendTime: e.target.value })} /><FormInput label="Timezone" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} /><SelectInput label="Retry failed" value={String(settings.retryEnabled)} onChange={(e) => setSettings({ ...settings, retryEnabled: e.target.value === 'true' })} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} /></div><div className="mt-4"><TextArea label="Signature" value={settings.signature || ''} onChange={(e) => setSettings({ ...settings, signature: e.target.value })} /></div><div className="mt-5 flex justify-end"><button className="btn-primary" onClick={() => void quickAction(() => updateComebackSettings(settings), 'Win-back settings saved')}>Save settings</button></div></div>}

      {activeTab === 'history' && <DataTable columns={[{ key: 'recipientName', header: 'Guest' }, { key: 'recipientMasked', header: 'Contact' }, { key: 'channel', header: 'Channel', render: (row) => capitalize(row.channel) }, { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> }, { key: 'lastStayDate', header: 'Last stay', render: (row) => row.lastStayDate ? formatDate(row.lastStayDate) : 'Unknown' }, { key: 'sentAt', header: 'Sent', render: (row) => row.sentAt ? formatDateTime(row.sentAt) : 'Pending' }, { key: 'retryCount', header: 'Retries' }]} data={historyQuery.data} isLoading={historyQuery.isLoading} error={historyQuery.error} onSearch={historyQuery.setSearch} rowKey={entityId} pagination={{ page: historyQuery.pagination.page, totalPages: historyQuery.pagination.totalPages, total: historyQuery.pagination.total, onPageChange: historyQuery.setPage }} emptyTitle="No win-back history" emptyDescription="Delivery logs appear after campaigns are queued." />}

      {activeTab === 'analytics' && <div className="grid gap-4 lg:grid-cols-2"><StatCard title="Delivery rate" value={`${analytics?.deliveryRate ?? 0}%`} icon={LineChart} /><StatCard title="Failure rate" value={`${analytics?.failureRate ?? 0}%`} icon={RefreshCw} /><StatCard title="Guest return rate" value={`${analytics?.guestReturnRate ?? 0}%`} icon={RotateCcw} /><StatCard title="Repeat booking rate" value={`${analytics?.repeatBookingRate ?? 0}%`} icon={Play} /><div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2"><h2 className="text-lg font-semibold text-slate-950">Monthly trends</h2><div className="mt-4 space-y-3">{analytics?.monthlyTrends?.length ? analytics.monthlyTrends.map((item) => <div key={item.month}><div className="mb-1 flex justify-between text-sm"><span>{formatDate(`${item.month}-01`)}</span><span className="font-semibold">{item.count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.min(item.count * 10, 100)}%` }} /></div></div>) : <p className="text-sm text-slate-500">No analytics data yet.</p>}</div></div></div>}

      <Modal isOpen={templateOpen} onClose={() => setTemplateOpen(false)} title={editingTemplate ? 'Edit template' : 'Create template'} size="lg" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setTemplateOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void saveTemplate()}>Save template</button></div>}>
        <div className="grid gap-4 md:grid-cols-2"><FormInput label="Name" value={templateForm.name || ''} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} /><SelectInput label="Channel" value={templateForm.channel} onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value as ComebackChannel })} options={channelOptions} /><FormInput className="md:col-span-2" label="Subject" value={templateForm.subject || ''} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} /></div><div className="mt-4"><TextArea label="Body" value={templateForm.body || ''} onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })} /><p className="mt-2 text-xs text-slate-500">Variables: {'{{Guest Name}}'}, {'{{Hotel Name}}'}, {'{{Offer}}'}, {'{{Coupon Code}}'}, {'{{Booking Link}}'}, {'{{Expiry Date}}'}, {'{{Manager Name}}'}</p></div>{editingTemplate ? <button className="btn-secondary mt-4" onClick={() => void previewComebackTemplate(entityId(editingTemplate)).then(setTemplatePreview)}><Eye className="h-4 w-4" /> Preview</button> : null}{templatePreview ? <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold">{templatePreview.subject}</p><p className="mt-2 whitespace-pre-wrap">{templatePreview.body}</p></div> : null}
      </Modal>

      <Modal isOpen={campaignOpen} onClose={() => setCampaignOpen(false)} title={editingCampaign ? 'Edit win-back campaign' : 'Create win-back campaign'} size="xl" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setCampaignOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void saveCampaign()}>Save campaign</button></div>}>
        <div className="grid gap-4 md:grid-cols-2"><FormInput label="Campaign name" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} /><SelectInput label="Inactive rule" value={String(campaignForm.inactiveAfterDays)} onChange={(e) => setCampaignForm({ ...campaignForm, inactiveAfterDays: Number(e.target.value) })} options={inactiveOptions} /><SelectInput label="Channel" value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value as ComebackChannel })} options={channelOptions} /><SelectInput label="Guest type" value={campaignForm.audienceFilters.guestType} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, guestType: e.target.value } })} options={guestTypeOptions} /><SelectInput label="Offer type" value={campaignForm.offer.type} onChange={(e) => setCampaignForm({ ...campaignForm, offer: { ...campaignForm.offer, type: e.target.value } })} options={offerOptions} /><FormInput label="Offer title" value={campaignForm.offer.title} onChange={(e) => setCampaignForm({ ...campaignForm, offer: { ...campaignForm.offer, title: e.target.value } })} /><FormInput label="Coupon code" value={campaignForm.offer.couponCode} onChange={(e) => setCampaignForm({ ...campaignForm, offer: { ...campaignForm.offer, couponCode: e.target.value } })} /><FormInput label="Expiry date" type="date" value={campaignForm.offer.expiryDate} onChange={(e) => setCampaignForm({ ...campaignForm, offer: { ...campaignForm.offer, expiryDate: e.target.value } })} /><SelectInput label="Delivery" value={String(campaignForm.sendNow)} onChange={(e) => setCampaignForm({ ...campaignForm, sendNow: e.target.value === 'true' })} options={[{ value: 'true', label: 'Send immediately' }, { value: 'false', label: 'Schedule campaign' }]} />{!campaignForm.sendNow ? <FormInput label="Schedule" type="datetime-local" value={campaignForm.scheduledAt} onChange={(e) => setCampaignForm({ ...campaignForm, scheduledAt: e.target.value })} /> : null}</div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><h3 className="font-semibold text-slate-900">Audience filters</h3><div className="mt-3 grid gap-4 md:grid-cols-2"><FormInput label="City" value={campaignForm.audienceFilters.city} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, city: e.target.value } })} /><FormInput label="Country" value={campaignForm.audienceFilters.country} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, country: e.target.value } })} /><FormInput label="Minimum spend" type="number" value={campaignForm.audienceFilters.minSpend} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, minSpend: e.target.value } })} /><FormInput label="Minimum booking count" type="number" value={campaignForm.audienceFilters.minBookings} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, minBookings: e.target.value } })} /><FormInput className="md:col-span-2" label="Tags" hint="Comma separated tags" value={campaignForm.audienceFilters.tags} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, tags: e.target.value } })} /></div><button className="btn-secondary mt-4" onClick={() => void previewComebackAudience({ channel: campaignForm.channel, inactiveAfterDays: campaignForm.inactiveAfterDays, filters: campaignPayload().audienceFilters }).then(setRecipientPreview)}>Preview campaign</button>{recipientPreview ? <div className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700"><p className="font-semibold">{recipientPreview.total} inactive guests</p>{recipientPreview.sample.map((guest) => <p key={guest.id} className="mt-1">{guest.name} · {guest.contact}</p>)}</div> : null}</div>
      </Modal>

      <Modal isOpen={testOpen} onClose={() => setTestOpen(false)} title="Send test message" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setTestOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void quickAction(() => sendComebackTest(testForm), 'Test message simulated').then(() => setTestOpen(false))}>Send test</button></div>}>
        <div className="space-y-4"><SelectInput label="Channel" value={testForm.channel} onChange={(e) => setTestForm({ ...testForm, channel: e.target.value })} options={channelOptions} /><FormInput label="Recipient phone or email" value={testForm.recipient} onChange={(e) => setTestForm({ ...testForm, recipient: e.target.value })} /></div>
      </Modal>
    </div>
  );
}
