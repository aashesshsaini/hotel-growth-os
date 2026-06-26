'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, LayoutDashboard, ListChecks, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { ActionMenu } from '@/components/ActionMenu';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { EventDetailDrawer } from '@/features/event-leads/EventDetailDrawer';
import { EventStatsCards } from '@/features/event-leads/EventStatsCards';
import { PipelineBoard, StatusBadge } from '@/features/event-leads/PipelineBoard';
import {
  EVENT_PRIORITIES,
  EVENT_SOURCES,
  EVENT_STATUSES,
  EVENT_TYPES,
  emptyEventForm,
  getEventTypeLabel,
} from '@/features/event-leads/constants';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  convertEventLeadToBooking,
  createEventLead,
  deleteEventLead,
  getEventLeadById,
  getEventLeadStats,
  getEventLeads,
  getEventPipeline,
  updateEventLead,
} from '@/services/eventLeads.service';
import { staffService } from '@/services/staff.service';
import type { EventLead, EventLeadDetails, EventLeadFormData, EventLeadStats, EventPipelineColumn, Staff } from '@/types';
import { getEntityId } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

type ViewMode = 'dashboard' | 'pipeline' | 'list';

export default function EventLeadsPage() {
  const { showToast } = useToast();
  const [view, setView] = useState<ViewMode>('dashboard');
  const [stats, setStats] = useState<EventLeadStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pipeline, setPipeline] = useState<EventPipelineColumn[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventLead | null>(null);
  const [form, setForm] = useState<EventLeadFormData>(emptyEventForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventLead | null>(null);
  const [details, setDetails] = useState<EventLeadDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({
    checkInDate: '',
    checkOutDate: '',
    adults: 2,
    children: 0,
    totalAmount: 0,
    paidAmount: 0,
    notes: '',
  });
  const [isConverting, setIsConverting] = useState(false);

  const listParams = useMemo(() => ({
    status: statusFilter || undefined,
    eventType: eventTypeFilter || undefined,
    priority: priorityFilter || undefined,
    assignedTo: assignedFilter || undefined,
  }), [statusFilter, eventTypeFilter, priorityFilter, assignedFilter]);

  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;

  const fetchList = useCallback(
    (params: Parameters<typeof getEventLeads>[0]) =>
      getEventLeads({ ...params, ...listParamsRef.current }),
    []
  );

  const { data, pagination, isLoading, error, setPage, setSearch, refresh } = usePaginatedQuery<EventLead>({
    fetchFn: fetchList,
  });

  const loadMeta = useCallback(async () => {
    setStatsLoading(true);
    setPipelineLoading(true);
    try {
      const [statsData, pipelineData] = await Promise.all([
        getEventLeadStats(),
        getEventPipeline(),
      ]);
      setStats(statsData);
      setPipeline(pipelineData);
    } catch {
      setStats(null);
      setPipeline([]);
    } finally {
      setStatsLoading(false);
      setPipelineLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeta();
    void staffService.list({ limit: 100 }).then((result) => setStaff(result.data)).catch(() => setStaff([]));
  }, [loadMeta]);

  useEffect(() => { setPage(1); void refresh(); }, [statusFilter, eventTypeFilter, priorityFilter, assignedFilter, setPage, refresh]);

  const reload = () => Promise.all([refresh(), loadMeta()]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyEventForm());
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (event: EventLead) => {
    setEditing(event);
    setForm({
      eventName: event.eventName,
      eventType: event.eventType,
      contactPerson: event.contactPerson,
      phone: event.phone,
      email: event.email || '',
      eventDate: event.eventDate ? event.eventDate.slice(0, 10) : '',
      eventEndDate: event.eventEndDate ? event.eventEndDate.slice(0, 10) : '',
      eventStartTime: event.eventStartTime || '',
      eventEndTime: event.eventEndTime || '',
      guestCount: event.guestCount,
      budgetMin: event.budgetMin || 0,
      budgetMax: event.budgetMax || 0,
      estimatedValue: event.estimatedValue || 0,
      packageName: event.packageName || '',
      packagePrice: event.packagePrice || 0,
      requirements: event.requirements || emptyEventForm().requirements,
      status: event.status,
      priority: event.priority || 'medium',
      source: event.source || 'direct',
      followUpDate: event.followUpDate ? event.followUpDate.slice(0, 10) : '',
      notes: event.notes || '',
      totalValue: event.totalValue || event.estimatedValue || 0,
      paidAmount: event.paidAmount || 0,
      advanceAmount: event.advanceAmount || 0,
      assignedTo: typeof event.assignedTo === 'object' ? getEntityId(event.assignedTo) : event.assignedTo || '',
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openDetails = async (id: string) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      setDetails(await getEventLeadById(id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load event', 'error');
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.eventName.trim()) errors.eventName = 'Event name is required';
    if (!form.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
    if (!form.phone.trim()) errors.phone = 'Phone is required';
    if (!form.eventDate) errors.eventDate = 'Event date is required';
    if (!form.guestCount || form.guestCount < 1) errors.guestCount = 'Guest count is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (editing) {
        await updateEventLead(getEntityId(editing), form);
        showToast('Event updated successfully', 'success');
      } else {
        await createEventLead(form);
        showToast('Event created successfully', 'success');
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEventLead(getEntityId(deleteTarget));
      showToast('Event archived', 'success');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const openConvert = () => {
    const event = details?.event;
    if (!event) return;
    setConvertForm({
      checkInDate: event.eventDate ? event.eventDate.slice(0, 10) : '',
      checkOutDate: event.eventEndDate ? event.eventEndDate.slice(0, 10) : event.eventDate ? event.eventDate.slice(0, 10) : '',
      adults: Math.max(1, event.guestCount || 2),
      children: 0,
      totalAmount: event.totalValue ?? event.estimatedValue ?? 0,
      paidAmount: event.paidAmount ?? 0,
      notes: event.notes || '',
    });
    setConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!details?.event) return;
    if (!convertForm.checkInDate || !convertForm.checkOutDate) {
      showToast('Check-in and check-out dates are required', 'error');
      return;
    }
    setIsConverting(true);
    try {
      await convertEventLeadToBooking(getEntityId(details.event), convertForm);
      showToast('Event converted to booking successfully', 'success');
      setConvertOpen(false);
      setDetailsOpen(false);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Conversion failed', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'event',
        header: 'Event',
        render: (row: EventLead) => (
          <div>
            <div className="font-semibold text-slate-950">{row.eventName}</div>
            <div className="text-xs text-slate-500">{row.eventNumber || '—'} · {getEventTypeLabel(row.eventType)}</div>
          </div>
        ),
      },
      { key: 'contact', header: 'Contact', render: (row: EventLead) => <div>{row.contactPerson}<div className="text-xs text-slate-500">{row.phone}</div></div> },
      { key: 'date', header: 'Event Date', render: (row: EventLead) => formatDate(row.eventDate) },
      { key: 'guests', header: 'Guests', render: (row: EventLead) => row.guestCount },
      { key: 'status', header: 'Pipeline', render: (row: EventLead) => <StatusBadge status={row.status} /> },
      { key: 'value', header: 'Value', render: (row: EventLead) => formatCurrency(row.totalValue ?? row.estimatedValue ?? 0) },
      {
        key: 'actions',
        header: '',
        render: (row: EventLead) => (
          <ActionMenu items={[
            { label: 'View profile', icon: Eye, onClick: () => void openDetails(getEntityId(row)) },
            { label: 'Edit', icon: Pencil, onClick: () => openEdit(row) },
            { label: 'Delete', icon: Trash2, onClick: () => setDeleteTarget(row), variant: 'danger' },
          ]} />
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-rose-900 to-orange-800 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-200">Event Sales CRM</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Event Leads Management</h1>
            <p className="mt-3 max-w-2xl text-sm text-rose-100 sm:text-base">
              Manage weddings, banquets, conferences, and group events — from enquiry to proposal, advance, and booking conversion.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void reload()} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
              <RefreshCw className="mr-2 inline h-4 w-4" />Refresh
            </button>
            <button type="button" onClick={openCreate} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              <Plus className="mr-2 inline h-4 w-4" />Add Event Lead
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {([
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'pipeline', label: 'Pipeline', icon: ListChecks },
          { id: 'list', label: 'All Events', icon: ListChecks },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${view === tab.id ? 'bg-rose-600 text-white shadow-lg' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
          >
            <tab.icon className="mr-2 inline h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {(view === 'dashboard' || view === 'pipeline') && (
        <EventStatsCards stats={stats} isLoading={statsLoading} />
      )}

      {view === 'pipeline' && (
        <PipelineBoard columns={pipeline} isLoading={pipelineLoading} onSelect={(id) => void openDetails(id)} />
      )}

      {view === 'dashboard' && stats && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">Pipeline Breakdown</h3>
            <div className="mt-4 space-y-2">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <StatusBadge status={status} />
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">Event Types</h3>
            <div className="mt-4 space-y-2">
              {Object.entries(stats.eventTypeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-600">{getEventTypeLabel(type)}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {(view === 'list' || view === 'dashboard') && (
        <>
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-4">
            <SelectInput label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...EVENT_STATUSES]} />
            <SelectInput label="Event Type" value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)} options={[{ value: '', label: 'All types' }, ...EVENT_TYPES]} />
            <SelectInput label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} options={[{ value: '', label: 'All priorities' }, ...EVENT_PRIORITIES]} />
            <SelectInput label="Event Manager" value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} options={[{ value: '', label: 'All managers' }, ...staff.map((member) => ({ value: getEntityId(member), label: member.fullName || member.name || member.email }))]} />
          </div>

          <DataTable
            columns={columns}
            data={data}
            isLoading={isLoading}
            error={error}
            searchPlaceholder="Search event, contact, phone..."
            emptyTitle="No event leads found"
            emptyDescription="Add an event lead or adjust filters."
            rowKey={(row) => getEntityId(row)}
            onSearch={setSearch}
            pagination={{
              page: pagination.page,
              totalPages: pagination.totalPages,
              total: pagination.total,
              onPageChange: setPage,
            }}
          />
        </>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Event Lead' : 'Add Event Lead'}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={isSaving} onClick={() => void handleSave()}>{isSaving ? 'Saving...' : 'Save Event'}</button>
          </div>
        }
      >
        {formErrors.form && <p className="mb-4 text-sm text-rose-600">{formErrors.form}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Event Name" required value={form.eventName} error={formErrors.eventName} onChange={(e) => setForm((prev) => ({ ...prev, eventName: e.target.value }))} />
          <SelectInput label="Event Type" value={form.eventType} onChange={(e) => setForm((prev) => ({ ...prev, eventType: e.target.value }))} options={EVENT_TYPES} />
          <FormInput label="Contact Person" required value={form.contactPerson} error={formErrors.contactPerson} onChange={(e) => setForm((prev) => ({ ...prev, contactPerson: e.target.value }))} />
          <FormInput label="Phone" required value={form.phone} error={formErrors.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <FormInput label="Email" value={form.email || ''} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <FormInput label="Event Date" type="date" required value={form.eventDate} error={formErrors.eventDate} onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))} />
          <FormInput label="End Date" type="date" value={form.eventEndDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, eventEndDate: e.target.value }))} />
          <FormInput label="Start Time" value={form.eventStartTime || ''} onChange={(e) => setForm((prev) => ({ ...prev, eventStartTime: e.target.value }))} />
          <FormInput label="End Time" value={form.eventEndTime || ''} onChange={(e) => setForm((prev) => ({ ...prev, eventEndTime: e.target.value }))} />
          <FormInput label="Guest Count" type="number" required value={form.guestCount} error={formErrors.guestCount} onChange={(e) => setForm((prev) => ({ ...prev, guestCount: Number(e.target.value) }))} />
          <FormInput label="Budget Min" type="number" value={form.budgetMin ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, budgetMin: Number(e.target.value) }))} />
          <FormInput label="Budget Max" type="number" value={form.budgetMax ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, budgetMax: Number(e.target.value) }))} />
          <FormInput label="Estimated Value" type="number" value={form.estimatedValue ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, estimatedValue: Number(e.target.value), totalValue: Number(e.target.value) }))} />
          <SelectInput label="Status" value={form.status || 'new'} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} options={EVENT_STATUSES} />
          <SelectInput label="Priority" value={form.priority || 'medium'} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} options={EVENT_PRIORITIES} />
          <SelectInput label="Source" value={form.source || 'direct'} onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))} options={EVENT_SOURCES} />
          <SelectInput label="Event Manager" value={form.assignedTo || ''} onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))} options={[{ value: '', label: 'Unassigned' }, ...staff.map((member) => ({ value: getEntityId(member), label: member.fullName || member.name || member.email }))]} />
          <FormInput label="Package Name" value={form.packageName || ''} onChange={(e) => setForm((prev) => ({ ...prev, packageName: e.target.value }))} />
          <FormInput label="Package Price" type="number" value={form.packagePrice ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, packagePrice: Number(e.target.value) }))} />
          <FormInput label="Follow-up Date" type="date" value={form.followUpDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, followUpDate: e.target.value }))} />
          <div className="sm:col-span-2"><FormInput label="Venue Requirement" value={form.requirements?.venue || ''} onChange={(e) => setForm((prev) => ({ ...prev, requirements: { ...prev.requirements, venue: e.target.value } }))} /></div>
          <div className="sm:col-span-2"><FormInput label="Room Block Requirement" value={form.requirements?.roomBlock || ''} onChange={(e) => setForm((prev) => ({ ...prev, requirements: { ...prev.requirements, roomBlock: e.target.value } }))} /></div>
          <div className="sm:col-span-2"><FormInput label="Catering Requirement" value={form.requirements?.catering || ''} onChange={(e) => setForm((prev) => ({ ...prev, requirements: { ...prev.requirements, catering: e.target.value } }))} /></div>
          <div className="sm:col-span-2"><FormInput label="Decoration Requirement" value={form.requirements?.decoration || ''} onChange={(e) => setForm((prev) => ({ ...prev, requirements: { ...prev.requirements, decoration: e.target.value } }))} /></div>
          <div className="sm:col-span-2"><TextArea label="Notes" value={form.notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
        </div>
      </Modal>

      <EventDetailDrawer
        details={details}
        isOpen={detailsOpen}
        isLoading={detailsLoading}
        onClose={() => setDetailsOpen(false)}
        onEdit={() => { if (details?.event) { setDetailsOpen(false); openEdit(details.event); } }}
        onConvert={openConvert}
      />

      <Modal
        isOpen={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convert to Booking"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setConvertOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={isConverting} onClick={() => void handleConvert()}>{isConverting ? 'Converting...' : 'Create Booking'}</button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Check-in Date" type="date" required value={convertForm.checkInDate} onChange={(e) => setConvertForm((prev) => ({ ...prev, checkInDate: e.target.value }))} />
          <FormInput label="Check-out Date" type="date" required value={convertForm.checkOutDate} onChange={(e) => setConvertForm((prev) => ({ ...prev, checkOutDate: e.target.value }))} />
          <FormInput label="Adults" type="number" value={convertForm.adults} onChange={(e) => setConvertForm((prev) => ({ ...prev, adults: Number(e.target.value) }))} />
          <FormInput label="Children" type="number" value={convertForm.children} onChange={(e) => setConvertForm((prev) => ({ ...prev, children: Number(e.target.value) }))} />
          <FormInput label="Total Amount" type="number" value={convertForm.totalAmount} onChange={(e) => setConvertForm((prev) => ({ ...prev, totalAmount: Number(e.target.value) }))} />
          <FormInput label="Paid Amount" type="number" value={convertForm.paidAmount} onChange={(e) => setConvertForm((prev) => ({ ...prev, paidAmount: Number(e.target.value) }))} />
          <div className="sm:col-span-2"><TextArea label="Notes" value={convertForm.notes} onChange={(e) => setConvertForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Archive Event Lead"
        message={`Are you sure you want to archive "${deleteTarget?.eventName}"?`}
        confirmLabel="Archive"
        variant="danger"
      />
    </div>
  );
}
