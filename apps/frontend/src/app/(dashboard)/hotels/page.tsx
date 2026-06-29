'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { Download, Eye, KeyRound, LogIn, Mail, Pencil, Plus, Power, PowerOff, Receipt, Trash2, WalletCards } from 'lucide-react';
import { ActionMenu } from '@/components/ActionMenu';
import { DataTable, type Column } from '@/components/DataTable';
import { FormInput, SelectInput } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { FilterPanel, ModulePageLayout, ModuleToolbar, StatCard, SummaryCardGrid } from '@/components/layout';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  bulkPlatformHotelAction,
  createPlatformHotel,
  deletePlatformHotel,
  exportPlatformHotel,
  getPlatformHotels,
  impersonateHotelOwner,
  resetPlatformHotelOwnerPassword,
  sendPlatformHotelOwnerEmail,
  updatePlatformHotel,
  updatePlatformHotelStatus,
  type PlatformHotel,
  type PlatformHotelPayload,
} from '@/services/platform.service';
import { storage } from '@/utils/storage';
import { formatDate } from '@/utils/format';

const planOptions = [
  { value: '', label: 'All plans' },
  { value: 'starter', label: 'Starter' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'growth', label: 'Growth' },
];

const subscriptionOptions = [
  { value: '', label: 'All subscriptions' },
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const emptyForm: PlatformHotelPayload = {
  name: '',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  email: '',
  phone: '',
  city: '',
  state: 'NA',
  country: 'India',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  plan: 'starter',
  subscriptionStatus: 'trial',
  billingType: 'trial',
  isActive: true,
};

const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function HotelsPage() {
  const { showToast } = useToast();
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [billingType, setBillingType] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [renewalFrom, setRenewalFrom] = useState('');
  const [renewalTo, setRenewalTo] = useState('');
  const [sortPreset, setSortPreset] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformHotel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformHotel | null>(null);
  const [emailTarget, setEmailTarget] = useState<PlatformHotel | null>(null);
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [bulkPlanOpen, setBulkPlanOpen] = useState(false);
  const [bulkPlan, setBulkPlan] = useState('professional');
  const [form, setForm] = useState<PlatformHotelPayload>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const fetchHotels = useCallback(
    (params: Parameters<typeof getPlatformHotels>[0]) =>
      getPlatformHotels({
        ...params,
        status: status || undefined,
        plan: plan || undefined,
        subscriptionStatus: subscriptionStatus || undefined,
        billingType: billingType || undefined,
        country: country || undefined,
        city: city || undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
        renewalFrom: renewalFrom || undefined,
        renewalTo: renewalTo || undefined,
        sortPreset: sortPreset || undefined,
      }),
    [billingType, city, country, createdFrom, createdTo, plan, renewalFrom, renewalTo, sortPreset, status, subscriptionStatus]
  );

  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } =
    usePaginatedQuery<PlatformHotel>({ fetchFn: fetchHotels });

  const activeCount = data.filter((hotel) => hotel.isActive).length;
  const inactiveCount = data.filter((hotel) => !hotel.isActive).length;
  const totalRooms = data.reduce((sum, hotel) => sum + hotel.totalRooms, 0);
  const averageHealth = data.length ? Math.round(data.reduce((sum, hotel) => sum + hotel.healthScore, 0) / data.length) : 0;
  const allSelected = data.length > 0 && data.every((hotel) => selectedIds.includes(hotel.id));
  const activeFilters = [status, plan, subscriptionStatus, billingType, country, city, createdFrom, createdTo, renewalFrom, renewalTo].filter(Boolean).length;

  const updateFilter = (key: string, value: string, setter: (value: string) => void) => {
    setter(value);
    setParams((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const resetFilters = () => {
    setStatus('');
    setPlan('');
    setSubscriptionStatus('');
    setBillingType('');
    setCountry('');
    setCity('');
    setCreatedFrom('');
    setCreatedTo('');
    setRenewalFrom('');
    setRenewalTo('');
    setParams((prev) => ({
      ...prev,
      status: undefined,
      plan: undefined,
      subscriptionStatus: undefined,
      billingType: undefined,
      country: undefined,
      city: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      renewalFrom: undefined,
      renewalTo: undefined,
      page: 1,
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (hotel: PlatformHotel) => {
    setEditing(hotel);
    setForm({
      name: hotel.name,
      slug: hotel.slug,
      ownerName: hotel.owner,
      ownerEmail: hotel.ownerEmail || '',
      ownerPhone: hotel.ownerPhone || '',
      email: hotel.email || '',
      phone: hotel.phone || '',
      city: hotel.city || '',
      state: hotel.state || 'NA',
      country: hotel.country || 'India',
      timezone: hotel.timezone,
      currency: hotel.currency,
      plan: hotel.plan as PlatformHotelPayload['plan'],
      subscriptionStatus: hotel.subscriptionStatus as PlatformHotelPayload['subscriptionStatus'],
      billingType: hotel.billingType as PlatformHotelPayload['billingType'],
      renewalDate: hotel.renewalDate,
      healthScore: hotel.healthScore,
      isActive: hotel.isActive,
    });
    setFormOpen(true);
  };

  const saveHotel = async () => {
    setIsSaving(true);
    try {
      if (editing) {
        await updatePlatformHotel(editing.id, form);
        showToast('Hotel updated');
      } else {
        await createPlatformHotel(form);
        showToast('Hotel created');
      }
      setFormOpen(false);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save hotel', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleHotel = async (hotel: PlatformHotel) => {
    try {
      await updatePlatformHotelStatus(hotel.id, !hotel.isActive, hotel.isActive ? 'Suspended by platform admin' : 'Activated by platform admin');
      showToast(hotel.isActive ? 'Hotel suspended' : 'Hotel activated');
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update hotel status', 'error');
    }
  };

  const deleteHotel = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deletePlatformHotel(deleteTarget.id);
      showToast('Hotel deleted');
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete hotel', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const impersonate = async (hotel: PlatformHotel) => {
    try {
      const response = await impersonateHotelOwner(hotel.id, 'Platform support access from Hotel Management');
      const currentToken = storage.get('token');
      if (currentToken) storage.set('platform_token', currentToken);
      storage.set('impersonation_session_id', response.sessionId);
      storage.set('impersonated_hotel_name', response.hotel.name);
      storage.set('token', response.token);
      window.location.href = '/dashboard';
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to impersonate hotel owner', 'error');
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleAllSelected = () => {
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !data.some((hotel) => hotel.id === id)) : Array.from(new Set([...prev, ...data.map((hotel) => hotel.id)]))
    );
  };

  const runBulkAction = async (action: 'activate' | 'suspend' | 'delete' | 'export' | 'assign_plan', planValue?: string) => {
    if (!selectedIds.length) return;
    setIsSaving(true);
    try {
      const result = await bulkPlatformHotelAction({ ids: selectedIds, action, plan: planValue, reason: 'Bulk action from Hotel Management' });
      if (action === 'export') downloadJson('hotel-export.json', result.rows ?? []);
      showToast(`Bulk action completed for ${result.affected} hotel(s)`);
      setSelectedIds([]);
      setBulkPlanOpen(false);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk action failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetOwnerPassword = async (hotel: PlatformHotel) => {
    try {
      const result = await resetPlatformHotelOwnerPassword(hotel.id);
      setResetResult(result.temporaryPassword);
      showToast('Temporary password generated');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to reset password', 'error');
    }
  };

  const sendEmail = async () => {
    if (!emailTarget) return;
    setIsSaving(true);
    try {
      await sendPlatformHotelOwnerEmail(emailTarget.id, emailForm);
      showToast('Email queued');
      setEmailTarget(null);
      setEmailForm({ subject: '', message: '' });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send email', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const exportHotel = async (hotel: PlatformHotel) => {
    try {
      const payload = await exportPlatformHotel(hotel.id);
      downloadJson(`${hotel.slug || hotel.id}-export.json`, payload);
      showToast('Hotel export ready');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to export hotel', 'error');
    }
  };

  const columns = useMemo<Column<PlatformHotel>[]>(
    () => [
      {
        key: 'select',
        header: '',
        render: (hotel) => (
          <input
            aria-label={`Select ${hotel.name}`}
            type="checkbox"
            checked={selectedIds.includes(hotel.id)}
            onChange={() => toggleSelected(hotel.id)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        ),
      },
      {
        key: 'hotel',
        header: 'Hotel',
        render: (hotel) => (
          <div className="flex min-w-64 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">
              {hotel.logo ? <img src={hotel.logo} alt="" className="h-10 w-10 rounded-xl object-cover" /> : hotel.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <Link href={`/hotels/${hotel.id}`} className="font-semibold text-slate-950 hover:text-indigo-700">
                {hotel.name}
              </Link>
              <div className="text-xs text-slate-500">{hotel.city || 'City'} · {hotel.country || 'Country'}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'owner',
        header: 'Owner / Contact',
        render: (hotel) => (
          <div>
            {hotel.owner}
            <div className="text-xs text-slate-500">{hotel.ownerEmail || 'No email'}</div>
            <div className="text-xs text-slate-500">{hotel.phone || hotel.ownerPhone || 'No phone'}</div>
          </div>
        ),
      },
      { key: 'locale', header: 'Locale', render: (hotel) => <div>{hotel.timezone}<div className="text-xs text-slate-500">{hotel.currency}</div></div> },
      { key: 'plan', header: 'Plan', render: (hotel) => <div className="space-y-1"><StatusBadge status={hotel.plan} /><div><StatusBadge status={hotel.billingType} /></div></div> },
      { key: 'subscription', header: 'Subscription', render: (hotel) => <div><StatusBadge status={hotel.subscriptionStatus} /><div className="mt-1 text-xs text-slate-500">Renewal {hotel.renewalDate ? formatDate(hotel.renewalDate) : '—'}</div></div> },
      { key: 'scale', header: 'Scale', render: (hotel) => <div>{hotel.totalRooms} rooms<div className="text-xs text-slate-500">{hotel.totalStaff} staff · {hotel.currentOccupancy}% occ.</div></div> },
      {
        key: 'health',
        header: 'Health',
        render: (hotel) => (
          <div className="min-w-24">
            <div className="text-sm font-semibold text-slate-900">{hotel.healthScore}%</div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${hotel.healthScore}%` }} />
            </div>
          </div>
        ),
      },
      { key: 'dates', header: 'Activity', render: (hotel) => <div>Last login {hotel.lastLoginAt ? formatDate(hotel.lastLoginAt) : '—'}<div className="text-xs text-slate-500">Created {hotel.createdAt ? formatDate(hotel.createdAt) : '—'}</div></div> },
      { key: 'status', header: 'Status', render: (hotel) => <StatusBadge status={hotel.status} /> },
      {
        key: 'actions',
        header: '',
        className: 'text-right',
        render: (hotel) => (
          <ActionMenu
            items={[
              { label: 'View', icon: Eye, onClick: () => { window.location.href = `/hotels/${hotel.id}`; } },
              { label: 'Edit', icon: Pencil, onClick: () => openEdit(hotel) },
              { label: 'Impersonate Owner', icon: LogIn, onClick: () => void impersonate(hotel) },
              { label: 'Manage Subscription', icon: WalletCards, onClick: () => openEdit(hotel), dividerBefore: true },
              { label: 'View Billing', icon: Receipt, onClick: () => { window.location.href = `/billing?hotelId=${hotel.id}`; } },
              { label: hotel.isActive ? 'Suspend' : 'Activate', icon: hotel.isActive ? PowerOff : Power, onClick: () => void toggleHotel(hotel), dividerBefore: true },
              { label: 'Reset Password', icon: KeyRound, onClick: () => void resetOwnerPassword(hotel) },
              { label: 'Send Email', icon: Mail, onClick: () => setEmailTarget(hotel) },
              { label: 'Export Data', icon: Download, onClick: () => void exportHotel(hotel) },
              { label: 'Delete', icon: Trash2, onClick: () => setDeleteTarget(hotel), variant: 'danger', dividerBefore: true },
            ]}
          />
        ),
      },
    ],
    [selectedIds]
  );

  return (
    <PlatformOnly>
      <ModulePageLayout
        title="Hotel Management"
        subtitle="Central SaaS control panel for tenants, owners, subscriptions, health, and support actions."
        actions={<button type="button" className="btn-primary" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Create Hotel</button>}
        summary={
          <SummaryCardGrid columns={4}>
            <StatCard title="Hotels On Page" value={data.length} helper={`${activeCount} active`} />
            <StatCard title="Inactive" value={inactiveCount} helper="Suspended or expired tenants" />
            <StatCard title="Rooms Managed" value={totalRooms} helper="Across listed tenants" />
            <StatCard title="Avg Health" value={`${averageHealth}%`} helper="Future-ready tenant score" />
          </SummaryCardGrid>
        }
        toolbar={
          <ModuleToolbar
            onSearch={setSearch}
            searchPlaceholder="Search hotel name, owner, email, phone..."
            actions={
              selectedIds.length > 0 && (
                <>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">{selectedIds.length} selected</span>
                  <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => void runBulkAction('activate')}>Activate</button>
                  <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => void runBulkAction('suspend')}>Suspend</button>
                  <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => setBulkPlanOpen(true)}>Assign Plan</button>
                  <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => void runBulkAction('export')}>Export</button>
                  <button type="button" className="btn-danger !px-3 !py-2" onClick={() => void runBulkAction('delete')}>Delete</button>
                </>
              )
            }
            filters={
              <FilterPanel
                title="Smart Filters"
                activeCount={activeFilters}
                onReset={resetFilters}
                basicFilters={
                  <>
                    <button type="button" className="btn-secondary !px-3 !py-2" onClick={toggleAllSelected}>
                      {allSelected ? 'Clear Page' : 'Select Page'}
                    </button>
                    <div className="filter-field">
                      <SelectInput label="Status" value={status} onChange={(event) => updateFilter('status', event.target.value, setStatus)} options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }, { value: 'trial', label: 'Trial' }, { value: 'expired', label: 'Expired' }]} />
                    </div>
                    <div className="filter-field">
                      <SelectInput label="Plan" value={plan} onChange={(event) => updateFilter('plan', event.target.value, setPlan)} options={planOptions} />
                    </div>
                    <div className="filter-field">
                      <SelectInput label="Sort" value={sortPreset} onChange={(event) => updateFilter('sortPreset', event.target.value, setSortPreset)} options={[{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'name', label: 'Name' }, { value: 'renewal', label: 'Renewal' }, { value: 'hotels_count', label: 'Hotels Count' }]} />
                    </div>
                  </>
                }
              >
                <SelectInput label="Subscription" value={subscriptionStatus} onChange={(event) => updateFilter('subscriptionStatus', event.target.value, setSubscriptionStatus)} options={subscriptionOptions} />
                <SelectInput label="Billing" value={billingType} onChange={(event) => updateFilter('billingType', event.target.value, setBillingType)} options={[{ value: '', label: 'Trial + Paid' }, { value: 'trial', label: 'Trial' }, { value: 'paid', label: 'Paid' }]} />
                <FormInput label="Country" value={country} onChange={(event) => updateFilter('country', event.target.value, setCountry)} placeholder="Country" />
                <FormInput label="City" value={city} onChange={(event) => updateFilter('city', event.target.value, setCity)} placeholder="City" />
                <FormInput label="Created From" type="date" value={createdFrom} onChange={(event) => updateFilter('createdFrom', event.target.value, setCreatedFrom)} />
                <FormInput label="Created To" type="date" value={createdTo} onChange={(event) => updateFilter('createdTo', event.target.value, setCreatedTo)} />
                <FormInput label="Renewal From" type="date" value={renewalFrom} onChange={(event) => updateFilter('renewalFrom', event.target.value, setRenewalFrom)} />
                <FormInput label="Renewal To" type="date" value={renewalTo} onChange={(event) => updateFilter('renewalTo', event.target.value, setRenewalTo)} />
              </FilterPanel>
            }
          />
        }
      >
        <div className="sticky top-0 z-10 -mx-1 rounded-2xl bg-slate-50/90 px-1 pb-3 backdrop-blur">
          <DataTable
            compact
            hideToolbar
            columns={columns}
            data={data}
            isLoading={isLoading}
            error={error}
            rowKey={(hotel) => hotel.id}
            emptyTitle="No hotels found"
            emptyDescription="Create a hotel tenant to start onboarding the platform customer."
            pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
          />
        </div>

        <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Hotel' : 'Create Hotel'} size="lg" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={isSaving} onClick={() => void saveHotel()}>{isSaving ? 'Saving...' : 'Save Hotel'}</button>
          </div>
        }>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Hotel Name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            <FormInput label="Slug" value={form.slug || ''} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} />
            <FormInput label="Owner Name" value={form.ownerName} onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))} required />
            <FormInput label="Owner Email" value={form.ownerEmail} onChange={(e) => setForm((prev) => ({ ...prev, ownerEmail: e.target.value }))} required />
            <FormInput label="Owner Phone" value={form.ownerPhone || ''} onChange={(e) => setForm((prev) => ({ ...prev, ownerPhone: e.target.value }))} />
            <FormInput label="Hotel Email" value={form.email || ''} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            <FormInput label="Hotel Phone" value={form.phone || ''} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            <FormInput label="City" value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} required />
            <FormInput label="State" value={form.state || ''} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} />
            <FormInput label="Country" value={form.country || ''} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} />
            <FormInput label="Timezone" value={form.timezone || ''} onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))} />
            <FormInput label="Currency" value={form.currency || ''} onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))} />
            <SelectInput label="Plan" value={form.plan || 'starter'} onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value as PlatformHotelPayload['plan'] }))} options={planOptions.filter((option) => option.value)} />
            <SelectInput label="Subscription Status" value={form.subscriptionStatus || 'trial'} onChange={(e) => setForm((prev) => ({ ...prev, subscriptionStatus: e.target.value as PlatformHotelPayload['subscriptionStatus'] }))} options={subscriptionOptions.filter((option) => option.value)} />
            <SelectInput label="Billing Type" value={form.billingType || 'trial'} onChange={(e) => setForm((prev) => ({ ...prev, billingType: e.target.value as PlatformHotelPayload['billingType'] }))} options={[{ value: 'trial', label: 'Trial' }, { value: 'paid', label: 'Paid' }]} />
            <FormInput label="Renewal Date" type="date" value={form.renewalDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, renewalDate: e.target.value }))} />
            <FormInput label="Health Score" type="number" value={String(form.healthScore ?? '')} onChange={(e) => setForm((prev) => ({ ...prev, healthScore: e.target.value ? Number(e.target.value) : undefined }))} />
          </div>
        </Modal>

        <Modal isOpen={!!emailTarget} onClose={() => setEmailTarget(null)} title={`Send Email${emailTarget ? ` to ${emailTarget.owner}` : ''}`} size="md" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setEmailTarget(null)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={isSaving} onClick={() => void sendEmail()}>Queue Email</button>
          </div>
        }>
          <div className="space-y-4">
            <FormInput label="Subject" value={emailForm.subject} onChange={(event) => setEmailForm((prev) => ({ ...prev, subject: event.target.value }))} />
            <FormInput label="Message" value={emailForm.message} onChange={(event) => setEmailForm((prev) => ({ ...prev, message: event.target.value }))} />
          </div>
        </Modal>

        <Modal isOpen={!!resetResult} onClose={() => setResetResult(null)} title="Temporary Password" size="sm">
          <p className="text-sm text-slate-600">Share this temporary password securely with the hotel owner.</p>
          <div className="mt-4 rounded-xl bg-slate-950 px-4 py-3 font-mono text-sm font-semibold text-white">{resetResult}</div>
        </Modal>

        <Modal isOpen={bulkPlanOpen} onClose={() => setBulkPlanOpen(false)} title="Bulk Assign Plan" size="sm" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setBulkPlanOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={isSaving} onClick={() => void runBulkAction('assign_plan', bulkPlan)}>Assign Plan</button>
          </div>
        }>
          <SelectInput label="Plan" value={bulkPlan} onChange={(event) => setBulkPlan(event.target.value)} options={planOptions.filter((option) => option.value)} />
        </Modal>

        <ConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void deleteHotel()}
          title="Delete Hotel"
          message={`Soft delete ${deleteTarget?.name ?? 'this hotel'}? Existing APIs and records remain archived.`}
          confirmLabel="Delete"
          variant="danger"
          isLoading={isSaving}
        />
      </ModulePageLayout>
    </PlatformOnly>
  );
}
