'use client';

import {
  Building2,
  CalendarPlus,
  Clock,
  Crown,
  Eye,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Star,
  Tags,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionMenu } from '@/components/ActionMenu';
import { ConfirmDialog } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { FormInput } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { GuestBadges, GuestStatusBadge } from '@/features/guests/GuestBadges';
import { GuestDetailDrawer } from '@/features/guests/GuestDetailDrawer';
import { GuestFilters } from '@/features/guests/GuestFilters';
import { GuestForm } from '@/features/guests/GuestForm';
import { GuestPreferencesForm } from '@/features/guests/GuestPreferencesForm';
import { GuestStatsCards } from '@/features/guests/GuestStatsCards';
import { MergeGuestModal } from '@/features/guests/MergeGuestModal';
import {
  CREATE_ROLES,
  MANAGEMENT_ROLES,
  VIEW_ROLES,
  emptyGuestForm,
  getGuestDisplayName,
  guestToForm,
} from '@/features/guests/constants';
import { useAuth } from '@/hooks/useAuth';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  blacklistGuest,
  createGuest,
  deleteGuest,
  getGuestById,
  getGuestHistory,
  getGuestStats,
  getGuests,
  mergeGuests,
  removeGuestDocument,
  unblockGuest,
  updateGuest,
  updateGuestPreferences,
  updateGuestTags,
  uploadGuestDocument,
} from '@/services/guests.service';
import type { Guest, GuestFormData, GuestHistory, GuestStats } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatCurrency, formatDate } from '@/utils/format';

type GuestSegment = 'all' | 'new' | 'repeat' | 'vip' | 'corporate' | 'inactive';

const getMonthStartInput = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
};

const openWhatsApp = (phone: string) => {
  const normalized = phone.replace(/\D/g, '');
  if (!normalized) return;
  window.open(`https://wa.me/${normalized}`, '_blank', 'noopener,noreferrer');
};

const GuestSegmentBar = ({
  active,
  onChange,
  stats,
}: {
  active: GuestSegment;
  onChange: (segment: GuestSegment) => void;
  stats: GuestStats | null;
}) => {
  const segments: Array<{
    id: GuestSegment;
    label: string;
    helper: string;
    icon: React.ElementType;
    count?: number;
  }> = [
    { id: 'all', label: 'All Guests', helper: 'Complete CRM list', icon: Users, count: stats?.totalGuests },
    { id: 'new', label: 'New Guests', helper: 'This month', icon: UserPlus, count: stats?.newGuestsThisMonth },
    { id: 'repeat', label: 'Repeat Guests', helper: 'Loyal customers', icon: RefreshCw, count: stats?.repeatGuests },
    { id: 'vip', label: 'VIP Guests', helper: 'High-touch profiles', icon: Crown, count: stats?.vipGuests },
    { id: 'corporate', label: 'Corporate', helper: 'Business segment', icon: Building2 },
    { id: 'inactive', label: 'Inactive', helper: 'No booking recently', icon: Clock, count: stats?.inactiveGuests },
  ];

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {segments.map((segment) => {
        const Icon = segment.icon;
        const selected = active === segment.id;
        return (
          <button
            key={segment.id}
            type="button"
            onClick={() => onChange(segment.id)}
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              selected
                ? 'border-indigo-300 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-100'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className={`rounded-xl p-2 ${selected ? 'bg-white text-indigo-700' : 'bg-slate-50 text-slate-500'}`}>
                <Icon className="h-5 w-5" />
              </div>
              {segment.count !== undefined && (
                <span className="text-lg font-bold text-slate-950">{segment.count}</span>
              )}
            </div>
            <div className="mt-3 text-sm font-semibold">{segment.label}</div>
            <div className="mt-1 text-xs text-slate-500">{segment.helper}</div>
          </button>
        );
      })}
    </div>
  );
};

export default function GuestsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canView = user ? VIEW_ROLES.includes(user.role) : false;
  const canCreate = user ? CREATE_ROLES.includes(user.role) : false;
  const canManage = user ? MANAGEMENT_ROLES.includes(user.role) : false;

  const [stats, setStats] = useState<GuestStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [segmentFilter, setSegmentFilter] = useState<GuestSegment>('all');

  const [guestTypeFilter, setGuestTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [repeatFilter, setRepeatFilter] = useState('');
  const [vipFilter, setVipFilter] = useState('');
  const [blacklistedFilter, setBlacklistedFilter] = useState('');
  const [birthdayMonthFilter, setBirthdayMonthFilter] = useState('');
  const [anniversaryMonthFilter, setAnniversaryMonthFilter] = useState('');
  const [minSpendFilter, setMinSpendFilter] = useState('');
  const [maxSpendFilter, setMaxSpendFilter] = useState('');
  const [lastBookingFrom, setLastBookingFrom] = useState('');
  const [lastBookingTo, setLastBookingTo] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');
  const [whatsappConsentFilter, setWhatsappConsentFilter] = useState('');
  const [campaignEligibleFilter, setCampaignEligibleFilter] = useState('');

  const listParams = useMemo(
    () => ({
      guestType: segmentFilter === 'corporate' ? 'corporate' : guestTypeFilter || undefined,
      source: sourceFilter || undefined,
      city: cityFilter || undefined,
      isRepeatGuest: segmentFilter === 'repeat' ? true : repeatFilter ? repeatFilter === 'true' : undefined,
      isVip: segmentFilter === 'vip' ? true : vipFilter ? vipFilter === 'true' : undefined,
      isBlacklisted: blacklistedFilter ? blacklistedFilter === 'true' : undefined,
      createdFrom: segmentFilter === 'new' ? getMonthStartInput() : undefined,
      notBookedSinceDays: segmentFilter === 'inactive' ? 180 : undefined,
      birthdayMonth: birthdayMonthFilter ? Number(birthdayMonthFilter) : undefined,
      anniversaryMonth: anniversaryMonthFilter ? Number(anniversaryMonthFilter) : undefined,
      minTotalSpend: minSpendFilter ? Number(minSpendFilter) : undefined,
      maxTotalSpend: maxSpendFilter ? Number(maxSpendFilter) : undefined,
      lastBookingFrom: lastBookingFrom || undefined,
      lastBookingTo: lastBookingTo || undefined,
      tags: tagsFilter || undefined,
      whatsappConsent: whatsappConsentFilter ? whatsappConsentFilter === 'true' : undefined,
      campaignEligible: campaignEligibleFilter ? campaignEligibleFilter === 'true' : undefined,
    }),
    [
      segmentFilter,
      guestTypeFilter,
      sourceFilter,
      cityFilter,
      repeatFilter,
      vipFilter,
      blacklistedFilter,
      birthdayMonthFilter,
      anniversaryMonthFilter,
      minSpendFilter,
      maxSpendFilter,
      lastBookingFrom,
      lastBookingTo,
      tagsFilter,
      whatsappConsentFilter,
      campaignEligibleFilter,
    ]
  );

  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;

  const fetchGuests = useCallback(
    (params: Parameters<typeof getGuests>[0]) => getGuests({ ...params, ...listParamsRef.current }),
    []
  );

  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } = usePaginatedQuery<Guest>({
    fetchFn: fetchGuests,
    enabled: canView,
  });

  useEffect(() => {
    if (!canView) return;
    setParams((current) => ({ ...current, ...listParams, page: 1 }));
  }, [canView, listParams, setParams]);

  useEffect(() => {
    if (!canView) return;
    setStatsLoading(true);
    getGuestStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [canView, data.length]);

  const resetFilters = () => {
    setSegmentFilter('all');
    setGuestTypeFilter('');
    setSourceFilter('');
    setCityFilter('');
    setRepeatFilter('');
    setVipFilter('');
    setBlacklistedFilter('');
    setBirthdayMonthFilter('');
    setAnniversaryMonthFilter('');
    setMinSpendFilter('');
    setMaxSpendFilter('');
    setLastBookingFrom('');
    setLastBookingTo('');
    setTagsFilter('');
    setWhatsappConsentFilter('');
    setCampaignEligibleFilter('');
  };

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [form, setForm] = useState<GuestFormData>(emptyGuestForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [detailGuest, setDetailGuest] = useState<Guest | null>(null);
  const [detailHistory, setDetailHistory] = useState<GuestHistory | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<Guest | null>(null);
  const [confirmBlacklist, setConfirmBlacklist] = useState<Guest | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('');

  const [showPreferences, setShowPreferences] = useState(false);
  const [preferencesForm, setPreferencesForm] = useState({ preferences: [] as string[], foodPreference: 'no_preference', roomPreference: '', specialRequests: '' });

  const [showTags, setShowTags] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  const [showMerge, setShowMerge] = useState(false);
  const [mergeDuplicateId, setMergeDuplicateId] = useState('');
  const [mergePrimary, setMergePrimary] = useState<Guest | null>(null);

  const openCreate = () => {
    setEditingGuest(null);
    setForm(emptyGuestForm());
    setFormErrors({});
    setShowFormModal(true);
  };

  const openEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setForm(guestToForm(guest));
    setFormErrors({});
    setShowFormModal(true);
  };

  const openDetail = async (guest: Guest) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setHistoryLoading(true);
    setDetailGuest(guest);
    setDetailHistory(null);
    try {
      const [full, history] = await Promise.all([
        getGuestById(getEntityId(guest), canManage),
        getGuestHistory(getEntityId(guest)),
      ]);
      setDetailGuest(full);
      setDetailHistory(history);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load guest', 'error');
    } finally {
      setDetailLoading(false);
      setHistoryLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.phone.trim()) errors.phone = 'Phone is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (editingGuest) {
        await updateGuest(getEntityId(editingGuest), form);
        showToast('Guest updated successfully', 'success');
      } else {
        await createGuest(form);
        showToast('Guest created successfully', 'success');
      }
      setShowFormModal(false);
      refresh();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteGuest(getEntityId(confirmDelete));
      showToast('Guest deleted', 'success');
      setConfirmDelete(null);
      setDetailOpen(false);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const handleBlacklist = async () => {
    if (!confirmBlacklist || !blacklistReason.trim()) return;
    try {
      await blacklistGuest(getEntityId(confirmBlacklist), blacklistReason);
      showToast('Guest blacklisted', 'success');
      setConfirmBlacklist(null);
      setBlacklistReason('');
      if (detailGuest) void openDetail(detailGuest);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  if (!canView) {
    return (
      <div className="card p-8 text-center text-slate-600">
        You do not have permission to view guest data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-slate-950 via-indigo-700 to-purple-700 px-5 py-6 text-white sm:px-6 lg:px-8">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-100">
                Guest Relationship Center
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Guest CRM</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Manage guest profiles, segmentation, stay history, payment context, reviews, notes, and campaign readiness from one premium CRM workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20" onClick={() => refresh()}>
                <RefreshCw className="mr-2 inline h-4 w-4" />
                Refresh
              </button>
              {canCreate && (
                <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" onClick={openCreate}>
                  <Plus className="mr-2 inline h-4 w-4" />
                  Add Guest
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <GuestStatsCards stats={stats} isLoading={statsLoading} />
      <GuestSegmentBar active={segmentFilter} onChange={setSegmentFilter} stats={stats} />

      <GuestFilters
        guestTypeFilter={guestTypeFilter}
        sourceFilter={sourceFilter}
        cityFilter={cityFilter}
        repeatFilter={repeatFilter}
        vipFilter={vipFilter}
        blacklistedFilter={blacklistedFilter}
        birthdayMonthFilter={birthdayMonthFilter}
        anniversaryMonthFilter={anniversaryMonthFilter}
        minSpendFilter={minSpendFilter}
        maxSpendFilter={maxSpendFilter}
        lastBookingFrom={lastBookingFrom}
        lastBookingTo={lastBookingTo}
        tagsFilter={tagsFilter}
        whatsappConsentFilter={whatsappConsentFilter}
        campaignEligibleFilter={campaignEligibleFilter}
        onGuestTypeChange={setGuestTypeFilter}
        onSourceChange={setSourceFilter}
        onCityChange={setCityFilter}
        onRepeatChange={setRepeatFilter}
        onVipChange={setVipFilter}
        onBlacklistedChange={setBlacklistedFilter}
        onBirthdayMonthChange={setBirthdayMonthFilter}
        onAnniversaryMonthChange={setAnniversaryMonthFilter}
        onMinSpendChange={setMinSpendFilter}
        onMaxSpendChange={setMaxSpendFilter}
        onLastBookingFromChange={setLastBookingFrom}
        onLastBookingToChange={setLastBookingTo}
        onTagsChange={setTagsFilter}
        onWhatsappConsentChange={setWhatsappConsentFilter}
        onCampaignEligibleChange={setCampaignEligibleFilter}
        onReset={resetFilters}
      />

      <DataTable
        searchPlaceholder="Search guests by name, phone, email, or city..."
        emptyTitle="No guests found"
        emptyDescription="Create a guest profile or adjust filters to see CRM records here."
        columns={[
          {
            key: 'name',
            header: 'Guest Name',
            render: (row) => (
              <div>
                <div className="font-medium text-slate-900">{getGuestDisplayName(row)}</div>
                <GuestBadges guest={row} />
              </div>
            ),
          },
          { key: 'phone', header: 'Phone' },
          { key: 'email', header: 'Email', render: (row) => row.email || '—' },
          { key: 'city', header: 'City', render: (row) => row.city || '—' },
          { key: 'guestType', header: 'Type', render: (row) => (row.guestType ? capitalize(row.guestType) : '—') },
          { key: 'source', header: 'Source', render: (row) => (row.source ? capitalize(row.source) : '—') },
          { key: 'totalBookings', header: 'Bookings', render: (row) => row.totalBookings ?? row.visitCount ?? 0 },
          { key: 'totalSpend', header: 'Total Spend', render: (row) => formatCurrency(row.totalSpend ?? 0) },
          {
            key: 'lastStay',
            header: 'Last Stay',
            render: (row) => formatDate(row.lastStayDate ?? row.lastVisitAt),
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <GuestStatusBadge guest={row} />,
          },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <ActionMenu
                items={[
                  { label: 'View profile', icon: Eye, onClick: () => void openDetail(row) },
                  { label: 'Call guest', icon: Phone, onClick: () => { window.location.href = `tel:${row.phone}`; } },
                  { label: 'WhatsApp guest', icon: MessageCircle, onClick: () => openWhatsApp(row.phone) },
                  { label: 'Create booking', icon: CalendarPlus, onClick: () => { window.location.href = `/bookings?guestId=${getEntityId(row)}`; }, dividerBefore: true },
                  { label: 'Add follow-up', icon: Clock, onClick: () => { window.location.href = `/tasks?guestId=${getEntityId(row)}`; } },
                  { label: 'Request review', icon: Star, onClick: () => { window.location.href = `/reviews?guestId=${getEntityId(row)}`; } },
                  { label: 'Edit guest', icon: Pencil, onClick: () => openEdit(row), hidden: !canCreate },
                  { label: 'Add tags', icon: Tags, onClick: () => { setDetailGuest(row); setTagsInput((row.tags ?? []).join(', ')); setShowTags(true); }, hidden: !canCreate },
                ]}
              />
            ),
          },
        ]}
        data={data}
        isLoading={isLoading}
        error={error}
        onSearch={setSearch}
        rowKey={(row) => getEntityId(row)}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          onPageChange: setPage,
        }}
      />

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingGuest ? 'Edit Guest' : 'Add Guest'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingGuest ? 'Update' : 'Create'}
            </button>
          </div>
        }
      >
        {formErrors.form && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formErrors.form}</div>}
        <GuestForm form={form} errors={formErrors} onChange={setForm} />
      </Modal>

      <GuestDetailDrawer
        guest={detailGuest}
        history={detailHistory}
        isOpen={detailOpen}
        isLoading={detailLoading}
        historyLoading={historyLoading}
        canManage={canManage}
        canCreate={canCreate}
        onClose={() => setDetailOpen(false)}
        onEdit={() => detailGuest && openEdit(detailGuest)}
        onPreferences={() => {
          if (!detailGuest) return;
          setPreferencesForm({
            preferences: detailGuest.preferences ?? [],
            foodPreference: detailGuest.foodPreference ?? 'no_preference',
            roomPreference: detailGuest.roomPreference ?? '',
            specialRequests: detailGuest.specialRequests ?? '',
          });
          setShowPreferences(true);
        }}
        onTags={() => {
          if (!detailGuest) return;
          setTagsInput((detailGuest.tags ?? []).join(', '));
          setShowTags(true);
        }}
        onMerge={() => {
          setMergePrimary(detailGuest);
          setMergeDuplicateId('');
          setShowMerge(true);
        }}
        onBlacklist={() => detailGuest && setConfirmBlacklist(detailGuest)}
        onUnblock={async () => {
          if (!detailGuest) return;
          try {
            await unblockGuest(getEntityId(detailGuest));
            showToast('Guest unblocked', 'success');
            void openDetail(detailGuest);
            refresh();
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed', 'error');
          }
        }}
        onDelete={() => detailGuest && setConfirmDelete(detailGuest)}
        onDocumentUpload={async (url, documentType) => {
          if (!detailGuest) return;
          const updated = await uploadGuestDocument(getEntityId(detailGuest), { url, documentType });
          setDetailGuest(updated);
          showToast('Document uploaded', 'success');
        }}
        onDocumentRemove={async (documentId) => {
          if (!detailGuest) return;
          const updated = await removeGuestDocument(getEntityId(detailGuest), documentId);
          setDetailGuest(updated);
          showToast('Document removed', 'success');
        }}
      />

      <Modal isOpen={showPreferences} onClose={() => setShowPreferences(false)} title="Update Preferences" footer={
        <button type="button" className="btn-primary" onClick={() => void (async () => {
          if (!detailGuest) return;
          try {
            await updateGuestPreferences(getEntityId(detailGuest), preferencesForm);
            showToast('Preferences updated', 'success');
            setShowPreferences(false);
            void openDetail(detailGuest);
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed', 'error');
          }
        })()}>Save</button>
      }>
        <GuestPreferencesForm {...preferencesForm} onChange={setPreferencesForm} />
      </Modal>

      <Modal isOpen={showTags} onClose={() => setShowTags(false)} title="Update Tags" footer={
        <button type="button" className="btn-primary" onClick={() => void (async () => {
          const guest = detailGuest;
          if (!guest) return;
          try {
            await updateGuestTags(getEntityId(guest), tagsInput.split(',').map((t) => t.trim()).filter(Boolean));
            showToast('Tags updated', 'success');
            setShowTags(false);
            void openDetail(guest);
            refresh();
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed', 'error');
          }
        })()}>Save</button>
      }>
        <FormInput label="Tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="vip, corporate" />
      </Modal>

      <Modal isOpen={showMerge} onClose={() => setShowMerge(false)} title="Merge Duplicate Guest" size="md">
        <MergeGuestModal
          primaryGuest={mergePrimary}
          guests={data}
          duplicateId={mergeDuplicateId}
          onDuplicateChange={setMergeDuplicateId}
          isLoading={isSaving}
          onConfirm={() => void (async () => {
            if (!mergePrimary || !mergeDuplicateId) return;
            setIsSaving(true);
            try {
              await mergeGuests(getEntityId(mergePrimary), mergeDuplicateId);
              showToast('Guests merged', 'success');
              setShowMerge(false);
              setDetailOpen(false);
              refresh();
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Merge failed', 'error');
            } finally {
              setIsSaving(false);
            }
          })()}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Delete Guest"
        message={`Delete ${confirmDelete ? getGuestDisplayName(confirmDelete) : 'this guest'}? This is a soft delete.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <Modal isOpen={!!confirmBlacklist} onClose={() => setConfirmBlacklist(null)} title="Blacklist Guest" footer={
        <button type="button" className="btn-primary bg-red-600 hover:bg-red-700" onClick={() => void handleBlacklist()} disabled={!blacklistReason.trim()}>Blacklist</button>
      }>
        <FormInput label="Reason" value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} required />
      </Modal>
    </div>
  );
}
