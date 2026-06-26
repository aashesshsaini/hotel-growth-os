'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  LayoutGrid,
  LayoutList,
  Megaphone,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  CAMPAIGN_AUDIENCE_SEGMENTS,
  CAMPAIGN_CHANNELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
} from '@/features/campaigns/constants';
import {
  addCampaignNote,
  cancelCampaign,
  completeCampaign,
  createCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaignLogs,
  getCampaignStats,
  getCampaigns,
  launchCampaign,
  pauseCampaign,
  previewCampaignAudience,
  updateCampaign,
  updateCampaignStatus,
} from '@/services/campaigns.service';
import { staffService } from '@/services/staff.service';
import type { Campaign, CampaignAudiencePreview, CampaignFormData, CampaignLog, CampaignStats, Staff } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatCurrency, formatDate, formatDateTime } from '@/utils/format';

const emptyForm: CampaignFormData = {
  name: '',
  type: 'whatsapp_campaign',
  channel: 'whatsapp',
  message: '',
  subject: '',
  description: '',
  audienceSegment: 'all_guests',
  status: 'draft',
  scheduledAt: '',
  internalNotes: '',
};

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'running'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : status === 'completed'
      ? 'bg-blue-50 text-blue-700 ring-blue-200'
      : ['cancelled', 'failed'].includes(status)
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : status === 'paused'
          ? 'bg-orange-50 text-orange-700 ring-orange-200'
          : status === 'scheduled'
            ? 'bg-violet-50 text-violet-700 ring-violet-200'
            : 'bg-slate-50 text-slate-700 ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(status.replace(/_/g, ' '))}</span>;
}

function ChannelBadge({ channel }: { channel?: string }) {
  const value = channel || 'whatsapp';
  const tone = value === 'email' ? 'bg-indigo-50 text-indigo-700' : value === 'sms' ? 'bg-cyan-50 text-cyan-700' : 'bg-green-50 text-green-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{capitalize(value)}</span>;
}

function AudienceBadge({ segment }: { segment?: string }) {
  return <span className="inline-flex rounded-full bg-fuchsia-50 px-2.5 py-1 text-xs font-semibold text-fuchsia-700">{capitalize((segment || 'all_guests').replace(/_/g, ' '))}</span>;
}

function StatCard({ title, value, helper }: { title: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function PerformanceBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{value} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const getAssigneeName = (campaign: Campaign) =>
  typeof campaign.assignedTo === 'object' ? campaign.assignedTo.name || campaign.assignedTo.email : 'Unassigned';

export default function CampaignsPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [scheduledFrom, setScheduledFrom] = useState('');
  const [scheduledTo, setScheduledTo] = useState('');

  const listParams = useMemo(() => ({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    channel: channelFilter || undefined,
    audienceSegment: audienceFilter || undefined,
    scheduledFrom: scheduledFrom || undefined,
    scheduledTo: scheduledTo || undefined,
  }), [statusFilter, typeFilter, channelFilter, audienceFilter, scheduledFrom, scheduledTo]);

  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;
  const fetchCampaigns = useCallback(
    (params: Parameters<typeof getCampaigns>[0]) => getCampaigns({ ...params, ...listParamsRef.current }),
    []
  );
  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } = usePaginatedQuery<Campaign>({ fetchFn: fetchCampaigns });

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getCampaignStats());
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    setParams((current) => ({ ...current, ...listParams, page: 1 }));
    void loadStats();
  }, [listParams, loadStats, setParams]);

  useEffect(() => {
    void staffService.list({ limit: 100 }).then((result) => setStaff(result.data)).catch(() => setStaff([]));
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignFormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [audiencePreview, setAudiencePreview] = useState<CampaignAudiencePreview | null>(null);
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [statusTarget, setStatusTarget] = useState<Campaign | null>(null);
  const [nextStatus, setNextStatus] = useState('scheduled');
  const [statusNotes, setStatusNotes] = useState('');
  const [noteTarget, setNoteTarget] = useState<Campaign | null>(null);
  const [noteText, setNoteText] = useState('');
  const [launchTarget, setLaunchTarget] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const reload = async () => {
    await Promise.all([refresh(), loadStats()]);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditing(campaign);
    setForm({
      name: campaign.name,
      type: campaign.type,
      channel: campaign.channel || 'whatsapp',
      message: campaign.message || '',
      subject: campaign.subject || '',
      description: campaign.description || '',
      targetAudience: campaign.targetAudience || '',
      audienceSegment: campaign.audienceSegment || 'all_guests',
      scheduledAt: campaign.scheduledAt ? campaign.scheduledAt.slice(0, 16) : '',
      status: campaign.status,
      assignedTo: typeof campaign.assignedTo === 'object' ? getEntityId(campaign.assignedTo) : campaign.assignedTo || '',
      internalNotes: campaign.internalNotes || '',
      tags: campaign.tags || [],
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Campaign name is required';
    if (!form.message.trim()) errors.message = 'Message content is required';
    if (form.status === 'scheduled' && !form.scheduledAt) errors.scheduledAt = 'Schedule date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveCampaign = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        scheduledAt: form.scheduledAt || undefined,
        assignedTo: form.assignedTo || undefined,
      };
      if (editing) {
        await updateCampaign(getEntityId(editing), payload);
        showToast('Campaign updated successfully', 'success');
      } else {
        await createCampaign(payload);
        showToast('Campaign created successfully', 'success');
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save campaign', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = async (campaign: Campaign) => {
    try {
      const [full, preview, logResult] = await Promise.all([
        getCampaignById(getEntityId(campaign)),
        previewCampaignAudience(getEntityId(campaign)).catch(() => null),
        getCampaignLogs(getEntityId(campaign), { limit: 10 }).catch(() => ({ data: [] })),
      ]);
      setDetail(full);
      setAudiencePreview(preview);
      setLogs(logResult.data || []);
      setDetailOpen(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load campaign details', 'error');
    }
  };

  const handleLaunch = async () => {
    if (!launchTarget) return;
    try {
      await launchCampaign(getEntityId(launchTarget));
      showToast('Campaign launched successfully', 'success');
      setLaunchTarget(null);
      setDetailOpen(false);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to launch campaign', 'error');
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusTarget) return;
    try {
      await updateCampaignStatus(getEntityId(statusTarget), { status: nextStatus, notes: statusNotes || undefined });
      showToast('Campaign status updated', 'success');
      setStatusTarget(null);
      await reload();
      if (detail && getEntityId(detail) === getEntityId(statusTarget)) {
        setDetail(await getCampaignById(getEntityId(statusTarget)));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!noteTarget || !noteText.trim()) return;
    try {
      const updated = await addCampaignNote(getEntityId(noteTarget), { text: noteText.trim() });
      showToast('Note added', 'success');
      setNoteTarget(null);
      setNoteText('');
      if (detail && getEntityId(detail) === getEntityId(noteTarget)) setDetail(updated);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add note', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCampaign(getEntityId(deleteTarget));
      showToast('Campaign deleted', 'success');
      setDeleteTarget(null);
      setDetailOpen(false);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete campaign', 'error');
    }
  };

  const handleQuickAction = async (campaign: Campaign, action: 'pause' | 'cancel' | 'complete') => {
    try {
      const id = getEntityId(campaign);
      if (action === 'pause') await pauseCampaign(id);
      if (action === 'cancel') await cancelCampaign(id);
      if (action === 'complete') await completeCampaign(id);
      showToast(`Campaign ${action}d`, 'success');
      await reload();
      if (detail && getEntityId(detail) === id) setDetail(await getCampaignById(id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    }
  };

  const columns = [
    { key: 'name', header: 'Campaign', render: (row: Campaign) => (
      <div>
        <div className="font-semibold text-slate-900">{row.name}</div>
        <div className="text-xs text-slate-500">{row.campaignNumber || 'Draft campaign'}</div>
      </div>
    ) },
    { key: 'type', header: 'Type', render: (row: Campaign) => <span className="text-sm text-slate-700">{capitalize(row.type.replace(/_/g, ' '))}</span> },
    { key: 'channel', header: 'Channel', render: (row: Campaign) => <ChannelBadge channel={row.channel} /> },
    { key: 'audienceSegment', header: 'Audience', render: (row: Campaign) => <AudienceBadge segment={row.audienceSegment} /> },
    { key: 'status', header: 'Status', render: (row: Campaign) => <StatusBadge status={row.status} /> },
    { key: 'scheduledAt', header: 'Schedule', render: (row: Campaign) => row.scheduledAt ? formatDateTime(row.scheduledAt) : '—' },
    { key: 'stats', header: 'Performance', render: (row: Campaign) => (
      <div className="text-xs text-slate-600">
        <div>Sent: {row.stats?.sent ?? 0}/{row.stats?.total ?? 0}</div>
        <div>Leads: {row.stats?.leadsGenerated ?? 0} · Bookings: {row.stats?.bookingsGenerated ?? 0}</div>
      </div>
    ) },
    { key: 'actions', header: '', render: (row: Campaign) => (
      <div className="flex gap-1">
        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => void openDetail(row)}><Eye className="h-4 w-4" /></button>
        <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></button>
        {['draft', 'scheduled', 'paused'].includes(row.status) ? (
          <button type="button" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" onClick={() => setLaunchTarget(row)}><Play className="h-4 w-4" /></button>
        ) : null}
        <button type="button" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /></button>
      </div>
    ) },
  ];

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Megaphone className="h-3.5 w-3.5" /> Marketing & Growth
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Campaigns</h1>
          <p className="mt-1 text-sm text-slate-600">Plan, launch, and track hotel marketing campaigns across WhatsApp, SMS, and email.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void reload()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> New Campaign
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />) : (
          <>
            <StatCard title="Active Campaigns" value={stats?.activeCampaigns ?? 0} helper="Scheduled or running" />
            <StatCard title="Messages Sent" value={stats?.totalSent ?? 0} helper={`${stats?.totalDelivered ?? 0} delivered`} />
            <StatCard title="Campaign Leads" value={stats?.totalLeadsGenerated ?? 0} helper={`${stats?.totalBookingsGenerated ?? 0} bookings`} />
            <StatCard title="Campaign Revenue" value={formatCurrency(stats?.totalRevenueGenerated ?? 0)} helper={`${stats?.totalCampaigns ?? 0} total campaigns`} />
          </>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FormInput placeholder="Search campaigns..." onChange={(e) => setSearch(e.target.value)} />
          <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...CAMPAIGN_STATUSES]} />
          <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[{ value: '', label: 'All types' }, ...CAMPAIGN_TYPES]} />
          <SelectInput value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} options={[{ value: '', label: 'All channels' }, ...CAMPAIGN_CHANNELS]} />
          <SelectInput value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)} options={[{ value: '', label: 'All audiences' }, ...CAMPAIGN_AUDIENCE_SEGMENTS]} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setViewMode('grid')} className={`rounded-xl px-3 py-2 ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-600'}`}><LayoutGrid className="h-4 w-4" /></button>
            <button type="button" onClick={() => setViewMode('table')} className={`rounded-xl px-3 py-2 ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-600'}`}><LayoutList className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <FormInput type="date" label="Scheduled from" value={scheduledFrom} onChange={(e) => setScheduledFrom(e.target.value)} />
          <FormInput type="date" label="Scheduled to" value={scheduledTo} onChange={(e) => setScheduledTo(e.target.value)} />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />) : data.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-lg font-semibold text-slate-900">No campaigns yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first marketing campaign to reach guests and leads.</p>
              <button type="button" onClick={openCreate} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Create Campaign</button>
            </div>
          ) : data.map((campaign) => (
            <div key={getEntityId(campaign)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{campaign.campaignNumber || 'Draft'}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">{campaign.name}</h3>
                </div>
                <StatusBadge status={campaign.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ChannelBadge channel={campaign.channel} />
                <AudienceBadge segment={campaign.audienceSegment} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-slate-600">{campaign.message}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-slate-50 p-2"><div className="font-bold text-slate-900">{campaign.stats?.sent ?? 0}</div><div className="text-slate-500">Sent</div></div>
                <div className="rounded-xl bg-slate-50 p-2"><div className="font-bold text-slate-900">{campaign.stats?.responded ?? 0}</div><div className="text-slate-500">Responses</div></div>
                <div className="rounded-xl bg-slate-50 p-2"><div className="font-bold text-slate-900">{campaign.stats?.bookingsGenerated ?? 0}</div><div className="text-slate-500">Bookings</div></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void openDetail(campaign)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">View</button>
                <button type="button" onClick={() => openEdit(campaign)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                {['draft', 'scheduled', 'paused'].includes(campaign.status) ? (
                  <button type="button" onClick={() => setLaunchTarget(campaign)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Launch</button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable<Campaign>
          columns={columns}
          data={data}
          isLoading={isLoading}
          error={error}
          onSearch={setSearch}
          searchPlaceholder="Search campaigns..."
          rowKey={(row) => getEntityId(row)}
          emptyTitle="No campaigns found"
          emptyDescription="Create your first marketing campaign to reach guests and leads."
          pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Campaign' : 'Create Campaign'} size="lg">
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label="Campaign Name" value={form.name} error={formErrors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <SelectInput label="Campaign Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={CAMPAIGN_TYPES} />
          <SelectInput label="Channel" value={form.channel || 'whatsapp'} onChange={(e) => setForm({ ...form, channel: e.target.value })} options={CAMPAIGN_CHANNELS} />
          <SelectInput label="Audience Segment" value={form.audienceSegment || 'all_guests'} onChange={(e) => setForm({ ...form, audienceSegment: e.target.value })} options={CAMPAIGN_AUDIENCE_SEGMENTS} />
          <SelectInput label="Status" value={form.status || 'draft'} onChange={(e) => setForm({ ...form, status: e.target.value })} options={CAMPAIGN_STATUSES} />
          <FormInput label="Scheduled At" type="datetime-local" value={form.scheduledAt || ''} error={formErrors.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          <SelectInput label="Assigned To" value={form.assignedTo || ''} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} options={[{ value: '', label: 'Unassigned' }, ...staff.map((s) => ({ value: getEntityId(s), label: s.fullName || s.name || s.email || 'Staff' }))]} />
          {form.channel === 'email' ? <FormInput label="Email Subject" value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} /> : null}
        </div>
        <div className="mt-4 space-y-4">
          <TextArea label="Message Content" value={form.message} error={formErrors.message} rows={5} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <TextArea label="Description" value={form.description || ''} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <TextArea label="Internal Notes" value={form.internalNotes || ''} rows={2} onChange={(e) => setForm({ ...form, internalNotes: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={() => void saveCampaign()} disabled={isSaving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? 'Saving...' : editing ? 'Update Campaign' : 'Create Campaign'}</button>
        </div>
      </Modal>

      {detailOpen && detail ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 p-4">
          <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{detail.campaignNumber}</p>
                  <h2 className="text-2xl font-bold text-slate-950">{detail.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge status={detail.status} />
                    <ChannelBadge channel={detail.channel} />
                    <AudienceBadge segment={detail.audienceSegment} />
                  </div>
                </div>
                <button type="button" onClick={() => setDetailOpen(false)} className="rounded-lg px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100">Close</button>
              </div>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard title="Audience" value={audiencePreview?.totalCount ?? detail.stats?.total ?? 0} />
                <StatCard title="Sent" value={detail.stats?.sent ?? 0} />
                <StatCard title="Responses" value={detail.stats?.responded ?? 0} />
                <StatCard title="Revenue" value={formatCurrency(detail.stats?.revenueGenerated ?? 0)} />
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Performance</h3>
                <div className="mt-4 space-y-3">
                  <PerformanceBar label="Delivered" value={detail.stats?.delivered ?? 0} total={detail.stats?.total ?? 0} />
                  <PerformanceBar label="Responded" value={detail.stats?.responded ?? 0} total={detail.stats?.total ?? 0} />
                  <PerformanceBar label="Failed" value={detail.stats?.failed ?? 0} total={detail.stats?.total ?? 0} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Users className="h-4 w-4" /> Audience Preview</h3>
                  <div className="mt-3 space-y-2">
                    {(audiencePreview?.sample ?? []).length === 0 ? <p className="text-sm text-slate-500">No audience preview available.</p> : audiencePreview?.sample.map((recipient, index) => (
                      <div key={index} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                        <div className="font-medium text-slate-900">{recipient.name}</div>
                        <div className="text-slate-500">{recipient.phone}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Schedule</h3>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Scheduled: {detail.scheduledAt ? formatDateTime(detail.scheduledAt) : 'Not scheduled'}</div>
                    <div>Launched: {detail.launchedAt ? formatDateTime(detail.launchedAt) : 'Not launched'}</div>
                    <div>Assigned: {getAssigneeName(detail)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Message Preview</h3>
                {detail.subject ? <p className="mt-2 text-sm font-medium text-slate-700">Subject: {detail.subject}</p> : null}
                <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{detail.message}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Recent Delivery Logs</h3>
                <div className="mt-3 space-y-2">
                  {logs.length === 0 ? <p className="text-sm text-slate-500">No delivery logs yet.</p> : logs.map((log) => (
                    <div key={getEntityId(log)} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-slate-900">{log.recipientName || log.phone}</div>
                        <div className="text-xs text-slate-500">{formatDateTime(log.sentAt || log.createdAt)}</div>
                      </div>
                      <StatusBadge status={log.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Timeline</h3>
                <div className="mt-3 space-y-2">
                  {(detail.timeline ?? []).length === 0 ? <p className="text-sm text-slate-500">No timeline events yet.</p> : detail.timeline?.map((item, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <div className="font-medium text-slate-900">{capitalize(item.action.replace(/_/g, ' '))}</div>
                      {item.message ? <div className="text-slate-600">{item.message}</div> : null}
                      <div className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
                  <button type="button" onClick={() => setNoteTarget(detail)} className="text-xs font-semibold text-indigo-600">Add note</button>
                </div>
                <div className="mt-3 space-y-2">
                  {(detail.notes ?? []).length === 0 ? <p className="text-sm text-slate-500">No notes yet.</p> : detail.notes?.map((note, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{note.text}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-200 p-5">
              {['draft', 'scheduled', 'paused'].includes(detail.status) ? (
                <button type="button" onClick={() => setLaunchTarget(detail)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><Send className="h-4 w-4" /> Launch</button>
              ) : null}
              {detail.status === 'running' ? (
                <>
                  <button type="button" onClick={() => void handleQuickAction(detail, 'pause')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"><Pause className="h-4 w-4" /> Pause</button>
                  <button type="button" onClick={() => void handleQuickAction(detail, 'complete')} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Complete</button>
                </>
              ) : null}
              {!['cancelled', 'completed'].includes(detail.status) ? (
                <button type="button" onClick={() => { setStatusTarget(detail); setNextStatus('cancelled'); }} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">Cancel Campaign</button>
              ) : null}
              <button type="button" onClick={() => openEdit(detail)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Edit</button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog isOpen={!!launchTarget} onClose={() => setLaunchTarget(null)} onConfirm={() => void handleLaunch()} title="Launch Campaign" message={`Launch "${launchTarget?.name}" to the selected audience? This will create delivery logs and start sending messages.`} confirmLabel="Launch Now" />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} title="Delete Campaign" message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`} confirmLabel="Delete" variant="danger" />

      <Modal isOpen={!!statusTarget} onClose={() => setStatusTarget(null)} title="Update Campaign Status">
        <SelectInput label="Status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} options={CAMPAIGN_STATUSES} />
        <div className="mt-4"><TextArea label="Notes" value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} rows={3} /></div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setStatusTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={() => void handleStatusUpdate()} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Update Status</button>
        </div>
      </Modal>

      <Modal isOpen={!!noteTarget} onClose={() => setNoteTarget(null)} title="Add Campaign Note">
        <TextArea label="Note" value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} />
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setNoteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={() => void handleAddNote()} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save Note</button>
        </div>
      </Modal>
    </div>
  );
}
