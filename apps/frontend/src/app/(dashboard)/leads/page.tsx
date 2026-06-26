'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CalendarDays, Eye, LayoutDashboard, ListChecks, Pencil, Plus, Sparkles, Trash2, UserPlus } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  addLeadNote,
  assignLead,
  convertLeadToBooking,
  convertLeadToGuest,
  createLead,
  deleteLead,
  getLeadById,
  getLeadStats,
  getLeads,
  updateLead,
  updateLeadStatus,
} from '@/services/leads.service';
import { staffService } from '@/services/staff.service';
import type { Lead, LeadFormData, LeadStats, Staff } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatCurrency, formatDate, formatDateTime } from '@/utils/format';

const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'follow_up_required', label: 'Follow-up Required' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
  { value: 'not_interested', label: 'Not Interested' },
];

const LEAD_SOURCES = [
  { value: 'website', label: 'Website' },
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
  { value: 'campaign', label: 'Campaign' },
  { value: 'other', label: 'Other' },
];

const LEAD_TYPES = [
  { value: 'room_booking', label: 'Room Booking' },
  { value: 'corporate_booking', label: 'Corporate Booking' },
  { value: 'wedding_booking', label: 'Wedding Booking' },
  { value: 'event_booking', label: 'Event Booking' },
  { value: 'group_booking', label: 'Group Booking' },
  { value: 'restaurant_enquiry', label: 'Restaurant Enquiry' },
  { value: 'general_enquiry', label: 'General Enquiry' },
];

const LEAD_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'hot', label: 'Hot' },
];

const emptyForm: LeadFormData = {
  fullName: '',
  phone: '',
  email: '',
  companyName: '',
  city: '',
  source: 'phone_call',
  leadType: 'room_booking',
  status: 'new',
  priority: 'medium',
  notes: '',
};

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'converted'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : ['lost', 'not_interested'].includes(status)
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : ['proposal_sent', 'negotiation', 'interested'].includes(status)
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(status.replace(/_/g, ' '))}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone = priority === 'hot' ? 'bg-rose-600 text-white' : priority === 'high' ? 'bg-orange-100 text-orange-700' : priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{capitalize(priority)}</span>;
}

function SourceBadge({ source }: { source: string }) {
  return <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{capitalize(source.replace(/_/g, ' '))}</span>;
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

const getAssigneeName = (lead: Lead) => typeof lead.assignedTo === 'object' ? lead.assignedTo.name || lead.assignedTo.email : 'Unassigned';

export default function LeadCenterPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  const listParams = useMemo(() => ({
    status: statusFilter || undefined,
    source: sourceFilter || undefined,
    leadType: typeFilter || undefined,
    priority: priorityFilter || undefined,
    assignedTo: assignedFilter || undefined,
  }), [statusFilter, sourceFilter, typeFilter, priorityFilter, assignedFilter]);
  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;

  const fetchLeads = useCallback((params: Parameters<typeof getLeads>[0]) => getLeads({ ...params, ...listParamsRef.current }), []);
  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } = usePaginatedQuery<Lead>({ fetchFn: fetchLeads });

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getLeadStats());
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
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadFormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Lead | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [statusTarget, setStatusTarget] = useState<Lead | null>(null);
  const [nextStatus, setNextStatus] = useState('contacted');
  const [statusNotes, setStatusNotes] = useState('');
  const [noteTarget, setNoteTarget] = useState<Lead | null>(null);
  const [noteText, setNoteText] = useState('');
  const [bookingTarget, setBookingTarget] = useState<Lead | null>(null);
  const [bookingForm, setBookingForm] = useState({ checkInDate: '', checkOutDate: '', adults: 1, children: 0, roomCount: 1, totalAmount: '', paidAmount: '', notes: '' });
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const reload = async () => {
    await Promise.all([refresh(), loadStats()]);
  };

  const openCreate = () => {
    setEditingLead(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email || '',
      companyName: lead.companyName || '',
      city: lead.city || '',
      source: lead.source,
      leadType: lead.leadType,
      status: lead.status,
      priority: lead.priority,
      estimatedValue: lead.estimatedValue,
      expectedRooms: lead.expectedRooms,
      expectedGuests: lead.expectedGuests,
      checkInDate: lead.checkInDate ? lead.checkInDate.slice(0, 10) : '',
      checkOutDate: lead.checkOutDate ? lead.checkOutDate.slice(0, 10) : '',
      eventDate: lead.eventDate ? lead.eventDate.slice(0, 10) : '',
      assignedTo: typeof lead.assignedTo === 'object' ? lead.assignedTo.id || lead.assignedTo._id : lead.assignedTo || '',
      followUpDate: lead.followUpDate ? lead.followUpDate.slice(0, 16) : '',
      notes: lead.notes || '',
      lostReason: lead.lostReason || '',
    });
    setFormErrors({});
    setFormOpen(true);
    setDetailOpen(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) errors.fullName = 'Lead name is required';
    if (!form.phone.trim()) errors.phone = 'Phone is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (editingLead) {
        await updateLead(getEntityId(editingLead), form);
        showToast('Lead updated', 'success');
      } else {
        await createLead(form);
        showToast('Lead created', 'success');
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save lead' });
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = async (lead: Lead) => {
    setDetailOpen(true);
    try {
      setDetailLead(await getLeadById(getEntityId(lead)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load lead', 'error');
    }
  };

  const handleAssign = async () => {
    if (!assignTarget || !assignTo) return;
    setIsSaving(true);
    try {
      await assignLead(getEntityId(assignTarget), assignTo);
      showToast('Lead assigned', 'success');
      setAssignTarget(null);
      setAssignTo('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to assign lead', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatus = async () => {
    if (!statusTarget) return;
    setIsSaving(true);
    try {
      await updateLeadStatus(getEntityId(statusTarget), { status: nextStatus, notes: statusNotes || undefined });
      showToast('Lead status updated', 'success');
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
      await addLeadNote(getEntityId(noteTarget), noteText);
      showToast('Lead note added', 'success');
      setNoteTarget(null);
      setNoteText('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add note', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertGuest = async (lead: Lead) => {
    setIsSaving(true);
    try {
      await convertLeadToGuest(getEntityId(lead));
      showToast('Lead converted to guest', 'success');
      await reload();
      if (detailOpen) setDetailLead(await getLeadById(getEntityId(lead)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to convert lead', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertBooking = async () => {
    if (!bookingTarget || !bookingForm.checkInDate || !bookingForm.checkOutDate || !bookingForm.totalAmount) return;
    setIsSaving(true);
    try {
      await convertLeadToBooking(getEntityId(bookingTarget), {
        checkInDate: bookingForm.checkInDate,
        checkOutDate: bookingForm.checkOutDate,
        adults: bookingForm.adults,
        children: bookingForm.children,
        roomCount: bookingForm.roomCount,
        totalAmount: Number(bookingForm.totalAmount),
        paidAmount: bookingForm.paidAmount ? Number(bookingForm.paidAmount) : undefined,
        notes: bookingForm.notes || undefined,
      });
      showToast('Lead converted to booking', 'success');
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
      await deleteLead(getEntityId(deleteTarget));
      showToast('Lead archived', 'success');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to archive lead', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'lead', header: 'Lead', render: (row: Lead) => <div><p className="font-semibold text-slate-900">{row.fullName}</p><p className="text-xs text-slate-500">{row.leadNumber} · {row.phone}</p></div> },
    { key: 'source', header: 'Source', render: (row: Lead) => <SourceBadge source={row.source} /> },
    { key: 'type', header: 'Type', render: (row: Lead) => capitalize(row.leadType.replace(/_/g, ' ')) },
    { key: 'priority', header: 'Priority', render: (row: Lead) => <PriorityBadge priority={row.priority} /> },
    { key: 'assigned', header: 'Assigned To', render: (row: Lead) => getAssigneeName(row) },
    { key: 'followUp', header: 'Follow-up', render: (row: Lead) => row.followUpDate ? formatDateTime(row.followUpDate) : '—' },
    { key: 'value', header: 'Value', render: (row: Lead) => formatCurrency(row.estimatedValue ?? 0) },
    { key: 'status', header: 'Status', render: (row: Lead) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Lead) => (
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

  const pipelineStatuses = ['new', 'contacted', 'interested', 'follow_up_required', 'proposal_sent', 'negotiation', 'converted'];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-indigo-700 to-sky-600 px-5 py-6 text-white sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-100">Hotel Sales CRM</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Lead Center</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">Manage enquiries, WhatsApp leads, follow-ups, assignments, pipeline value, and booking conversions.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/event-leads" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
                <CalendarDays className="mr-2 inline h-4 w-4" />Event CRM
              </Link>
              <Link href="/corporate-leads" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
                <Building2 className="mr-2 inline h-4 w-4" />Corporate CRM
              </Link>
              <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" onClick={openCreate}><Plus className="mr-2 inline h-4 w-4" /> Add Lead</button>
            </div>
          </div>
        </div>
      </section>

      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Leads" value={stats.totalLeads} helper={`${stats.newLeads} new leads`} />
          <StatCard title="Hot Leads" value={stats.hotLeads} helper={`${stats.pendingFollowUps} follow-ups due`} />
          <StatCard title="Conversion Rate" value={`${stats.conversionRate}%`} helper={`${stats.convertedLeads} converted`} />
          <StatCard title="Pipeline Value" value={formatCurrency(stats.estimatedPipelineValue)} helper={`${stats.lostLeads} lost/not interested`} />
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <SelectInput label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...LEAD_STATUSES]} />
          <SelectInput label="Source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} options={[{ value: '', label: 'All sources' }, ...LEAD_SOURCES]} />
          <SelectInput label="Lead Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[{ value: '', label: 'All types' }, ...LEAD_TYPES]} />
          <SelectInput label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} options={[{ value: '', label: 'All priorities' }, ...LEAD_PRIORITIES]} />
          <SelectInput label="Assigned To" value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} options={[{ value: '', label: 'All staff' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
          <div className="ml-auto flex rounded-lg border border-slate-200 p-0.5">
            <button type="button" className={`rounded-md p-2 ${viewMode === 'pipeline' ? 'bg-slate-100' : ''}`} onClick={() => setViewMode('pipeline')}><LayoutDashboard className="h-4 w-4" /></button>
            <button type="button" className={`rounded-md p-2 ${viewMode === 'table' ? 'bg-slate-100' : ''}`} onClick={() => setViewMode('table')}><ListChecks className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {viewMode === 'pipeline' && (
        <div className="grid gap-4 xl:grid-cols-7">
          {pipelineStatuses.map((status) => (
            <div key={status} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{capitalize(status.replace(/_/g, ' '))}</h3>
                <span className="text-xs text-slate-500">{data.filter((lead) => lead.status === status).length}</span>
              </div>
              <div className="space-y-3">
                {data.filter((lead) => lead.status === status).map((lead) => (
                  <button key={getEntityId(lead)} type="button" onClick={() => void openDetail(lead)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2"><p className="font-semibold text-slate-900">{lead.fullName}</p><PriorityBadge priority={lead.priority} /></div>
                    <p className="mt-1 text-xs text-slate-500">{lead.phone} · {capitalize(lead.leadType.replace(/_/g, ' '))}</p>
                    <div className="mt-3 flex items-center justify-between gap-2"><SourceBadge source={lead.source} /><span className="text-xs text-slate-500">{formatCurrency(lead.estimatedValue ?? 0)}</span></div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'table' && (
        <DataTable columns={columns} data={data} isLoading={isLoading} error={error} onSearch={setSearch} searchPlaceholder="Search leads by name, phone, email, company..." rowKey={(row) => getEntityId(row)} emptyTitle="No leads found" emptyDescription="Create your first lead to start the sales pipeline." pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }} />
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingLead ? 'Edit Lead' : 'Add Lead'} size="xl" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Lead'}</button></div>}>
        {formErrors.form ? <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formErrors.form}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Lead Name" value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} error={formErrors.fullName} required />
          <FormInput label="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} error={formErrors.phone} required />
          <FormInput label="Email" value={form.email || ''} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <FormInput label="Company" value={form.companyName || ''} onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))} />
          <SelectInput label="Source" value={form.source} onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))} options={LEAD_SOURCES} />
          <SelectInput label="Lead Type" value={form.leadType} onChange={(e) => setForm((prev) => ({ ...prev, leadType: e.target.value }))} options={LEAD_TYPES} />
          <SelectInput label="Status" value={form.status || 'new'} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} options={LEAD_STATUSES} />
          <SelectInput label="Priority" value={form.priority || 'medium'} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} options={LEAD_PRIORITIES} />
          <SelectInput label="Assigned To" value={form.assignedTo || ''} onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))} options={[{ value: '', label: 'Assign later' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
          <FormInput label="Follow-up Date" type="datetime-local" value={form.followUpDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, followUpDate: e.target.value }))} />
          <FormInput label="Estimated Value" type="number" value={form.estimatedValue ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, estimatedValue: e.target.value ? Number(e.target.value) : undefined }))} />
          <FormInput label="Expected Rooms" type="number" value={form.expectedRooms ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, expectedRooms: e.target.value ? Number(e.target.value) : undefined }))} />
          <FormInput label="Check-in Date" type="date" value={form.checkInDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, checkInDate: e.target.value }))} />
          <FormInput label="Check-out Date" type="date" value={form.checkOutDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, checkOutDate: e.target.value }))} />
          <TextArea label="Notes" value={form.notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="sm:col-span-2" />
        </div>
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => { setDetailOpen(false); setDetailLead(null); }} title="Lead Details" size="xl">
        {detailLead ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{detailLead.leadNumber}</p><h3 className="mt-1 text-xl font-semibold text-slate-900">{detailLead.fullName}</h3><p className="text-sm text-slate-500">{detailLead.phone} · {detailLead.email || 'No email'} · {getAssigneeName(detailLead)}</p></div>
              <div className="flex flex-col items-end gap-2"><PriorityBadge priority={detailLead.priority} /><StatusBadge status={detailLead.status} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <p className="text-sm"><span className="font-semibold">Source:</span> {capitalize(detailLead.source.replace(/_/g, ' '))}</p>
              <p className="text-sm"><span className="font-semibold">Type:</span> {capitalize(detailLead.leadType.replace(/_/g, ' '))}</p>
              <p className="text-sm"><span className="font-semibold">Follow-up:</span> {detailLead.followUpDate ? formatDateTime(detailLead.followUpDate) : '—'}</p>
              <p className="text-sm"><span className="font-semibold">Value:</span> {formatCurrency(detailLead.estimatedValue ?? 0)}</p>
              <p className="text-sm"><span className="font-semibold">Stay:</span> {detailLead.checkInDate ? `${formatDate(detailLead.checkInDate)} - ${detailLead.checkOutDate ? formatDate(detailLead.checkOutDate) : '—'}` : '—'}</p>
              <p className="text-sm"><span className="font-semibold">Company:</span> {detailLead.companyName || '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-100 p-4"><h4 className="mb-2 text-sm font-semibold">Notes</h4><p className="whitespace-pre-wrap text-sm text-slate-600">{detailLead.notes || 'No notes yet.'}</p></div>
            {detailLead.sourceHistory?.length ? <div><h4 className="mb-2 text-sm font-semibold">Source History</h4><div className="flex flex-wrap gap-2">{detailLead.sourceHistory.map((item, index) => <span key={`${item.source}-${index}`} className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">{capitalize(item.source.replace(/_/g, ' '))} {item.capturedAt ? `· ${formatDate(item.capturedAt)}` : ''}</span>)}</div></div> : null}
            {detailLead.timeline?.length ? <div><h4 className="mb-2 text-sm font-semibold">Timeline</h4><div className="space-y-2">{detailLead.timeline.slice(0, 8).map((item, index) => <div key={`${item.action}-${index}`} className="rounded-lg border border-slate-100 px-3 py-2 text-sm"><p className="font-medium">{item.action.replace(/\./g, ' ')}</p><p className="text-xs text-slate-500">{item.message || ''} {item.createdAt ? `· ${formatDateTime(item.createdAt)}` : ''}</p></div>)}</div></div> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => { setNoteTarget(detailLead); setNoteText(''); }}>Add Note</button>
              <button type="button" className="btn-secondary" onClick={() => void handleConvertGuest(detailLead)} disabled={isSaving}>Convert To Guest</button>
              <button type="button" className="btn-secondary" onClick={() => { setBookingTarget(detailLead); setBookingForm({ checkInDate: detailLead.checkInDate?.slice(0, 10) || '', checkOutDate: detailLead.checkOutDate?.slice(0, 10) || '', adults: 1, children: 0, roomCount: detailLead.expectedRooms || 1, totalAmount: String(detailLead.estimatedValue || ''), paidAmount: '', notes: detailLead.notes || '' }); }}>Convert To Booking</button>
              <button type="button" className="btn-secondary" onClick={() => detailLead && openEdit(detailLead)}>Edit</button>
              <button type="button" className="btn-primary" onClick={() => { if (detailLead) { setStatusTarget(detailLead); setNextStatus(detailLead.status === 'new' ? 'contacted' : 'follow_up_required'); } }}>Update Status</button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} title="Assign Lead" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setAssignTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleAssign()} disabled={isSaving}>Assign</button></div>}>
        <SelectInput label="Sales Executive" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} options={[{ value: '', label: 'Select staff' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
      </Modal>

      <Modal isOpen={!!statusTarget} onClose={() => setStatusTarget(null)} title="Update Lead Status" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setStatusTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleStatus()} disabled={isSaving}>Update</button></div>}>
        <div className="space-y-4"><SelectInput label="Status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} options={LEAD_STATUSES} /><TextArea label="Notes" value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} /></div>
      </Modal>

      <Modal isOpen={!!noteTarget} onClose={() => setNoteTarget(null)} title="Add Lead Note" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setNoteTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleAddNote()} disabled={isSaving || !noteText.trim()}>Add Note</button></div>}>
        <TextArea label="Note" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
      </Modal>

      <Modal isOpen={!!bookingTarget} onClose={() => setBookingTarget(null)} title="Convert Lead To Booking" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setBookingTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleConvertBooking()} disabled={isSaving || !bookingForm.checkInDate || !bookingForm.checkOutDate || !bookingForm.totalAmount}>Create Booking</button></div>}>
        <div className="grid gap-4 sm:grid-cols-2"><FormInput label="Check-in" type="date" value={bookingForm.checkInDate} onChange={(e) => setBookingForm((prev) => ({ ...prev, checkInDate: e.target.value }))} required /><FormInput label="Check-out" type="date" value={bookingForm.checkOutDate} onChange={(e) => setBookingForm((prev) => ({ ...prev, checkOutDate: e.target.value }))} required /><FormInput label="Adults" type="number" value={bookingForm.adults} onChange={(e) => setBookingForm((prev) => ({ ...prev, adults: Number(e.target.value) }))} /><FormInput label="Rooms" type="number" value={bookingForm.roomCount} onChange={(e) => setBookingForm((prev) => ({ ...prev, roomCount: Number(e.target.value) }))} /><FormInput label="Total Amount" type="number" value={bookingForm.totalAmount} onChange={(e) => setBookingForm((prev) => ({ ...prev, totalAmount: e.target.value }))} required /><FormInput label="Paid Amount" type="number" value={bookingForm.paidAmount} onChange={(e) => setBookingForm((prev) => ({ ...prev, paidAmount: e.target.value }))} /><TextArea label="Booking Notes" value={bookingForm.notes} onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))} className="sm:col-span-2" /></div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Archive Lead" message={`Archive lead ${deleteTarget?.leadNumber}?`} confirmLabel="Archive" isLoading={isSaving} variant="danger" />
    </div>
  );
}
