'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Pencil, Plus, Sparkles, Trash2, UserPlus } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  addEnquiryNote,
  assignEnquiry,
  convertEnquiryToBooking,
  convertEnquiryToGuest,
  convertEnquiryToLead,
  createEnquiries,
  deleteEnquiries,
  getEnquiries,
  getEnquiriesById,
  getEnquiryStats,
  updateEnquiries,
  updateEnquiryStatus,
} from '@/services/enquiries.service';
import { staffService } from '@/services/staff.service';
import type { Enquiry, EnquiryFormData, EnquiryStats, Staff } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatCurrency, formatDate, formatDateTime } from '@/utils/format';

const ENQUIRY_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'waiting_for_response', label: 'Waiting for Response' },
  { value: 'follow_up_required', label: 'Follow-up Required' },
  { value: 'converted_to_lead', label: 'Converted to Lead' },
  { value: 'converted_to_booking', label: 'Converted to Booking' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' },
  { value: 'spam', label: 'Spam' },
];

const ENQUIRY_SOURCES = [
  { value: 'website_form', label: 'Website Form' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'google_business', label: 'Google Business' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'ota', label: 'OTA' },
  { value: 'referral', label: 'Referral' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const ENQUIRY_TYPES = [
  { value: 'room_booking', label: 'Room Booking' },
  { value: 'corporate_booking', label: 'Corporate Booking' },
  { value: 'wedding_booking', label: 'Wedding Booking' },
  { value: 'event_booking', label: 'Event Booking' },
  { value: 'group_booking', label: 'Group Booking' },
  { value: 'restaurant_enquiry', label: 'Restaurant Enquiry' },
  { value: 'general_enquiry', label: 'General Enquiry' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const emptyForm: EnquiryFormData = {
  guestName: '',
  phone: '',
  email: '',
  source: 'phone_call',
  status: 'new',
  enquiryType: 'room_booking',
  priority: 'medium',
  notes: '',
  internalNotes: '',
};

function StatusBadge({ status }: { status: string }) {
  const tone = ['converted_to_booking', 'converted_to_lead', 'booked'].includes(status)
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : ['lost', 'spam'].includes(status)
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : ['contacted', 'waiting_for_response', 'follow_up_required'].includes(status)
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(status.replace(/_/g, ' '))}</span>;
}

function PriorityBadge({ priority }: { priority?: string }) {
  const value = priority || 'medium';
  const tone = value === 'urgent' ? 'bg-rose-600 text-white' : value === 'high' ? 'bg-orange-100 text-orange-700' : value === 'low' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{capitalize(value)}</span>;
}

function SourceBadge({ source }: { source: string }) {
  return <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{capitalize(source.replace(/_/g, ' '))}</span>;
}

function StatCard({ title, value, helper }: { title: string; value: string | number; helper?: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>{helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}</div>;
}

const getAssigneeName = (enquiry: Enquiry) => typeof enquiry.assignedTo === 'object' ? enquiry.assignedTo.name || enquiry.assignedTo.email : 'Unassigned';

export default function EnquiriesPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<EnquiryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  const listParams = useMemo(() => ({
    status: statusFilter || undefined,
    source: sourceFilter || undefined,
    priority: priorityFilter || undefined,
    enquiryType: typeFilter || undefined,
    assignedTo: assignedFilter || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
  }), [statusFilter, sourceFilter, priorityFilter, typeFilter, assignedFilter, createdFrom, createdTo]);
  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;
  const fetchEnquiries = useCallback((params: Parameters<typeof getEnquiries>[0]) => getEnquiries({ ...params, ...listParamsRef.current }), []);
  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } = usePaginatedQuery<Enquiry>({ fetchFn: fetchEnquiries });

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getEnquiryStats());
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
  const [editing, setEditing] = useState<Enquiry | null>(null);
  const [form, setForm] = useState<EnquiryFormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [detail, setDetail] = useState<Enquiry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Enquiry | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [statusTarget, setStatusTarget] = useState<Enquiry | null>(null);
  const [nextStatus, setNextStatus] = useState('contacted');
  const [statusNotes, setStatusNotes] = useState('');
  const [noteTarget, setNoteTarget] = useState<Enquiry | null>(null);
  const [noteText, setNoteText] = useState('');
  const [bookingTarget, setBookingTarget] = useState<Enquiry | null>(null);
  const [bookingForm, setBookingForm] = useState({ checkInDate: '', checkOutDate: '', adults: 1, children: 0, roomCount: 1, totalAmount: '', paidAmount: '', notes: '' });
  const [deleteTarget, setDeleteTarget] = useState<Enquiry | null>(null);

  const reload = async () => {
    await Promise.all([refresh(), loadStats()]);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (enquiry: Enquiry) => {
    setEditing(enquiry);
    setForm({
      guestName: enquiry.guestName,
      phone: enquiry.phone,
      email: enquiry.email || '',
      source: enquiry.source || 'phone_call',
      status: enquiry.status,
      enquiryType: enquiry.enquiryType || 'room_booking',
      priority: enquiry.priority || 'medium',
      checkInDate: enquiry.checkInDate ? enquiry.checkInDate.slice(0, 10) : '',
      checkOutDate: enquiry.checkOutDate ? enquiry.checkOutDate.slice(0, 10) : '',
      guestsCount: enquiry.guestsCount,
      roomTypePreference: enquiry.roomTypePreference || '',
      budget: enquiry.budget,
      assignedTo: typeof enquiry.assignedTo === 'object' ? enquiry.assignedTo.id || enquiry.assignedTo._id : enquiry.assignedTo || '',
      followUpDate: enquiry.followUpDate ? enquiry.followUpDate.slice(0, 16) : '',
      notes: enquiry.notes || '',
      internalNotes: enquiry.internalNotes || '',
      lostReason: enquiry.lostReason || '',
    });
    setFormErrors({});
    setFormOpen(true);
    setDetailOpen(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.guestName.trim()) errors.guestName = 'Guest name is required';
    if (!form.phone.trim()) errors.phone = 'Phone is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (editing) {
        await updateEnquiries(getEntityId(editing), form);
        showToast('Enquiry updated', 'success');
      } else {
        await createEnquiries(form);
        showToast('Enquiry created', 'success');
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save enquiry' });
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = async (enquiry: Enquiry) => {
    setDetailOpen(true);
    try {
      setDetail(await getEnquiriesById(getEntityId(enquiry)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load enquiry', 'error');
    }
  };

  const handleAssign = async () => {
    if (!assignTarget || !assignTo) return;
    setIsSaving(true);
    try {
      await assignEnquiry(getEntityId(assignTarget), assignTo);
      showToast('Enquiry assigned', 'success');
      setAssignTarget(null);
      setAssignTo('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to assign enquiry', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatus = async () => {
    if (!statusTarget) return;
    setIsSaving(true);
    try {
      await updateEnquiryStatus(getEntityId(statusTarget), { status: nextStatus, notes: statusNotes || undefined });
      showToast('Enquiry status updated', 'success');
      setStatusTarget(null);
      setStatusNotes('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteTarget || !noteText.trim()) return;
    setIsSaving(true);
    try {
      await addEnquiryNote(getEntityId(noteTarget), noteText);
      showToast('Enquiry note added', 'success');
      setNoteTarget(null);
      setNoteText('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add note', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvert = async (enquiry: Enquiry, target: 'lead' | 'guest') => {
    setIsSaving(true);
    try {
      if (target === 'lead') await convertEnquiryToLead(getEntityId(enquiry));
      else await convertEnquiryToGuest(getEntityId(enquiry));
      showToast(`Enquiry converted to ${target}`, 'success');
      await reload();
      if (detailOpen) setDetail(await getEnquiriesById(getEntityId(enquiry)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to convert enquiry', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertBooking = async () => {
    if (!bookingTarget || !bookingForm.checkInDate || !bookingForm.checkOutDate || !bookingForm.totalAmount) return;
    setIsSaving(true);
    try {
      await convertEnquiryToBooking(getEntityId(bookingTarget), {
        checkInDate: bookingForm.checkInDate,
        checkOutDate: bookingForm.checkOutDate,
        adults: bookingForm.adults,
        children: bookingForm.children,
        roomCount: bookingForm.roomCount,
        totalAmount: Number(bookingForm.totalAmount),
        paidAmount: bookingForm.paidAmount ? Number(bookingForm.paidAmount) : undefined,
        notes: bookingForm.notes || undefined,
      });
      showToast('Enquiry converted to booking', 'success');
      setBookingTarget(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to convert booking', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteEnquiries(getEntityId(deleteTarget));
      showToast('Enquiry archived', 'success');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to archive enquiry', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'guest', header: 'Guest', render: (row: Enquiry) => <div><p className="font-semibold text-slate-900">{row.guestName}</p><p className="text-xs text-slate-500">{row.phone} · {row.email || 'No email'}</p></div> },
    { key: 'source', header: 'Source', render: (row: Enquiry) => <SourceBadge source={row.source} /> },
    { key: 'type', header: 'Type', render: (row: Enquiry) => capitalize((row.enquiryType || 'room_booking').replace(/_/g, ' ')) },
    { key: 'priority', header: 'Priority', render: (row: Enquiry) => <PriorityBadge priority={row.priority} /> },
    { key: 'assigned', header: 'Assigned To', render: (row: Enquiry) => getAssigneeName(row) },
    { key: 'followUp', header: 'Follow-up', render: (row: Enquiry) => row.followUpDate ? formatDateTime(row.followUpDate) : '—' },
    { key: 'budget', header: 'Budget', render: (row: Enquiry) => formatCurrency(row.budget ?? 0) },
    { key: 'status', header: 'Status', render: (row: Enquiry) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Enquiry) => (
        <div className="flex gap-1">
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => void openDetail(row)}><Eye className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => { setAssignTarget(row); setAssignTo(typeof row.assignedTo === 'object' ? row.assignedTo.id || row.assignedTo._id || '' : row.assignedTo || ''); }}><UserPlus className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => { setStatusTarget(row); setNextStatus(row.status === 'new' ? 'contacted' : 'follow_up_required'); }}><Sparkles className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-sky-700 to-cyan-600 px-5 py-6 text-white sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-100">Hotel Sales & Support</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Enquiries Management</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100">Capture, qualify, assign, follow up, and convert every hotel enquiry into leads, guests, and bookings.</p></div>
            <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50" onClick={openCreate}><Plus className="mr-2 inline h-4 w-4" /> Add Enquiry</button>
          </div>
        </div>
      </section>

      {statsLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div> : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Enquiries" value={stats.totalEnquiries} helper={`${stats.newEnquiries} new`} />
          <StatCard title="Pending Follow-ups" value={stats.pendingFollowUps} helper={`${stats.assignedEnquiries} assigned`} />
          <StatCard title="Conversion Rate" value={`${stats.conversionRate}%`} helper={`${stats.convertedEnquiries} converted`} />
          <StatCard title="Estimated Value" value={formatCurrency(stats.estimatedValue)} helper={`${stats.urgentEnquiries} urgent`} />
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <SelectInput label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...ENQUIRY_STATUSES]} />
          <SelectInput label="Source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} options={[{ value: '', label: 'All sources' }, ...ENQUIRY_SOURCES]} />
          <SelectInput label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[{ value: '', label: 'All types' }, ...ENQUIRY_TYPES]} />
          <SelectInput label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} options={[{ value: '', label: 'All priorities' }, ...PRIORITIES]} />
          <SelectInput label="Assigned To" value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} options={[{ value: '', label: 'All staff' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
          <FormInput label="From" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
          <FormInput label="To" type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
        </div>
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} error={error} onSearch={setSearch} searchPlaceholder="Search enquiries by guest, phone, email..." rowKey={(row) => getEntityId(row)} emptyTitle="No enquiries found" emptyDescription="Capture a new website, WhatsApp, phone, or walk-in enquiry." pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }} />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Enquiry' : 'Add Enquiry'} size="xl" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Enquiry'}</button></div>}>
        {formErrors.form ? <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formErrors.form}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Guest Name" value={form.guestName} onChange={(e) => setForm((prev) => ({ ...prev, guestName: e.target.value }))} error={formErrors.guestName} required />
          <FormInput label="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} error={formErrors.phone} required />
          <FormInput label="Email" value={form.email || ''} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <SelectInput label="Source" value={form.source} onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))} options={ENQUIRY_SOURCES} />
          <SelectInput label="Type" value={form.enquiryType || 'room_booking'} onChange={(e) => setForm((prev) => ({ ...prev, enquiryType: e.target.value }))} options={ENQUIRY_TYPES} />
          <SelectInput label="Priority" value={form.priority || 'medium'} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} options={PRIORITIES} />
          <SelectInput label="Status" value={form.status || 'new'} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} options={ENQUIRY_STATUSES} />
          <SelectInput label="Assigned To" value={form.assignedTo || ''} onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))} options={[{ value: '', label: 'Assign later' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
          <FormInput label="Check-in" type="date" value={form.checkInDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, checkInDate: e.target.value }))} />
          <FormInput label="Check-out" type="date" value={form.checkOutDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, checkOutDate: e.target.value }))} />
          <FormInput label="Guests" type="number" value={form.guestsCount ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, guestsCount: e.target.value ? Number(e.target.value) : undefined }))} />
          <FormInput label="Budget" type="number" value={form.budget ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, budget: e.target.value ? Number(e.target.value) : undefined }))} />
          <FormInput label="Follow-up Date" type="datetime-local" value={form.followUpDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, followUpDate: e.target.value }))} />
          <FormInput label="Room Preference" value={form.roomTypePreference || ''} onChange={(e) => setForm((prev) => ({ ...prev, roomTypePreference: e.target.value }))} />
          <TextArea label="Notes" value={form.notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="sm:col-span-2" />
          <TextArea label="Internal Notes" value={form.internalNotes || ''} onChange={(e) => setForm((prev) => ({ ...prev, internalNotes: e.target.value }))} className="sm:col-span-2" />
        </div>
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => { setDetailOpen(false); setDetail(null); }} title="Enquiry Details" size="xl">
        {detail ? <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4"><div><h3 className="text-xl font-semibold text-slate-900">{detail.guestName}</h3><p className="text-sm text-slate-500">{detail.phone} · {detail.email || 'No email'} · {getAssigneeName(detail)}</p></div><div className="flex flex-col items-end gap-2"><PriorityBadge priority={detail.priority} /><StatusBadge status={detail.status} /></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><p className="text-sm"><span className="font-semibold">Source:</span> {capitalize(detail.source.replace(/_/g, ' '))}</p><p className="text-sm"><span className="font-semibold">Type:</span> {capitalize((detail.enquiryType || 'room_booking').replace(/_/g, ' '))}</p><p className="text-sm"><span className="font-semibold">Follow-up:</span> {detail.followUpDate ? formatDateTime(detail.followUpDate) : '—'}</p><p className="text-sm"><span className="font-semibold">Budget:</span> {formatCurrency(detail.budget ?? 0)}</p><p className="text-sm"><span className="font-semibold">Stay:</span> {detail.checkInDate ? `${formatDate(detail.checkInDate)} - ${detail.checkOutDate ? formatDate(detail.checkOutDate) : '—'}` : '—'}</p><p className="text-sm"><span className="font-semibold">Guests:</span> {detail.guestsCount || '—'}</p></div>
          <div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-slate-100 p-4"><h4 className="mb-2 text-sm font-semibold">Notes</h4><p className="whitespace-pre-wrap text-sm text-slate-600">{detail.notes || 'No notes yet.'}</p></div><div className="rounded-xl border border-slate-100 p-4"><h4 className="mb-2 text-sm font-semibold">Internal Notes</h4><p className="whitespace-pre-wrap text-sm text-slate-600">{detail.internalNotes || 'No internal notes yet.'}</p></div></div>
          {detail.timeline?.length ? <div><h4 className="mb-2 text-sm font-semibold">Timeline</h4><div className="space-y-2">{detail.timeline.slice(0, 8).map((item, index) => <div key={`${item.action}-${index}`} className="rounded-lg border border-slate-100 px-3 py-2 text-sm"><p className="font-medium">{item.action.replace(/\./g, ' ')}</p><p className="text-xs text-slate-500">{item.message || ''} {item.createdAt ? `· ${formatDateTime(item.createdAt)}` : ''}</p></div>)}</div></div> : null}
          <div className="flex flex-wrap justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => { setNoteTarget(detail); setNoteText(''); }}>Add Note</button><button type="button" className="btn-secondary" onClick={() => void handleConvert(detail, 'lead')}>Convert To Lead</button><button type="button" className="btn-secondary" onClick={() => void handleConvert(detail, 'guest')}>Convert To Guest</button><button type="button" className="btn-secondary" onClick={() => { setBookingTarget(detail); setBookingForm({ checkInDate: detail.checkInDate?.slice(0, 10) || '', checkOutDate: detail.checkOutDate?.slice(0, 10) || '', adults: 1, children: 0, roomCount: 1, totalAmount: String(detail.budget || ''), paidAmount: '', notes: detail.notes || '' }); }}>Convert To Booking</button><button type="button" className="btn-secondary" onClick={() => openEdit(detail)}>Edit</button><button type="button" className="btn-primary" onClick={() => { setStatusTarget(detail); setNextStatus(detail.status === 'new' ? 'contacted' : 'follow_up_required'); }}>Update Status</button></div>
        </div> : null}
      </Modal>

      <Modal isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} title="Assign Enquiry" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setAssignTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleAssign()} disabled={isSaving}>Assign</button></div>}><SelectInput label="Executive" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} options={[{ value: '', label: 'Select staff' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} /></Modal>
      <Modal isOpen={!!statusTarget} onClose={() => setStatusTarget(null)} title="Update Enquiry Status" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setStatusTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleStatus()} disabled={isSaving}>Update</button></div>}><div className="space-y-4"><SelectInput label="Status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} options={ENQUIRY_STATUSES} /><TextArea label="Notes" value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} /></div></Modal>
      <Modal isOpen={!!noteTarget} onClose={() => setNoteTarget(null)} title="Add Enquiry Note" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setNoteTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleAddNote()} disabled={isSaving || !noteText.trim()}>Add Note</button></div>}><TextArea label="Note" value={noteText} onChange={(e) => setNoteText(e.target.value)} /></Modal>
      <Modal isOpen={!!bookingTarget} onClose={() => setBookingTarget(null)} title="Convert Enquiry To Booking" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setBookingTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleConvertBooking()} disabled={isSaving || !bookingForm.checkInDate || !bookingForm.checkOutDate || !bookingForm.totalAmount}>Create Booking</button></div>}><div className="grid gap-4 sm:grid-cols-2"><FormInput label="Check-in" type="date" value={bookingForm.checkInDate} onChange={(e) => setBookingForm((prev) => ({ ...prev, checkInDate: e.target.value }))} required /><FormInput label="Check-out" type="date" value={bookingForm.checkOutDate} onChange={(e) => setBookingForm((prev) => ({ ...prev, checkOutDate: e.target.value }))} required /><FormInput label="Adults" type="number" value={bookingForm.adults} onChange={(e) => setBookingForm((prev) => ({ ...prev, adults: Number(e.target.value) }))} /><FormInput label="Rooms" type="number" value={bookingForm.roomCount} onChange={(e) => setBookingForm((prev) => ({ ...prev, roomCount: Number(e.target.value) }))} /><FormInput label="Total Amount" type="number" value={bookingForm.totalAmount} onChange={(e) => setBookingForm((prev) => ({ ...prev, totalAmount: e.target.value }))} required /><FormInput label="Paid Amount" type="number" value={bookingForm.paidAmount} onChange={(e) => setBookingForm((prev) => ({ ...prev, paidAmount: e.target.value }))} /><TextArea label="Booking Notes" value={bookingForm.notes} onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))} className="sm:col-span-2" /></div></Modal>
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Archive Enquiry" message={`Archive enquiry for ${deleteTarget?.guestName}?`} confirmLabel="Archive" isLoading={isSaving} variant="danger" />
    </div>
  );
}
