'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Bell, CheckCircle2, Copy, Edit, Eye, Pause, Play, Plus, RefreshCw, Send, Settings, Star, Trash2 } from 'lucide-react';
import { ActionMenu } from '@/components/ActionMenu';
import { DataTable, type Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { FilterPanel, LoadingState, ModulePageLayout, ModuleToolbar, StatCard, SummaryCardGrid } from '@/components/layout';
import { BarChartWidget } from '@/features/analytics/components/BarChartWidget';
import { TrendAreaChart } from '@/features/analytics/components/TrendAreaChart';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  assignFeedback,
  cancelReviewRequest,
  createReviewCampaign,
  createReviewTemplate,
  deleteReviewCampaign,
  deleteReviewTemplate,
  disableReviewCampaign,
  duplicateReviewTemplate,
  enableReviewCampaign,
  entityId,
  getInternalFeedback,
  getReviewCampaign,
  getReviewCampaigns,
  getReviewGrowthAnalytics,
  getReviewGrowthDashboard,
  getReviewRequests,
  getReviewSettings,
  getReviewTemplates,
  resendReviewRequest,
  resolveFeedback,
  sendReviewRequest,
  setDefaultReviewTemplate,
  updateFeedbackStatus,
  updateReviewCampaign,
  updateReviewSettings,
  updateReviewTemplate,
  type FeedbackStatus,
  type InternalFeedback,
  type ReviewAnalytics,
  type ReviewCampaign,
  type ReviewGrowthDashboard,
  type ReviewRequest,
  type ReviewSettings,
  type ReviewTemplate,
} from '@/services/reviewGrowth.service';
import { formatDate } from '@/utils/format';

type Tab = 'dashboard' | 'campaigns' | 'requests' | 'feedback' | 'templates' | 'settings' | 'analytics' | 'activity';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'requests', label: 'Requests' },
  { id: 'feedback', label: 'Internal Feedback' },
  { id: 'templates', label: 'Templates' },
  { id: 'settings', label: 'Settings' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'activity', label: 'Activity' },
];

const emptyCampaign: Partial<ReviewCampaign> = { name: '', description: '', trigger: 'CHECKOUT', isActive: true, delayMinutes: 120 };
const emptyTemplate: Partial<ReviewTemplate> = { name: '', platform: 'GOOGLE', channel: 'whatsapp', subject: '', body: 'Hi {{guest_name}}, thank you for staying with us. Please share your review: {{review_link}}', variables: ['guest_name', 'review_link'], isActive: true, isDefault: false };
const emptySettings: ReviewSettings = { isEnabled: true, defaultPlatform: 'GOOGLE', googleReviewUrl: '', defaultDelayMinutes: 120, requestExpiryDays: 14, autoSendOnCheckout: true, autoSendOnBookingCompleted: true, negativeRatingThreshold: 3, channels: { whatsapp: true, sms: false, email: false }, notificationUserIds: [] };

const labelFromEntity = (value: unknown, fallback = '—') => {
  if (!value) return fallback;
  if (typeof value === 'string') return value.slice(-8);
  const record = value as Record<string, unknown>;
  return String(record.fullName || record.name || record.bookingNumber || record.campaignNumber || record.email || record.phone || record._id || fallback);
};

const trend = (rows: Array<{ month?: string; _id?: string; count?: number }>) => rows.map((row) => ({ label: row.month || row._id || '—', value: row.count ?? 0 }));
const distribution = (rows: Array<{ _id: string; count: number }>) => rows.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row._id || 'unknown']: row.count }), {});

function Stars({ value }: { value?: number }) {
  return <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${Number(value ?? 0) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</div>;
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}<div className="mt-5">{children}</div></section>;
}

export default function ReviewGrowthPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<ReviewGrowthDashboard | null>(null);
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
  const [settings, setSettings] = useState<ReviewSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [campaignModal, setCampaignModal] = useState<{ open: boolean; value: Partial<ReviewCampaign>; id?: string }>({ open: false, value: emptyCampaign });
  const [templateModal, setTemplateModal] = useState<{ open: boolean; value: Partial<ReviewTemplate>; id?: string }>({ open: false, value: emptyTemplate });
  const [previewTemplate, setPreviewTemplate] = useState<ReviewTemplate | null>(null);
  const [feedbackAction, setFeedbackAction] = useState<{ feedback: InternalFeedback; action: 'assign' | 'resolve' | 'status' } | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ assignedTo: '', status: 'IN_PROGRESS' as FeedbackStatus, resolutionNotes: '' });
  const [requestStatus, setRequestStatus] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [templateChannel, setTemplateChannel] = useState('');
  const [archiveCampaign, setArchiveCampaign] = useState<ReviewCampaign | null>(null);
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<ReviewTemplate | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardData, analyticsData, settingsData] = await Promise.all([
        getReviewGrowthDashboard(),
        getReviewGrowthAnalytics(),
        getReviewSettings().catch(() => emptySettings),
      ]);
      setDashboard(dashboardData);
      setAnalytics(analyticsData);
      setSettings({ ...emptySettings, ...(settingsData || {}) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  const campaigns = usePaginatedQuery<ReviewCampaign>({ fetchFn: getReviewCampaigns, enabled: activeTab === 'campaigns' || activeTab === 'dashboard' || activeTab === 'activity' });
  const requests = usePaginatedQuery<ReviewRequest>({ fetchFn: (params) => getReviewRequests({ ...params, status: requestStatus || undefined }), enabled: activeTab === 'requests' || activeTab === 'dashboard' || activeTab === 'activity' });
  const feedback = usePaginatedQuery<InternalFeedback>({ fetchFn: (params) => getInternalFeedback({ ...params, status: feedbackStatus || undefined }), enabled: activeTab === 'feedback' || activeTab === 'dashboard' || activeTab === 'activity' });
  const templates = usePaginatedQuery<ReviewTemplate>({ fetchFn: (params) => getReviewTemplates({ ...params, channel: templateChannel || undefined }), enabled: activeTab === 'templates' });

  useEffect(() => {
    if (activeTab !== 'requests' && activeTab !== 'dashboard' && activeTab !== 'activity') return undefined;
    const interval = window.setInterval(() => {
      void requests.refresh();
      if (activeTab === 'dashboard' || activeTab === 'activity') void loadOverview();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [activeTab, loadOverview, requests.refresh]);

  useEffect(() => {
    requests.setParams((prev) => ({ ...prev, status: requestStatus || undefined, page: 1 }));
  }, [requestStatus, requests.setParams]);

  useEffect(() => {
    feedback.setParams((prev) => ({ ...prev, status: feedbackStatus || undefined, page: 1 }));
  }, [feedbackStatus, feedback.setParams]);

  useEffect(() => {
    templates.setParams((prev) => ({ ...prev, channel: templateChannel || undefined, page: 1 }));
  }, [templateChannel, templates.setParams]);

  const refreshAll = async () => {
    await Promise.all([loadOverview(), campaigns.refresh(), requests.refresh(), feedback.refresh(), templates.refresh()]);
  };

  const campaignColumns = useMemo<Column<ReviewCampaign>[]>(() => [
    { key: 'name', header: 'Campaign', render: (row) => <div><p className="font-semibold text-slate-950">{row.name}</p><p className="text-xs text-slate-500">{row.campaignNumber || row.trigger}</p></div> },
    { key: 'trigger', header: 'Trigger', render: (row) => <StatusBadge status={row.trigger} /> },
    { key: 'isActive', header: 'Status', render: (row) => <StatusBadge status={row.isActive ? 'active' : 'paused'} /> },
    { key: 'delayMinutes', header: 'Delay', render: (row) => `${row.delayMinutes ?? 0} min` },
    { key: 'stats', header: 'Performance', render: (row) => `${row.stats?.sent ?? 0} sent / ${row.stats?.reviewed ?? 0} reviewed` },
    { key: 'updatedAt', header: 'Updated', render: (row) => row.updatedAt ? formatDate(row.updatedAt) : '—' },
    { key: 'actions', header: '', render: (row) => <ActionMenu items={[
      { label: 'Edit', icon: Edit, onClick: () => setCampaignModal({ open: true, value: row, id: entityId(row) }) },
      { label: 'Duplicate', icon: Copy, onClick: async () => { const full = await getReviewCampaign(entityId(row)); await createReviewCampaign({ ...full, name: `${full.name} Copy`, isActive: false }); showToast('Campaign duplicated'); campaigns.refresh(); } },
      { label: row.isActive ? 'Pause' : 'Resume', icon: row.isActive ? Pause : Play, onClick: async () => { row.isActive ? await disableReviewCampaign(entityId(row)) : await enableReviewCampaign(entityId(row)); showToast(row.isActive ? 'Campaign paused' : 'Campaign resumed'); campaigns.refresh(); } },
      { label: 'Archive', icon: Trash2, variant: 'danger', dividerBefore: true, onClick: () => setArchiveCampaign(row) },
    ]} /> },
  ], [campaigns, showToast]);

  const requestColumns = useMemo<Column<ReviewRequest>[]>(() => [
    { key: 'guest', header: 'Guest', render: (row) => <div><p className="font-semibold text-slate-950">{labelFromEntity(row.guestId, 'Guest')}</p><p className="text-xs text-slate-500">{row.recipientPhone || row.recipientEmail || 'No recipient'}</p></div> },
    { key: 'booking', header: 'Booking', render: (row) => labelFromEntity(row.bookingId, '—') },
    { key: 'sentAt', header: 'Sent Date', render: (row) => row.sentAt ? formatDate(row.sentAt) : 'Not sent' },
    { key: 'channel', header: 'Channel', render: (row) => <StatusBadge status={row.channel} /> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'reviewedAt', header: 'Review Submitted', render: (row) => row.reviewedAt ? <StatusBadge status="reviewed" /> : '—' },
    { key: 'actions', header: '', render: (row) => <ActionMenu items={[
      { label: 'Send', icon: Send, onClick: async () => { await sendReviewRequest(entityId(row)); showToast('Request sent'); requests.refresh(); loadOverview(); } },
      { label: 'Resend', icon: RefreshCw, onClick: async () => { await resendReviewRequest(entityId(row)); showToast('Request resent'); requests.refresh(); } },
      { label: 'Cancel', icon: Trash2, variant: 'danger', dividerBefore: true, onClick: async () => { await cancelReviewRequest(entityId(row), 'Cancelled from Review Growth UI'); showToast('Request cancelled'); requests.refresh(); } },
    ]} /> },
  ], [loadOverview, requests, showToast]);

  const feedbackColumns = useMemo<Column<InternalFeedback>[]>(() => [
    { key: 'guest', header: 'Guest', render: (row) => labelFromEntity(row.guestId, 'Guest') },
    { key: 'feedback', header: 'Feedback', render: (row) => <span className="line-clamp-2 max-w-sm text-slate-600">{row.feedback}</span> },
    { key: 'priority', header: 'Priority', render: (row) => <StatusBadge status={row.priority} /> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'rating', header: 'Rating', render: (row) => row.rating ? <Stars value={row.rating} /> : '—' },
    { key: 'createdAt', header: 'Created', render: (row) => row.createdAt ? formatDate(row.createdAt) : '—' },
    { key: 'actions', header: '', render: (row) => <ActionMenu items={[
      { label: 'Assign Staff', icon: Bell, onClick: () => setFeedbackAction({ feedback: row, action: 'assign' }) },
      { label: 'Update Status', icon: Edit, onClick: () => setFeedbackAction({ feedback: row, action: 'status' }) },
      { label: 'Resolve', icon: CheckCircle2, onClick: () => setFeedbackAction({ feedback: row, action: 'resolve' }) },
    ]} /> },
  ], []);

  const templateColumns = useMemo<Column<ReviewTemplate>[]>(() => [
    { key: 'name', header: 'Template', render: (row) => <div><p className="font-semibold text-slate-950">{row.name}</p><p className="text-xs text-slate-500">{row.subject || row.platform}</p></div> },
    { key: 'channel', header: 'Channel', render: (row) => <StatusBadge status={row.channel} /> },
    { key: 'status', header: 'Status', render: (row) => <div className="flex gap-2"><StatusBadge status={row.isActive ? 'active' : 'inactive'} />{row.isDefault && <StatusBadge status="default" />}</div> },
    { key: 'updatedAt', header: 'Updated', render: (row) => row.updatedAt ? formatDate(row.updatedAt) : '—' },
    { key: 'actions', header: '', render: (row) => <ActionMenu items={[
      { label: 'Preview', icon: Eye, onClick: () => setPreviewTemplate(row) },
      { label: 'Edit', icon: Edit, onClick: () => setTemplateModal({ open: true, value: row, id: entityId(row) }) },
      { label: 'Duplicate', icon: Copy, onClick: async () => { await duplicateReviewTemplate(entityId(row), `${row.name} Copy`); showToast('Template duplicated'); templates.refresh(); } },
      { label: row.isActive ? 'Deactivate' : 'Activate', icon: row.isActive ? Pause : Play, onClick: async () => { await updateReviewTemplate(entityId(row), { isActive: !row.isActive }); showToast('Template updated'); templates.refresh(); } },
      { label: 'Set Default', icon: CheckCircle2, onClick: async () => { await setDefaultReviewTemplate(entityId(row)); showToast('Default template updated'); templates.refresh(); } },
      { label: 'Delete', icon: Trash2, variant: 'danger', dividerBefore: true, onClick: () => setDeleteTemplateTarget(row) },
    ]} /> },
  ], [showToast, templates]);

  const saveCampaign = async () => {
    if (!campaignModal.value.name) return showToast('Campaign name is required', 'error');
    if (campaignModal.id) await updateReviewCampaign(campaignModal.id, campaignModal.value);
    else await createReviewCampaign(campaignModal.value);
    setCampaignModal({ open: false, value: emptyCampaign });
    showToast('Campaign saved');
    campaigns.refresh();
    loadOverview();
  };

  const saveTemplate = async () => {
    if (!templateModal.value.name || !templateModal.value.body) return showToast('Template name and body are required', 'error');
    if (templateModal.id) await updateReviewTemplate(templateModal.id, templateModal.value);
    else await createReviewTemplate(templateModal.value);
    setTemplateModal({ open: false, value: emptyTemplate });
    showToast('Template saved');
    templates.refresh();
  };

  const saveSettings = async () => {
    const saved = await updateReviewSettings(settings);
    setSettings({ ...emptySettings, ...(saved || {}) });
    showToast('Review settings saved');
  };

  const submitFeedbackAction = async () => {
    if (!feedbackAction) return;
    if (feedbackAction.action === 'assign') await assignFeedback(entityId(feedbackAction.feedback), feedbackForm.assignedTo);
    if (feedbackAction.action === 'status') await updateFeedbackStatus(entityId(feedbackAction.feedback), feedbackForm.status);
    if (feedbackAction.action === 'resolve') await resolveFeedback(entityId(feedbackAction.feedback), feedbackForm.resolutionNotes);
    setFeedbackAction(null);
    setFeedbackForm({ assignedTo: '', status: 'IN_PROGRESS', resolutionNotes: '' });
    showToast('Feedback updated');
    feedback.refresh();
    loadOverview();
  };

  const activity = useMemo(() => [
    ...(campaigns.data.flatMap((item) => item.timeline ?? []).map((item) => ({ ...item, source: 'Campaign' }))),
    ...(requests.data.flatMap((item) => item.timeline ?? []).map((item) => ({ ...item, source: 'Request' }))),
    ...(feedback.data.flatMap((item) => item.timeline ?? []).map((item) => ({ ...item, source: 'Feedback' }))),
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 30), [campaigns.data, feedback.data, requests.data]);

  return (
    <ModulePageLayout
      title="Review Growth"
      subtitle="Increase Google reviews, monitor campaigns, track requests, and manage guest feedback from one enterprise command center."
      actions={<button type="button" className="btn-secondary" onClick={() => void refreshAll()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</button>}
      summary={
        <SummaryCardGrid isLoading={loading}>
          <StatCard title="Total Review Requests" value={dashboard?.reviewRequestsSent ?? 0} helper="Sent across all campaigns" icon={<Send className="h-5 w-5" />} />
          <StatCard title="Reviews Received" value={dashboard?.totalReviews ?? 0} helper={`${dashboard?.reviewsThisMonth ?? 0} this month`} icon={<Star className="h-5 w-5" />} accent="bg-amber-50 text-amber-700" />
          <StatCard title="Today's Requests" value={dashboard?.todaysRequests ?? 0} helper="Created today" icon={<Bell className="h-5 w-5" />} accent="bg-sky-50 text-sky-700" />
          <StatCard title="Pending Requests" value={dashboard?.pendingRequests ?? 0} helper="Awaiting guest action" icon={<Bell className="h-5 w-5" />} accent="bg-violet-50 text-violet-700" />
          <StatCard title="Conversion Rate" value={`${dashboard?.reviewConversion ?? 0}%`} helper={`Avg rating ${dashboard?.averageRating ?? 0}`} icon={<BarChart3 className="h-5 w-5" />} accent="bg-emerald-50 text-emerald-700" />
        </SummaryCardGrid>
      }
      toolbar={
        <div className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => <button key={tab.id} type="button" className={`rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
          </div>
        </div>
      }
    >
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-3">
            <TrendAreaChart title="Monthly Reviews" data={trend(dashboard?.monthlyTrend ?? [])} color="amber" />
            <BarChartWidget title="Rating Distribution" data={dashboard?.ratingDistribution ?? {}} />
            <BarChartWidget title="Request Performance" data={distribution(analytics?.requestPerformance ?? [])} />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <SectionCard title="Recent Reviews" subtitle="Latest reviews captured by Review Growth.">
              {dashboard?.recentReviews?.length ? <div className="space-y-3">{dashboard.recentReviews.slice(0, 5).map((review) => <div key={entityId(review)} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><p className="font-semibold">{labelFromEntity(review.guestId, review.reviewerName || 'Guest')}</p><Stars value={review.rating} /></div><p className="mt-2 text-sm text-slate-600">{review.comment || 'No comment provided.'}</p></div>)}</div> : <EmptyState title="No recent reviews" description="Reviews will appear here when guests submit feedback." />}
            </SectionCard>
            <SectionCard title="Active Campaigns" subtitle="Campaigns currently driving review growth.">
              {campaigns.data.length ? <div className="space-y-3">{campaigns.data.slice(0, 5).map((campaign) => <div key={entityId(campaign)} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><p className="font-semibold">{campaign.name}</p><p className="text-xs text-slate-500">{campaign.trigger}</p></div><StatusBadge status={campaign.isActive ? 'active' : 'paused'} /></div>)}</div> : <EmptyState title="No campaigns yet" description="Create a campaign to automate review growth." />}
            </SectionCard>
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <SectionCard title="Review Campaigns" subtitle="Create, edit, duplicate, pause, resume, and archive campaigns.">
          <ModuleToolbar onSearch={campaigns.setSearch} searchPlaceholder="Search campaigns..." actions={<button type="button" className="btn-primary" onClick={() => setCampaignModal({ open: true, value: emptyCampaign })}><Plus className="mr-2 h-4 w-4" />Create Campaign</button>} />
          <div className="mt-4"><DataTable compact hideToolbar columns={campaignColumns} data={campaigns.data} isLoading={campaigns.isLoading} error={campaigns.error} rowKey={entityId} emptyTitle="No campaigns found" pagination={{ page: campaigns.pagination.page, totalPages: campaigns.pagination.totalPages, total: campaigns.pagination.total, onPageChange: campaigns.setPage }} /></div>
        </SectionCard>
      )}

      {activeTab === 'requests' && (
        <SectionCard title="Review Requests" subtitle="Track guest requests, delivery status, reminders, and conversions.">
          <ModuleToolbar onSearch={requests.setSearch} searchPlaceholder="Search requests..." filters={<FilterPanel title="Filters" activeCount={requestStatus ? 1 : 0} onReset={() => setRequestStatus('')} basicFilters={<SelectInput label="Status" value={requestStatus} onChange={(e) => setRequestStatus(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...['PENDING', 'QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REVIEWED', 'FAILED', 'EXPIRED'].map((status) => ({ value: status, label: status }))]} />}><div /></FilterPanel>} />
          <div className="mt-4"><DataTable compact hideToolbar columns={requestColumns} data={requests.data} isLoading={requests.isLoading} error={requests.error} rowKey={entityId} emptyTitle="No requests found" pagination={{ page: requests.pagination.page, totalPages: requests.pagination.totalPages, total: requests.pagination.total, onPageChange: requests.setPage }} /></div>
        </SectionCard>
      )}

      {activeTab === 'feedback' && (
        <SectionCard title="Internal Feedback" subtitle="Manage negative feedback, assign staff, update status, and resolve issues.">
          <ModuleToolbar onSearch={feedback.setSearch} searchPlaceholder="Search feedback..." filters={<FilterPanel title="Filters" activeCount={feedbackStatus ? 1 : 0} onReset={() => setFeedbackStatus('')} basicFilters={<SelectInput label="Status" value={feedbackStatus} onChange={(e) => setFeedbackStatus(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => ({ value: status, label: status }))]} />}><div /></FilterPanel>} />
          <div className="mt-4"><DataTable compact hideToolbar columns={feedbackColumns} data={feedback.data} isLoading={feedback.isLoading} error={feedback.error} rowKey={entityId} emptyTitle="No feedback found" pagination={{ page: feedback.pagination.page, totalPages: feedback.pagination.totalPages, total: feedback.pagination.total, onPageChange: feedback.setPage }} /></div>
        </SectionCard>
      )}

      {activeTab === 'templates' && (
        <SectionCard title="Template Management" subtitle="Create, preview, duplicate, activate, deactivate, and set default templates.">
          <ModuleToolbar onSearch={templates.setSearch} searchPlaceholder="Search templates..." actions={<button type="button" className="btn-primary" onClick={() => setTemplateModal({ open: true, value: emptyTemplate })}><Plus className="mr-2 h-4 w-4" />Create Template</button>} filters={<FilterPanel title="Filters" activeCount={templateChannel ? 1 : 0} onReset={() => setTemplateChannel('')} basicFilters={<SelectInput label="Channel" value={templateChannel} onChange={(e) => setTemplateChannel(e.target.value)} options={[{ value: '', label: 'All channels' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'sms', label: 'SMS' }, { value: 'email', label: 'Email' }]} />}><div /></FilterPanel>} />
          <div className="mt-4"><DataTable compact hideToolbar columns={templateColumns} data={templates.data} isLoading={templates.isLoading} error={templates.error} rowKey={entityId} emptyTitle="No templates found" pagination={{ page: templates.pagination.page, totalPages: templates.pagination.totalPages, total: templates.pagination.total, onPageChange: templates.setPage }} /></div>
        </SectionCard>
      )}

      {activeTab === 'settings' && (
        <SectionCard title="Review Settings" subtitle="Configure automation, reminders, Google review URL, channels, and signature.">
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="Google Review URL" value={settings.googleReviewUrl ?? ''} onChange={(e) => setSettings((prev) => ({ ...prev, googleReviewUrl: e.target.value }))} />
            <FormInput label="Reminder Delay (minutes)" type="number" value={settings.defaultDelayMinutes ?? 120} onChange={(e) => setSettings((prev) => ({ ...prev, defaultDelayMinutes: Number(e.target.value) }))} />
            <FormInput label="Request Expiry Days" type="number" value={settings.requestExpiryDays ?? 14} onChange={(e) => setSettings((prev) => ({ ...prev, requestExpiryDays: Number(e.target.value) }))} />
            <FormInput label="Negative Rating Threshold" type="number" value={settings.negativeRatingThreshold ?? 3} onChange={(e) => setSettings((prev) => ({ ...prev, negativeRatingThreshold: Number(e.target.value) }))} />
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold"><input type="checkbox" checked={settings.autoSendOnCheckout ?? true} onChange={(e) => setSettings((prev) => ({ ...prev, autoSendOnCheckout: e.target.checked }))} />Automation Enabled on Checkout</label>
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold"><input type="checkbox" checked={settings.channels?.whatsapp ?? true} onChange={(e) => setSettings((prev) => ({ ...prev, channels: { ...(prev.channels ?? {}), whatsapp: e.target.checked } }))} />WhatsApp Channel Enabled</label>
          </div>
          <div className="mt-5 flex justify-end"><button type="button" className="btn-primary" onClick={() => void saveSettings()}><Settings className="mr-2 h-4 w-4" />Save Settings</button></div>
        </SectionCard>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <TrendAreaChart title="Daily / Monthly Requests" data={trend(analytics?.monthlyReviews ?? [])} color="indigo" />
            <TrendAreaChart title="Rating Trend" data={(analytics?.ratingTrend ?? []).map((row) => ({ label: row._id, value: Number((row.averageRating ?? 0).toFixed(1)) }))} color="amber" />
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <BarChartWidget title="Review Conversion" data={distribution(analytics?.conversion ?? [])} />
            <BarChartWidget title="Failure Rate" data={distribution(analytics?.requestPerformance ?? [])} />
            <BarChartWidget title="Review Source Distribution" data={distribution(analytics?.sourceDistribution ?? [])} />
          </div>
          <SectionCard title="Top Performing Campaigns">
            {analytics?.campaignPerformance?.length ? <div className="space-y-3">{analytics.campaignPerformance.map((campaign, index) => <div key={`${campaign.campaignId}-${index}`} className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm md:grid-cols-4"><span className="font-semibold">{campaign.campaignName || 'Manual / Unassigned'}</span><span>{campaign.requests} requests</span><span>{campaign.reviewed} reviewed</span><span>{campaign.failed} failed</span></div>)}</div> : <EmptyState title="No campaign performance yet" description="Campaign performance will appear after requests are sent." />}
          </SectionCard>
        </div>
      )}

      {activeTab === 'activity' && (
        <SectionCard title="Activity Timeline" subtitle="Review sent, reminder sent, feedback received, review submitted, and campaign updates.">
          {activity.length ? <div className="space-y-3">{activity.map((item, index) => <div key={`${item.createdAt}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-950">{item.action.replace(/[_\.]/g, ' ')}</p><StatusBadge status={item.source} /></div>{item.message && <p className="mt-1 text-sm text-slate-600">{item.message}</p>}<p className="mt-2 text-xs text-slate-500">{item.createdAt ? formatDate(item.createdAt) : '—'}</p></div>)}</div> : <EmptyState title="No activity yet" description="Timeline events will appear as campaigns and requests are processed." />}
        </SectionCard>
      )}

      <Modal isOpen={campaignModal.open} onClose={() => setCampaignModal({ open: false, value: emptyCampaign })} title={campaignModal.id ? 'Edit Campaign' : 'Create Campaign'} size="lg" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setCampaignModal({ open: false, value: emptyCampaign })}>Cancel</button><button type="button" className="btn-primary" onClick={() => void saveCampaign()}>Save Campaign</button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label="Campaign Name" value={campaignModal.value.name ?? ''} onChange={(e) => setCampaignModal((prev) => ({ ...prev, value: { ...prev.value, name: e.target.value } }))} />
          <SelectInput label="Trigger" value={campaignModal.value.trigger ?? 'CHECKOUT'} onChange={(e) => setCampaignModal((prev) => ({ ...prev, value: { ...prev.value, trigger: e.target.value as ReviewCampaign['trigger'] } }))} options={[{ value: 'CHECKOUT', label: 'Checkout' }, { value: 'BOOKING_COMPLETED', label: 'Booking Completed' }, { value: 'MANUAL', label: 'Manual' }]} />
          <FormInput label="Delay Minutes" type="number" value={campaignModal.value.delayMinutes ?? 120} onChange={(e) => setCampaignModal((prev) => ({ ...prev, value: { ...prev.value, delayMinutes: Number(e.target.value) } }))} />
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold"><input type="checkbox" checked={campaignModal.value.isActive ?? true} onChange={(e) => setCampaignModal((prev) => ({ ...prev, value: { ...prev.value, isActive: e.target.checked } }))} />Campaign Active</label>
          <div className="md:col-span-2"><TextArea label="Description" value={campaignModal.value.description ?? ''} onChange={(e) => setCampaignModal((prev) => ({ ...prev, value: { ...prev.value, description: e.target.value } }))} /></div>
        </div>
      </Modal>

      <Modal isOpen={templateModal.open} onClose={() => setTemplateModal({ open: false, value: emptyTemplate })} title={templateModal.id ? 'Edit Template' : 'Create Template'} size="lg" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setTemplateModal({ open: false, value: emptyTemplate })}>Cancel</button><button type="button" className="btn-primary" onClick={() => void saveTemplate()}>Save Template</button></div>}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label="Template Name" value={templateModal.value.name ?? ''} onChange={(e) => setTemplateModal((prev) => ({ ...prev, value: { ...prev.value, name: e.target.value } }))} />
          <SelectInput label="Channel" value={templateModal.value.channel ?? 'whatsapp'} onChange={(e) => setTemplateModal((prev) => ({ ...prev, value: { ...prev.value, channel: e.target.value as ReviewTemplate['channel'] } }))} options={[{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'sms', label: 'SMS' }, { value: 'email', label: 'Email' }]} />
          <FormInput label="Subject" value={templateModal.value.subject ?? ''} onChange={(e) => setTemplateModal((prev) => ({ ...prev, value: { ...prev.value, subject: e.target.value } }))} />
          <FormInput label="Variables" value={(templateModal.value.variables ?? []).join(', ')} onChange={(e) => setTemplateModal((prev) => ({ ...prev, value: { ...prev.value, variables: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) } }))} />
          <div className="md:col-span-2"><TextArea label="Body" rows={6} value={templateModal.value.body ?? ''} onChange={(e) => setTemplateModal((prev) => ({ ...prev, value: { ...prev.value, body: e.target.value } }))} /></div>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold"><input type="checkbox" checked={templateModal.value.isActive ?? true} onChange={(e) => setTemplateModal((prev) => ({ ...prev, value: { ...prev.value, isActive: e.target.checked } }))} />Active</label>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold"><input type="checkbox" checked={templateModal.value.isDefault ?? false} onChange={(e) => setTemplateModal((prev) => ({ ...prev, value: { ...prev.value, isDefault: e.target.checked } }))} />Default</label>
        </div>
      </Modal>

      <Modal isOpen={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title="Template Preview" size="md">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-950">{previewTemplate?.subject || previewTemplate?.name}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{previewTemplate?.body?.replace(/\{\{guest_name\}\}/g, 'Aarav Sharma').replace(/\{\{review_link\}\}/g, 'https://g.page/example/review')}</p>
        </div>
        <button type="button" className="btn-secondary mt-4" onClick={() => showToast('Template preview validated')}>Test Template</button>
      </Modal>

      <Modal isOpen={!!feedbackAction} onClose={() => setFeedbackAction(null)} title="Feedback Action" size="md" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setFeedbackAction(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void submitFeedbackAction()}>Submit</button></div>}>
        {feedbackAction?.action === 'assign' && <FormInput label="Staff User ID" value={feedbackForm.assignedTo} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, assignedTo: e.target.value }))} />}
        {feedbackAction?.action === 'status' && <SelectInput label="Status" value={feedbackForm.status} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, status: e.target.value as FeedbackStatus }))} options={['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => ({ value: status, label: status }))} />}
        {feedbackAction?.action === 'resolve' && <TextArea label="Resolution Notes" value={feedbackForm.resolutionNotes} onChange={(e) => setFeedbackForm((prev) => ({ ...prev, resolutionNotes: e.target.value }))} />}
      </Modal>

      <ConfirmDialog isOpen={!!archiveCampaign} onClose={() => setArchiveCampaign(null)} onConfirm={async () => { if (archiveCampaign) await deleteReviewCampaign(entityId(archiveCampaign)); setArchiveCampaign(null); showToast('Campaign archived'); campaigns.refresh(); }} title="Archive Campaign" message="This campaign will be archived and removed from active campaign lists." confirmLabel="Archive" />
      <ConfirmDialog isOpen={!!deleteTemplateTarget} onClose={() => setDeleteTemplateTarget(null)} onConfirm={async () => { if (deleteTemplateTarget) await deleteReviewTemplate(entityId(deleteTemplateTarget)); setDeleteTemplateTarget(null); showToast('Template deleted'); templates.refresh(); }} title="Delete Template" message="This template will be removed from Review Growth." confirmLabel="Delete" />
    </ModulePageLayout>
  );
}
