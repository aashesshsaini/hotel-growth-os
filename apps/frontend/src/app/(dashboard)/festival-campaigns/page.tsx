'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Download, Eye, Gift, LineChart, Pause, PartyPopper, Play, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { capitalize, formatDate, formatDateTime } from '@/utils/format';
import {
  archiveFestivalCampaign,
  cancelFestivalCampaign,
  createFestival,
  createFestivalCampaign,
  createFestivalTemplate,
  deleteFestivalCampaign,
  deleteFestivalTemplate,
  duplicateFestivalCampaign,
  duplicateFestivalTemplate,
  entityId,
  exportFestivals,
  getFestivalAnalytics,
  getFestivalCampaigns,
  getFestivalDashboard,
  getFestivalHistory,
  getFestivalSettings,
  getFestivalTemplates,
  getFestivals,
  pauseFestivalAutomation,
  pauseFestivalCampaign,
  previewFestivalRecipients,
  previewFestivalTemplate,
  resumeFestivalAutomation,
  resumeFestivalCampaign,
  retryFailedFestivalMessages,
  sendFestivalTest,
  updateFestival,
  updateFestivalCampaign,
  updateFestivalSettings,
  updateFestivalTemplate,
  type AudienceSegment,
  type Festival,
  type FestivalAnalytics,
  type FestivalCampaign,
  type FestivalChannel,
  type FestivalDashboard,
  type FestivalDelivery,
  type FestivalSettings,
  type FestivalTemplate,
} from '@/services/festivalCampaigns.service';

const channelOptions = [{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }];
const audienceOptions = [
  'all_guests', 'repeat_guests', 'vip_guests', 'inactive_guests', 'recent_guests', 'birthday_guests', 'anniversary_guests', 'referral_guests', 'custom',
].map((value) => ({ value, label: capitalize(value.replace(/_/g, ' ')) }));
const offerOptions = [
  'percentage_discount', 'flat_discount', 'free_breakfast', 'free_upgrade', 'free_dinner', 'late_checkout', 'welcome_drink', 'coupon_code', 'package_offer', 'custom_offer',
].map((value) => ({ value, label: capitalize(value.replace(/_/g, ' ')) }));

const defaultSettings: FestivalSettings = { isEnabled: true, isPaused: false, defaultChannel: 'whatsapp', fallbackChannel: 'email', sendTime: '10:00', timezone: 'Asia/Kolkata', retryEnabled: true, recurringEnabled: true, signature: '' };
const defaultFestival = { name: '', date: '', category: 'custom', defaultBanner: '', defaultMessage: '', defaultOffer: '', isRecurring: true, isActive: true };
const defaultTemplate = { name: '', channel: 'whatsapp', subject: '', body: 'Hi {{Guest Name}}, {{Hotel Name}} has a {{Festival Name}} offer for you: {{Offer}}. Use {{Coupon}} before {{Expiry Date}}.', isActive: true, isDefault: false };
const defaultCampaign = { festivalId: '', name: '', channel: 'whatsapp', audienceSegment: 'all_guests', scheduledAt: '', sendNow: true, recurring: 'none', offer: { type: 'percentage_discount', title: '', value: 10, couponCode: 'FEST10', expiryDate: '', bookingLink: '', description: '' }, audienceFilters: { city: '', country: '', minSpend: '', minBookings: '', tags: '' } };

function Badge({ value }: { value: string }) {
  const tone = ['completed', 'sent', 'delivered', 'healthy', 'running', 'active'].includes(value)
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : ['failed', 'cancelled', 'archived', 'disabled'].includes(value)
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : ['scheduled', 'pending', 'queued', 'paused'].includes(value)
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-slate-50 text-slate-700 ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(value.replace(/_/g, ' '))}</span>;
}

function StatCard({ title, value, helper, icon: Icon }: { title: string; value: string | number; helper?: string; icon: typeof PartyPopper }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><Icon className="h-5 w-5 text-indigo-500" /></div><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>{helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}</div>;
}

const festivalName = (campaign: FestivalCampaign) => typeof campaign.festivalId === 'object' ? campaign.festivalId.name : 'Festival';

export default function FestivalCampaignsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState<FestivalDashboard | null>(null);
  const [analytics, setAnalytics] = useState<FestivalAnalytics | null>(null);
  const [settings, setSettings] = useState<FestivalSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [festivalOpen, setFestivalOpen] = useState(false);
  const [festivalForm, setFestivalForm] = useState(defaultFestival);
  const [editingFestival, setEditingFestival] = useState<Festival | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<Partial<FestivalTemplate>>(defaultTemplate as Partial<FestivalTemplate>);
  const [editingTemplate, setEditingTemplate] = useState<FestivalTemplate | null>(null);
  const [templatePreview, setTemplatePreview] = useState<{ subject: string; body: string; variables: string[] } | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState(defaultCampaign);
  const [editingCampaign, setEditingCampaign] = useState<FestivalCampaign | null>(null);
  const [recipientPreview, setRecipientPreview] = useState<{ total: number; sample: Array<{ id: string; name: string; contact: string }> } | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testForm, setTestForm] = useState({ recipient: '', channel: 'whatsapp' });
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<FestivalCampaign | null>(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<FestivalTemplate | null>(null);

  const festivalsQuery = usePaginatedQuery<Festival>({ fetchFn: getFestivals, initialParams: { limit: 20 } });
  const templatesQuery = usePaginatedQuery<FestivalTemplate>({ fetchFn: getFestivalTemplates, initialParams: { limit: 10 } });
  const campaignsQuery = usePaginatedQuery<FestivalCampaign>({ fetchFn: getFestivalCampaigns, initialParams: { limit: 10 } });
  const historyQuery = usePaginatedQuery<FestivalDelivery>({ fetchFn: getFestivalHistory, initialParams: { limit: 10 } });

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextDashboard, nextAnalytics, nextSettings] = await Promise.all([getFestivalDashboard(), getFestivalAnalytics({ months: 6 }), getFestivalSettings()]);
      setDashboard(nextDashboard);
      setAnalytics(nextAnalytics);
      setSettings(nextSettings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const quickAction = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      showToast(message, 'success');
      await Promise.all([loadOverview(), campaignsQuery.refresh(), historyQuery.refresh()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action failed', 'error');
    }
  };

  const openFestival = (festival?: Festival) => {
    setEditingFestival(festival || null);
    setFestivalForm(festival ? {
      name: festival.name,
      date: festival.date?.slice(0, 10) || '',
      category: festival.category,
      defaultBanner: festival.defaultBanner || '',
      defaultMessage: festival.defaultMessage,
      defaultOffer: festival.defaultOffer,
      isRecurring: festival.isRecurring,
      isActive: festival.isActive,
    } : defaultFestival);
    setFestivalOpen(true);
  };

  const saveFestival = async () => {
    try {
      if (editingFestival) await updateFestival(entityId(editingFestival), festivalForm);
      else await createFestival(festivalForm);
      showToast(editingFestival ? 'Festival updated' : 'Festival created', 'success');
      setFestivalOpen(false);
      await festivalsQuery.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save festival', 'error');
    }
  };

  const openTemplate = (template?: FestivalTemplate) => {
    setEditingTemplate(template || null);
    setTemplateForm(template || defaultTemplate as Partial<FestivalTemplate>);
    setTemplatePreview(null);
    setTemplateOpen(true);
  };

  const saveTemplate = async () => {
    try {
      if (editingTemplate) await updateFestivalTemplate(entityId(editingTemplate), templateForm);
      else await createFestivalTemplate(templateForm);
      showToast(editingTemplate ? 'Template updated' : 'Template created', 'success');
      setTemplateOpen(false);
      await templatesQuery.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save template', 'error');
    }
  };

  const openCampaign = (campaign?: FestivalCampaign) => {
    setEditingCampaign(campaign || null);
    if (campaign) {
      setCampaignForm({
        festivalId: typeof campaign.festivalId === 'object' ? entityId(campaign.festivalId) : campaign.festivalId,
        name: campaign.name,
        channel: campaign.channel,
        audienceSegment: campaign.audienceSegment,
        scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.slice(0, 16) : '',
        sendNow: false,
        recurring: campaign.recurring,
        offer: { type: campaign.offer.type, title: campaign.offer.title, value: campaign.offer.value || 0, couponCode: campaign.offer.couponCode || '', expiryDate: campaign.offer.expiryDate?.slice(0, 10) || '', bookingLink: campaign.offer.bookingLink || '', description: campaign.offer.description || '' },
        audienceFilters: { city: String(campaign.audienceFilters?.city || ''), country: String(campaign.audienceFilters?.country || ''), minSpend: String(campaign.audienceFilters?.minSpend || ''), minBookings: String(campaign.audienceFilters?.minBookings || ''), tags: Array.isArray(campaign.audienceFilters?.tags) ? (campaign.audienceFilters.tags as string[]).join(',') : '' },
      });
    } else {
      setCampaignForm({ ...defaultCampaign, festivalId: entityId(festivalsQuery.data[0] || {}) });
    }
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
      tags: campaignForm.audienceFilters.tags ? campaignForm.audienceFilters.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
    },
    offer: { ...campaignForm.offer, expiryDate: campaignForm.offer.expiryDate || undefined, bookingLink: campaignForm.offer.bookingLink || undefined },
  });

  const saveCampaign = async () => {
    try {
      if (editingCampaign) await updateFestivalCampaign(entityId(editingCampaign), campaignPayload());
      else await createFestivalCampaign(campaignPayload());
      showToast(editingCampaign ? 'Campaign updated' : 'Campaign created', 'success');
      setCampaignOpen(false);
      await Promise.all([campaignsQuery.refresh(), loadOverview()]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save campaign', 'error');
    }
  };

  const stats = useMemo(() => [
    { title: 'Upcoming campaigns', value: dashboard?.upcomingCampaigns ?? 0, helper: 'Scheduled festival sends', icon: PartyPopper },
    { title: 'Running campaigns', value: dashboard?.runningCampaigns ?? 0, helper: 'Currently active', icon: Play },
    { title: 'Messages sent', value: dashboard?.messagesSent ?? 0, helper: `${dashboard?.deliveryRate ?? 0}% delivery rate`, icon: Send },
    { title: 'Revenue generated', value: `₹${dashboard?.revenueGenerated ?? 0}`, helper: 'Future-ready conversion tracking', icon: Gift },
  ], [dashboard]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Growth Campaigns</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Festival Campaigns</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Create festival offers, target CRM audiences, schedule simulated multi-channel sends, and track engagement without changing the communication engine.</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setTestOpen(true)}><Send className="h-4 w-4" /> Test</button>
          <button className="btn-secondary" onClick={() => void quickAction(exportFestivals, 'Festival export generated')}><Download className="h-4 w-4" /> Export</button>
          <button className="btn-secondary" onClick={() => void quickAction(retryFailedFestivalMessages, 'Failed messages queued for retry')}><RefreshCw className="h-4 w-4" /> Retry failed</button>
          <button className="btn-primary" onClick={() => openCampaign()}><Plus className="h-4 w-4" /> New campaign</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.title} {...stat} />)}</div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
        {['dashboard', 'library', 'campaigns', 'templates', 'settings', 'history', 'analytics'].map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>{capitalize(tab)}</button>)}
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950">Campaign health</h2><Badge value={dashboard?.automationHealth || 'loading'} /></div>
            {isLoading ? <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" /> : <div className="mt-4 grid gap-3 sm:grid-cols-3"><StatCard title="Completed" value={dashboard?.completedCampaigns ?? 0} icon={LineChart} /><StatCard title="Pending" value={dashboard?.pendingMessages ?? 0} icon={RefreshCw} /><StatCard title="Failed" value={dashboard?.failedMessages ?? 0} icon={Pause} /></div>}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Quick actions</h2>
            <div className="mt-4 grid gap-3">
              <button className="btn-secondary justify-start" onClick={() => void quickAction(settings.isPaused ? resumeFestivalAutomation : pauseFestivalAutomation, settings.isPaused ? 'Festival automation resumed' : 'Festival automation paused')}>{settings.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {settings.isPaused ? 'Resume automation' : 'Pause automation'}</button>
              <button className="btn-secondary justify-start" onClick={() => openFestival()}><Plus className="h-4 w-4" /> Add custom festival</button>
              <button className="btn-secondary justify-start" onClick={() => openTemplate()}><Plus className="h-4 w-4" /> Create template</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'library' && (
        <DataTable columns={[{ key: 'name', header: 'Festival' }, { key: 'date', header: 'Date', render: (row) => formatDate(row.date) }, { key: 'category', header: 'Category', render: (row) => <Badge value={row.category} /> }, { key: 'defaultOffer', header: 'Default offer' }, { key: 'isBuiltIn', header: 'Source', render: (row) => row.isBuiltIn ? 'Built-in' : 'Custom' }, { key: 'actions', header: 'Actions', render: (row) => <button className="btn-ghost btn-sm" onClick={() => openFestival(row)}><Eye className="h-4 w-4" /></button> }]} data={festivalsQuery.data} isLoading={festivalsQuery.isLoading} error={festivalsQuery.error} onSearch={festivalsQuery.setSearch} filters={<button className="btn-primary" onClick={() => openFestival()}><Plus className="h-4 w-4" /> Festival</button>} rowKey={entityId} pagination={{ page: festivalsQuery.pagination.page, totalPages: festivalsQuery.pagination.totalPages, total: festivalsQuery.pagination.total, onPageChange: festivalsQuery.setPage }} emptyTitle="No festivals" emptyDescription="The built-in festival library will seed automatically on first load." />
      )}

      {activeTab === 'campaigns' && (
        <DataTable columns={[{ key: 'name', header: 'Campaign' }, { key: 'festival', header: 'Festival', render: festivalName }, { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> }, { key: 'audienceSegment', header: 'Audience', render: (row) => capitalize(row.audienceSegment.replace(/_/g, ' ')) }, { key: 'recipientCount', header: 'Reach' }, { key: 'scheduledAt', header: 'Schedule', render: (row) => row.scheduledAt ? formatDateTime(row.scheduledAt) : 'Immediate/Draft' }, { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={() => openCampaign(row)}><Eye className="h-4 w-4" /></button><button className="btn-ghost btn-sm" onClick={() => void quickAction(() => duplicateFestivalCampaign(entityId(row)), 'Campaign duplicated')}><Copy className="h-4 w-4" /></button><button className="btn-ghost btn-sm" onClick={() => void quickAction(() => row.status === 'paused' ? resumeFestivalCampaign(entityId(row)) : pauseFestivalCampaign(entityId(row)), row.status === 'paused' ? 'Campaign resumed' : 'Campaign paused')}>{row.status === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button><button className="btn-ghost btn-sm" onClick={() => void quickAction(() => archiveFestivalCampaign(entityId(row)), 'Campaign archived')}>Archive</button><button className="btn-ghost btn-sm text-rose-600" onClick={() => setDeleteCampaignTarget(row)}><Trash2 className="h-4 w-4" /></button></div> }]} data={campaignsQuery.data} isLoading={campaignsQuery.isLoading} error={campaignsQuery.error} onSearch={campaignsQuery.setSearch} filters={<button className="btn-primary" onClick={() => openCampaign()}><Plus className="h-4 w-4" /> Campaign</button>} rowKey={entityId} pagination={{ page: campaignsQuery.pagination.page, totalPages: campaignsQuery.pagination.totalPages, total: campaignsQuery.pagination.total, onPageChange: campaignsQuery.setPage }} emptyTitle="No festival campaigns" emptyDescription="Create your first festival promotion with an offer and CRM audience." />
      )}

      {activeTab === 'templates' && (
        <DataTable columns={[{ key: 'name', header: 'Template' }, { key: 'channel', header: 'Channel', render: (row) => capitalize(row.channel) }, { key: 'isActive', header: 'Status', render: (row) => <Badge value={row.isActive ? 'active' : 'inactive'} /> }, { key: 'actions', header: 'Actions', render: (row) => <div className="flex gap-2"><button className="btn-ghost btn-sm" onClick={() => openTemplate(row)}><Eye className="h-4 w-4" /></button><button className="btn-ghost btn-sm" onClick={() => void quickAction(() => duplicateFestivalTemplate(entityId(row)), 'Template duplicated')}><Copy className="h-4 w-4" /></button><button className="btn-ghost btn-sm text-rose-600" onClick={() => setDeleteTemplateTarget(row)}><Trash2 className="h-4 w-4" /></button></div> }]} data={templatesQuery.data} isLoading={templatesQuery.isLoading} error={templatesQuery.error} onSearch={templatesQuery.setSearch} filters={<button className="btn-primary" onClick={() => openTemplate()}><Plus className="h-4 w-4" /> Template</button>} rowKey={entityId} pagination={{ page: templatesQuery.pagination.page, totalPages: templatesQuery.pagination.totalPages, total: templatesQuery.pagination.total, onPageChange: templatesQuery.setPage }} emptyTitle="No templates" emptyDescription="Create WhatsApp, email, or SMS-ready festival templates." />
      )}

      {activeTab === 'settings' && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SelectInput label="Festival automation" value={String(settings.isEnabled)} onChange={(e) => setSettings({ ...settings, isEnabled: e.target.value === 'true' })} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} />
            <SelectInput label="Default channel" value={settings.defaultChannel} onChange={(e) => setSettings({ ...settings, defaultChannel: e.target.value as FestivalChannel })} options={channelOptions} />
            <SelectInput label="Fallback channel" value={settings.fallbackChannel} onChange={(e) => setSettings({ ...settings, fallbackChannel: e.target.value as FestivalSettings['fallbackChannel'] })} options={[...channelOptions, { value: 'none', label: 'None' }]} />
            <FormInput label="Send time" type="time" value={settings.sendTime} onChange={(e) => setSettings({ ...settings, sendTime: e.target.value })} />
            <FormInput label="Timezone" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} />
            <SelectInput label="Retry failed messages" value={String(settings.retryEnabled)} onChange={(e) => setSettings({ ...settings, retryEnabled: e.target.value === 'true' })} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} />
          </div>
          <div className="mt-4"><TextArea label="Signature" value={settings.signature || ''} onChange={(e) => setSettings({ ...settings, signature: e.target.value })} /></div>
          <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={() => void quickAction(() => updateFestivalSettings(settings), 'Festival settings saved')}>Save settings</button></div>
        </div>
      )}

      {activeTab === 'history' && (
        <DataTable columns={[{ key: 'recipientName', header: 'Guest' }, { key: 'recipientMasked', header: 'Contact' }, { key: 'channel', header: 'Channel', render: (row) => capitalize(row.channel) }, { key: 'status', header: 'Status', render: (row) => <Badge value={row.status} /> }, { key: 'sentAt', header: 'Sent', render: (row) => row.sentAt ? formatDateTime(row.sentAt) : 'Pending' }, { key: 'retryCount', header: 'Retries' }, { key: 'failedReason', header: 'Failure', render: (row) => row.failedReason || '—' }]} data={historyQuery.data} isLoading={historyQuery.isLoading} error={historyQuery.error} onSearch={historyQuery.setSearch} rowKey={entityId} pagination={{ page: historyQuery.pagination.page, totalPages: historyQuery.pagination.totalPages, total: historyQuery.pagination.total, onPageChange: historyQuery.setPage }} emptyTitle="No festival history" emptyDescription="Delivery history appears after campaigns are queued." />
      )}

      {activeTab === 'analytics' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <StatCard title="Delivery success" value={`${analytics?.deliverySuccess ?? 0}%`} icon={LineChart} />
          <StatCard title="Failed messages" value={analytics?.failedMessages ?? 0} icon={RefreshCw} />
          <StatCard title="Audience reach" value={analytics?.audienceReach ?? 0} icon={PartyPopper} />
          <StatCard title="Campaigns tracked" value={analytics?.campaignPerformance?.length ?? 0} icon={Gift} />
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2"><h2 className="text-lg font-semibold text-slate-950">Monthly trends</h2><div className="mt-4 space-y-3">{analytics?.monthlyTrends?.length ? analytics.monthlyTrends.map((item) => <div key={item.month}><div className="mb-1 flex justify-between text-sm"><span>{formatDate(`${item.month}-01`)}</span><span className="font-semibold">{item.count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.min(item.count * 10, 100)}%` }} /></div></div>) : <p className="text-sm text-slate-500">No analytics data yet.</p>}</div></div>
        </div>
      )}

      <Modal isOpen={festivalOpen} onClose={() => setFestivalOpen(false)} title={editingFestival ? 'Edit festival' : 'Create custom festival'} size="lg" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setFestivalOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void saveFestival()}>Save festival</button></div>}>
        <div className="grid gap-4 md:grid-cols-2"><FormInput label="Name" value={festivalForm.name} onChange={(e) => setFestivalForm({ ...festivalForm, name: e.target.value })} /><FormInput label="Date" type="date" value={festivalForm.date} onChange={(e) => setFestivalForm({ ...festivalForm, date: e.target.value })} /><SelectInput label="Category" value={festivalForm.category} onChange={(e) => setFestivalForm({ ...festivalForm, category: e.target.value })} options={['festival', 'national_holiday', 'global_holiday', 'seasonal_offer', 'weekend_offer', 'custom'].map((value) => ({ value, label: capitalize(value.replace(/_/g, ' ')) }))} /><FormInput label="Default offer" value={festivalForm.defaultOffer} onChange={(e) => setFestivalForm({ ...festivalForm, defaultOffer: e.target.value })} /></div><div className="mt-4"><TextArea label="Default message" value={festivalForm.defaultMessage} onChange={(e) => setFestivalForm({ ...festivalForm, defaultMessage: e.target.value })} /></div>
      </Modal>

      <Modal isOpen={templateOpen} onClose={() => setTemplateOpen(false)} title={editingTemplate ? 'Edit template' : 'Create template'} size="lg" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setTemplateOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void saveTemplate()}>Save template</button></div>}>
        <div className="grid gap-4 md:grid-cols-2"><FormInput label="Name" value={templateForm.name || ''} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} /><SelectInput label="Channel" value={templateForm.channel} onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value as FestivalChannel })} options={channelOptions} /><FormInput className="md:col-span-2" label="Subject" value={templateForm.subject || ''} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} /></div><div className="mt-4"><TextArea label="Body" value={templateForm.body || ''} onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })} /><p className="mt-2 text-xs text-slate-500">Variables: {'{{Guest Name}}'}, {'{{Hotel Name}}'}, {'{{Offer}}'}, {'{{Coupon}}'}, {'{{Booking Link}}'}, {'{{Expiry Date}}'}, {'{{Manager Name}}'}, {'{{Review Link}}'}</p></div>{editingTemplate ? <button className="btn-secondary mt-4" onClick={() => void previewFestivalTemplate(entityId(editingTemplate)).then(setTemplatePreview)}><Eye className="h-4 w-4" /> Preview</button> : null}{templatePreview ? <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold">{templatePreview.subject}</p><p className="mt-2 whitespace-pre-wrap">{templatePreview.body}</p></div> : null}
      </Modal>

      <Modal isOpen={campaignOpen} onClose={() => setCampaignOpen(false)} title={editingCampaign ? 'Edit festival campaign' : 'Create festival campaign'} size="xl" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setCampaignOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void saveCampaign()}>Save campaign</button></div>}>
        <div className="grid gap-4 md:grid-cols-2"><FormInput label="Campaign name" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} /><SelectInput label="Festival" value={campaignForm.festivalId} onChange={(e) => setCampaignForm({ ...campaignForm, festivalId: e.target.value })} options={festivalsQuery.data.map((festival) => ({ value: entityId(festival), label: festival.name }))} /><SelectInput label="Channel" value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value as FestivalChannel })} options={channelOptions} /><SelectInput label="Audience" value={campaignForm.audienceSegment} onChange={(e) => setCampaignForm({ ...campaignForm, audienceSegment: e.target.value as AudienceSegment })} options={audienceOptions} /><SelectInput label="Offer type" value={campaignForm.offer.type} onChange={(e) => setCampaignForm({ ...campaignForm, offer: { ...campaignForm.offer, type: e.target.value } })} options={offerOptions} /><FormInput label="Offer title" value={campaignForm.offer.title} onChange={(e) => setCampaignForm({ ...campaignForm, offer: { ...campaignForm.offer, title: e.target.value } })} /><FormInput label="Coupon code" value={campaignForm.offer.couponCode} onChange={(e) => setCampaignForm({ ...campaignForm, offer: { ...campaignForm.offer, couponCode: e.target.value } })} /><FormInput label="Expiry date" type="date" value={campaignForm.offer.expiryDate} onChange={(e) => setCampaignForm({ ...campaignForm, offer: { ...campaignForm.offer, expiryDate: e.target.value } })} /><SelectInput label="Delivery" value={String(campaignForm.sendNow)} onChange={(e) => setCampaignForm({ ...campaignForm, sendNow: e.target.value === 'true' })} options={[{ value: 'true', label: 'Send immediately' }, { value: 'false', label: 'Schedule later' }]} />{!campaignForm.sendNow ? <FormInput label="Schedule" type="datetime-local" value={campaignForm.scheduledAt} onChange={(e) => setCampaignForm({ ...campaignForm, scheduledAt: e.target.value })} /> : null}<SelectInput label="Recurring" value={campaignForm.recurring} onChange={(e) => setCampaignForm({ ...campaignForm, recurring: e.target.value })} options={[{ value: 'none', label: 'No recurrence' }, { value: 'yearly', label: 'Yearly campaign' }]} /></div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><h3 className="font-semibold text-slate-900">Audience filters</h3><div className="mt-3 grid gap-4 md:grid-cols-2"><FormInput label="City" value={campaignForm.audienceFilters.city} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, city: e.target.value } })} /><FormInput label="Country" value={campaignForm.audienceFilters.country} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, country: e.target.value } })} /><FormInput label="Minimum spend" type="number" value={campaignForm.audienceFilters.minSpend} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, minSpend: e.target.value } })} /><FormInput label="Minimum booking count" type="number" value={campaignForm.audienceFilters.minBookings} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, minBookings: e.target.value } })} /><FormInput className="md:col-span-2" label="Tags" hint="Comma separated tags" value={campaignForm.audienceFilters.tags} onChange={(e) => setCampaignForm({ ...campaignForm, audienceFilters: { ...campaignForm.audienceFilters, tags: e.target.value } })} /></div><button className="btn-secondary mt-4" onClick={() => void previewFestivalRecipients(campaignPayload()).then(setRecipientPreview)}>Preview recipients</button>{recipientPreview ? <div className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-700"><p className="font-semibold">{recipientPreview.total} eligible guests</p>{recipientPreview.sample.map((guest) => <p key={guest.id} className="mt-1">{guest.name} · {guest.contact}</p>)}</div> : null}</div>
      </Modal>

      <Modal isOpen={testOpen} onClose={() => setTestOpen(false)} title="Send test campaign" footer={<div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setTestOpen(false)}>Cancel</button><button className="btn-primary" onClick={() => void quickAction(() => sendFestivalTest(testForm), 'Test campaign simulated').then(() => setTestOpen(false))}>Send test</button></div>}>
        <div className="space-y-4"><SelectInput label="Channel" value={testForm.channel} onChange={(e) => setTestForm({ ...testForm, channel: e.target.value })} options={channelOptions} /><FormInput label="Recipient phone or email" value={testForm.recipient} onChange={(e) => setTestForm({ ...testForm, recipient: e.target.value })} /></div>
      </Modal>

      <ConfirmDialog isOpen={Boolean(deleteCampaignTarget)} onClose={() => setDeleteCampaignTarget(null)} onConfirm={async () => { if (!deleteCampaignTarget) return; await quickAction(() => deleteFestivalCampaign(entityId(deleteCampaignTarget)), 'Campaign deleted'); setDeleteCampaignTarget(null); }} title="Delete campaign?" message="This removes the campaign from active festival management." confirmLabel="Delete" />
      <ConfirmDialog isOpen={Boolean(deleteTemplateTarget)} onClose={() => setDeleteTemplateTarget(null)} onConfirm={async () => { if (!deleteTemplateTarget) return; await quickAction(() => deleteFestivalTemplate(entityId(deleteTemplateTarget)), 'Template deleted'); setDeleteTemplateTarget(null); }} title="Delete template?" message="This template will no longer be available for festival campaigns." confirmLabel="Delete" />
    </div>
  );
}
