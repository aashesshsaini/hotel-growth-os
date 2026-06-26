'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Eye, MessageCircle, Pencil, Phone, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { addTaskNote, assignTask, createTask, deleteTask, getTaskById, getTasks, getTaskStats, rescheduleTask, updateTask, updateTaskStatus } from '@/services/tasks.service';
import { staffService } from '@/services/staff.service';
import type { FollowUp, FollowUpFormData, FollowUpStats, Staff } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatDateTime } from '@/utils/format';

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
  { value: 'booking_confirmation', label: 'Booking Confirmation' },
  { value: 'review_request', label: 'Review Request' },
  { value: 'general', label: 'General' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const RELATED_TYPES = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Enquiry', label: 'Enquiry' },
  { value: 'Guest', label: 'Guest' },
  { value: 'Booking', label: 'Booking' },
  { value: 'Payment', label: 'Payment' },
  { value: 'Review', label: 'Review' },
  { value: 'Campaign', label: 'Campaign' },
  { value: 'Other', label: 'Other' },
];

const emptyForm: FollowUpFormData = {
  title: '',
  description: '',
  assignedTo: '',
  dueDate: '',
  reminderAt: '',
  followUpType: 'call',
  priority: 'medium',
  status: 'scheduled',
  notes: '',
};

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'completed'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : ['missed', 'overdue', 'cancelled'].includes(status)
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : ['in_progress', 'rescheduled'].includes(status)
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(status.replace(/_/g, ' '))}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone = priority === 'urgent' ? 'bg-rose-600 text-white' : priority === 'high' ? 'bg-orange-100 text-orange-700' : priority === 'low' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{capitalize(priority)}</span>;
}

function StatCard({ title, value, helper }: { title: string; value: string | number; helper?: string }) {
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>{helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}</div>;
}

const getAssigneeName = (item: FollowUp) => typeof item.assignedTo === 'object' ? item.assignedTo.name || item.assignedTo.email : 'Unassigned';

export default function FollowUpsPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');

  const listParams = useMemo(() => ({
    status: statusFilter || undefined,
    followUpType: typeFilter || undefined,
    priority: priorityFilter || undefined,
    assignedTo: assignedFilter || undefined,
    dueFrom: dueFrom || undefined,
    dueTo: dueTo || undefined,
  }), [statusFilter, typeFilter, priorityFilter, assignedFilter, dueFrom, dueTo]);
  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;
  const fetchFollowUps = useCallback((params: Parameters<typeof getTasks>[0]) => getTasks({ ...params, ...listParamsRef.current }), []);
  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } = usePaginatedQuery<FollowUp>({ fetchFn: fetchFollowUps });

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getTaskStats());
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
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [form, setForm] = useState<FollowUpFormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [detail, setDetail] = useState<FollowUp | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<FollowUp | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [statusTarget, setStatusTarget] = useState<FollowUp | null>(null);
  const [nextStatus, setNextStatus] = useState('completed');
  const [statusNotes, setStatusNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUp | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [noteTarget, setNoteTarget] = useState<FollowUp | null>(null);
  const [noteText, setNoteText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<FollowUp | null>(null);

  const reload = async () => Promise.all([refresh(), loadStats()]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: FollowUp) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description || '',
      assignedTo: typeof item.assignedTo === 'object' ? item.assignedTo.id || item.assignedTo._id : item.assignedTo || '',
      dueDate: item.dueDate ? item.dueDate.slice(0, 16) : '',
      reminderAt: item.reminderAt ? item.reminderAt.slice(0, 16) : '',
      followUpType: item.followUpType || 'general',
      priority: item.priority,
      status: item.status,
      notes: item.notes || '',
      outcome: item.outcome || '',
      relatedTo: item.relatedTo,
    });
    setFormErrors({});
    setFormOpen(true);
    setDetailOpen(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Title is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (editing) {
        await updateTask(getEntityId(editing), form);
        showToast('Follow-up updated', 'success');
      } else {
        await createTask(form);
        showToast('Follow-up created', 'success');
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save follow-up' });
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = async (item: FollowUp) => {
    setDetailOpen(true);
    try {
      setDetail(await getTaskById(getEntityId(item)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load follow-up', 'error');
    }
  };

  const handleAssign = async () => {
    if (!assignTarget || !assignTo) return;
    setIsSaving(true);
    try {
      await assignTask(getEntityId(assignTarget), assignTo);
      showToast('Follow-up assigned', 'success');
      setAssignTarget(null);
      setAssignTo('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to assign follow-up', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatus = async () => {
    if (!statusTarget) return;
    setIsSaving(true);
    try {
      await updateTaskStatus(getEntityId(statusTarget), { status: nextStatus, notes: statusNotes || undefined, outcome: outcome || undefined });
      showToast('Follow-up status updated', 'success');
      setStatusTarget(null);
      setStatusNotes('');
      setOutcome('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    setIsSaving(true);
    try {
      await rescheduleTask(getEntityId(rescheduleTarget), { dueDate: rescheduleDate });
      showToast('Follow-up rescheduled', 'success');
      setRescheduleTarget(null);
      setRescheduleDate('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reschedule follow-up', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteTarget || !noteText.trim()) return;
    setIsSaving(true);
    try {
      await addTaskNote(getEntityId(noteTarget), noteText);
      showToast('Follow-up note added', 'success');
      setNoteTarget(null);
      setNoteText('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add note', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteTask(getEntityId(deleteTarget));
      showToast('Follow-up archived', 'success');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to archive follow-up', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const todayItems = data.filter((item) => item.dueDate && new Date(item.dueDate).toDateString() === new Date().toDateString() && !['completed', 'cancelled'].includes(item.status));
  const overdueItems = data.filter((item) => item.dueDate && new Date(item.dueDate) < new Date() && !['completed', 'cancelled'].includes(item.status));

  const columns = [
    { key: 'title', header: 'Follow-up', render: (row: FollowUp) => <div><p className="font-semibold text-slate-900">{row.title}</p><p className="text-xs text-slate-500">{capitalize((row.followUpType || 'general').replace(/_/g, ' '))} · {row.relatedTo?.label || row.relatedTo?.type || 'General'}</p></div> },
    { key: 'assignedTo', header: 'Assigned To', render: (row: FollowUp) => getAssigneeName(row) },
    { key: 'dueDate', header: 'Due', render: (row: FollowUp) => row.dueDate ? formatDateTime(row.dueDate) : '—' },
    { key: 'priority', header: 'Priority', render: (row: FollowUp) => <PriorityBadge priority={row.priority} /> },
    { key: 'status', header: 'Status', render: (row: FollowUp) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: FollowUp) => (
        <div className="flex gap-1">
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => void openDetail(row)}><Eye className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => { setAssignTarget(row); setAssignTo(typeof row.assignedTo === 'object' ? row.assignedTo.id || row.assignedTo._id || '' : row.assignedTo || ''); }}><UserPlus className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => { setRescheduleTarget(row); setRescheduleDate(row.dueDate?.slice(0, 16) || ''); }}><RefreshCw className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-violet-700 to-fuchsia-600 px-5 py-6 text-white sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-100">Hotel CRM Tasks</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Follow-ups Management</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100">Manage calls, WhatsApp reminders, meetings, payment nudges, booking confirmations, and guest relationship follow-through.</p></div>
            <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50" onClick={openCreate}><Plus className="mr-2 inline h-4 w-4" /> Add Follow-up</button>
          </div>
        </div>
      </section>

      {statsLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div> : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard title="Today" value={stats.todayFollowUps} helper="Due today" /><StatCard title="Overdue" value={stats.overdueFollowUps} helper="Needs attention" /><StatCard title="Pending" value={stats.pendingFollowUps} helper={`${stats.totalFollowUps} total`} /><StatCard title="Completed" value={stats.completedFollowUps} helper="Closed follow-ups" /></div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-violet-600" /><h2 className="font-semibold text-slate-900">Today Follow-ups</h2></div><div className="space-y-2">{todayItems.slice(0, 5).map((item) => <button key={getEntityId(item)} type="button" onClick={() => void openDetail(item)} className="w-full rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"><p className="font-medium text-slate-900">{item.title}</p><p className="text-xs text-slate-500">{item.dueDate ? formatDateTime(item.dueDate) : 'No time'} · {getAssigneeName(item)}</p></button>)}{!todayItems.length ? <p className="text-sm text-slate-500">No follow-ups due today.</p> : null}</div></section>
        <section className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2"><RefreshCw className="h-5 w-5 text-rose-600" /><h2 className="font-semibold text-slate-900">Overdue Follow-ups</h2></div><div className="space-y-2">{overdueItems.slice(0, 5).map((item) => <button key={getEntityId(item)} type="button" onClick={() => void openDetail(item)} className="w-full rounded-xl border border-rose-100 p-3 text-left hover:bg-rose-50"><p className="font-medium text-slate-900">{item.title}</p><p className="text-xs text-rose-600">{item.dueDate ? formatDateTime(item.dueDate) : 'No due date'} · {getAssigneeName(item)}</p></button>)}{!overdueItems.length ? <p className="text-sm text-slate-500">No overdue follow-ups.</p> : null}</div></section>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><SelectInput label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...STATUSES]} /><SelectInput label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[{ value: '', label: 'All types' }, ...TYPES]} /><SelectInput label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} options={[{ value: '', label: 'All priorities' }, ...PRIORITIES]} /><SelectInput label="Assigned Staff" value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} options={[{ value: '', label: 'All staff' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} /><FormInput label="Due From" type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} /><FormInput label="Due To" type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} /></div>
      </div>

      <DataTable columns={columns} data={data} isLoading={isLoading} error={error} onSearch={setSearch} searchPlaceholder="Search follow-ups by title, notes, description..." rowKey={(row) => getEntityId(row)} emptyTitle="No follow-ups found" emptyDescription="Create a follow-up for a lead, enquiry, guest, booking, or payment." pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }} />

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Follow-up' : 'Add Follow-up'} size="xl" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Follow-up'}</button></div>}>
        {formErrors.form ? <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formErrors.form}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2"><FormInput label="Title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} error={formErrors.title} required /><SelectInput label="Type" value={form.followUpType || 'general'} onChange={(e) => setForm((prev) => ({ ...prev, followUpType: e.target.value }))} options={TYPES} /><SelectInput label="Priority" value={form.priority || 'medium'} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} options={PRIORITIES} /><SelectInput label="Status" value={form.status || 'scheduled'} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} options={STATUSES} /><SelectInput label="Assigned To" value={form.assignedTo || ''} onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))} options={[{ value: '', label: 'Assign later' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} /><FormInput label="Due Date/Time" type="datetime-local" value={form.dueDate || ''} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} /><FormInput label="Reminder Date/Time" type="datetime-local" value={form.reminderAt || ''} onChange={(e) => setForm((prev) => ({ ...prev, reminderAt: e.target.value }))} /><SelectInput label="Related Type" value={form.relatedTo?.type || ''} onChange={(e) => setForm((prev) => ({ ...prev, relatedTo: e.target.value ? { type: e.target.value, id: prev.relatedTo?.id || '', label: prev.relatedTo?.label } : undefined }))} options={[{ value: '', label: 'No relation' }, ...RELATED_TYPES]} /><FormInput label="Related ID" value={form.relatedTo?.id || ''} onChange={(e) => setForm((prev) => ({ ...prev, relatedTo: prev.relatedTo ? { ...prev.relatedTo, id: e.target.value } : undefined }))} /><FormInput label="Related Label" value={form.relatedTo?.label || ''} onChange={(e) => setForm((prev) => ({ ...prev, relatedTo: prev.relatedTo ? { ...prev.relatedTo, label: e.target.value } : undefined }))} /><TextArea label="Description" value={form.description || ''} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="sm:col-span-2" /><TextArea label="Notes" value={form.notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="sm:col-span-2" /></div>
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => { setDetailOpen(false); setDetail(null); }} title="Follow-up Details" size="xl">
        {detail ? <div className="space-y-5"><div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4"><div><h3 className="text-xl font-semibold text-slate-900">{detail.title}</h3><p className="text-sm text-slate-500">{capitalize((detail.followUpType || 'general').replace(/_/g, ' '))} · {getAssigneeName(detail)}</p></div><div className="flex flex-col items-end gap-2"><PriorityBadge priority={detail.priority} /><StatusBadge status={detail.status} /></div></div><div className="grid gap-4 sm:grid-cols-2"><p className="text-sm"><span className="font-semibold">Due:</span> {detail.dueDate ? formatDateTime(detail.dueDate) : '—'}</p><p className="text-sm"><span className="font-semibold">Reminder:</span> {detail.reminderAt ? formatDateTime(detail.reminderAt) : '—'}</p><p className="text-sm"><span className="font-semibold">Related:</span> {detail.relatedTo?.label || detail.relatedTo?.type || 'General'}</p><p className="text-sm"><span className="font-semibold">Outcome:</span> {detail.outcome || '—'}</p></div><div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-slate-100 p-4"><h4 className="mb-2 text-sm font-semibold">Notes</h4><p className="whitespace-pre-wrap text-sm text-slate-600">{detail.notes || 'No notes yet.'}</p></div><div className="rounded-xl border border-slate-100 p-4"><h4 className="mb-2 text-sm font-semibold">Description</h4><p className="whitespace-pre-wrap text-sm text-slate-600">{detail.description || 'No description.'}</p></div></div>{detail.timeline?.length ? <div><h4 className="mb-2 text-sm font-semibold">Timeline</h4><div className="space-y-2">{detail.timeline.slice(0, 8).map((item, index) => <div key={`${item.action}-${index}`} className="rounded-lg border border-slate-100 px-3 py-2 text-sm"><p className="font-medium">{item.action.replace(/\./g, ' ')}</p><p className="text-xs text-slate-500">{item.message || ''} {item.createdAt ? `· ${formatDateTime(item.createdAt)}` : ''}</p></div>)}</div></div> : null}<div className="flex flex-wrap justify-end gap-2"><a className="btn-secondary" href={`tel:${detail.relatedTo?.label || ''}`}><Phone className="mr-2 h-4 w-4" />Call</a><a className="btn-secondary" href={`https://wa.me/`} target="_blank"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a><button type="button" className="btn-secondary" onClick={() => { setNoteTarget(detail); setNoteText(''); }}>Add Note</button><button type="button" className="btn-secondary" onClick={() => { setRescheduleTarget(detail); setRescheduleDate(detail.dueDate?.slice(0, 16) || ''); }}>Reschedule</button><button type="button" className="btn-secondary" onClick={() => openEdit(detail)}>Edit</button><button type="button" className="btn-primary" onClick={() => { setStatusTarget(detail); setNextStatus('completed'); }}>Mark Completed</button></div></div> : null}
      </Modal>

      <Modal isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} title="Assign Follow-up" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setAssignTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleAssign()} disabled={isSaving}>Assign</button></div>}><SelectInput label="Staff" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} options={[{ value: '', label: 'Select staff' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} /></Modal>
      <Modal isOpen={!!statusTarget} onClose={() => setStatusTarget(null)} title="Update Follow-up Status" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setStatusTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleStatus()} disabled={isSaving}>Update</button></div>}><div className="space-y-4"><SelectInput label="Status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} options={STATUSES} /><TextArea label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} /><TextArea label="Notes" value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} /></div></Modal>
      <Modal isOpen={!!rescheduleTarget} onClose={() => setRescheduleTarget(null)} title="Reschedule Follow-up" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setRescheduleTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleReschedule()} disabled={isSaving || !rescheduleDate}>Reschedule</button></div>}><FormInput label="New Due Date/Time" type="datetime-local" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} required /></Modal>
      <Modal isOpen={!!noteTarget} onClose={() => setNoteTarget(null)} title="Add Follow-up Note" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setNoteTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleAddNote()} disabled={isSaving || !noteText.trim()}>Add Note</button></div>}><TextArea label="Note" value={noteText} onChange={(e) => setNoteText(e.target.value)} /></Modal>
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Archive Follow-up" message={`Archive follow-up ${deleteTarget?.title}?`} confirmLabel="Archive" isLoading={isSaving} variant="danger" />
    </div>
  );
}
