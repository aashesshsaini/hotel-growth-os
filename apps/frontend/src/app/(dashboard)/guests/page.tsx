'use client';

import { Eye, Pencil, Plus, Tags } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionMenu } from '@/components/ActionMenu';
import { ConfirmDialog } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { FormInput } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
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

export default function GuestsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canView = user ? VIEW_ROLES.includes(user.role) : false;
  const canCreate = user ? CREATE_ROLES.includes(user.role) : false;
  const canManage = user ? MANAGEMENT_ROLES.includes(user.role) : false;

  const [stats, setStats] = useState<GuestStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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
      guestType: guestTypeFilter || undefined,
      source: sourceFilter || undefined,
      city: cityFilter || undefined,
      isRepeatGuest: repeatFilter ? repeatFilter === 'true' : undefined,
      isVip: vipFilter ? vipFilter === 'true' : undefined,
      isBlacklisted: blacklistedFilter ? blacklistedFilter === 'true' : undefined,
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

  const { data, pagination, isLoading, error, setPage, setSearch, refresh } = usePaginatedQuery<Guest>({
    fetchFn: fetchGuests,
    enabled: canView,
  });

  useEffect(() => {
    if (!canView) return;
    setStatsLoading(true);
    getGuestStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [canView, data.length]);

  const resetFilters = () => {
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
    <div>
      <PageHeader
        title="Guest CRM"
        subtitle="Manage guest profiles, history, and campaign targeting"
        actions={
          canCreate ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add Guest
            </button>
          ) : undefined
        }
      />

      <GuestStatsCards stats={stats} isLoading={statsLoading} />

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
