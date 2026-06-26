'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCheck, Eye, Grid3X3, ListChecks, Pencil, Plus, Sparkles, Trash2, UserPlus } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  assignHousekeepingTask,
  createHousekeepingTask,
  deleteHousekeepingTask,
  getHousekeepingStats,
  getHousekeepingTaskById,
  getHousekeepingTasks,
  updateHousekeepingTask,
  updateHousekeepingTaskStatus,
} from '@/services/housekeeping.service';
import { createMaintenanceIssue } from '@/services/maintenance.service';
import { getRooms, updateHousekeepingStatus } from '@/services/rooms.service';
import { staffService } from '@/services/staff.service';
import type { HousekeepingStats, HousekeepingTask, HousekeepingTaskFormData, Room, Staff } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatDateTime } from '@/utils/format';

const TASK_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'inspection_pending', label: 'Inspection Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reclean_required', label: 'Re-clean Required' },
];

const TASK_TYPES = [
  { value: 'regular_cleaning', label: 'Regular Cleaning' },
  { value: 'deep_cleaning', label: 'Deep Cleaning' },
  { value: 'checkout_cleaning', label: 'Checkout Cleaning' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'maintenance_report', label: 'Maintenance Report' },
  { value: 'linen_change', label: 'Linen Change' },
  { value: 'bathroom_cleaning', label: 'Bathroom Cleaning' },
  { value: 'room_setup', label: 'Room Setup' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const HOUSEKEEPING_STATUSES = [
  { value: 'clean', label: 'Clean' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'cleaning_in_progress', label: 'Cleaning In Progress' },
  { value: 'inspected', label: 'Inspected' },
  { value: 'needs_attention', label: 'Needs Attention' },
];

const emptyForm: HousekeepingTaskFormData = {
  roomId: '',
  assignedTo: '',
  taskType: 'regular_cleaning',
  status: 'pending',
  priority: 'medium',
  scheduledFor: '',
  estimatedMinutes: 30,
  title: '',
  description: '',
  notes: '',
  checklist: [],
};

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'completed'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : ['rejected', 'reclean_required'].includes(status)
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : status === 'in_progress'
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(status.replace(/_/g, ' '))}</span>;
}

function StatCard({ title, value, helper }: { title: string; value: number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

const getRoomLabel = (room: Room) => `Room ${room.roomNumber}${room.roomName ? ` · ${room.roomName}` : ''}`;
const getAssigneeName = (task: HousekeepingTask) => typeof task.assignedTo === 'object' ? task.assignedTo.name || task.assignedTo.email : 'Unassigned';
const getTaskRoom = (task: HousekeepingTask) => typeof task.roomId === 'object' ? getRoomLabel(task.roomId) : 'Room';

export default function HousekeepingPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<HousekeepingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'table' | 'rooms'>('board');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  const listParams = useMemo(() => ({
    status: statusFilter || undefined,
    taskType: typeFilter || undefined,
    priority: priorityFilter || undefined,
    assignedTo: assignedFilter || undefined,
  }), [statusFilter, typeFilter, priorityFilter, assignedFilter]);

  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;

  const fetchTasks = useCallback((params: Parameters<typeof getHousekeepingTasks>[0]) => getHousekeepingTasks({ ...params, ...listParamsRef.current }), []);
  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } = usePaginatedQuery<HousekeepingTask>({ fetchFn: fetchTasks });

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getHousekeepingStats());
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
    void Promise.all([
      getRooms({ limit: 100 }).then((result) => setRooms(result.data)).catch(() => setRooms([])),
      staffService.list({ limit: 100, role: 'housekeeping' }).then((result) => setStaff(result.data)).catch(() => setStaff([])),
    ]);
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<HousekeepingTask | null>(null);
  const [form, setForm] = useState<HousekeepingTaskFormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [detailTask, setDetailTask] = useState<HousekeepingTask | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusTask, setStatusTask] = useState<HousekeepingTask | null>(null);
  const [nextStatus, setNextStatus] = useState('in_progress');
  const [statusNotes, setStatusNotes] = useState('');
  const [assignTask, setAssignTask] = useState<HousekeepingTask | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<HousekeepingTask | null>(null);
  const [roomStatusTarget, setRoomStatusTarget] = useState<Room | null>(null);
  const [roomStatus, setRoomStatus] = useState('clean');
  const [maintenanceTask, setMaintenanceTask] = useState<HousekeepingTask | null>(null);
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [maintenanceDescription, setMaintenanceDescription] = useState('');
  const [maintenancePriority, setMaintenancePriority] = useState('medium');
  const [maintenanceIssueType, setMaintenanceIssueType] = useState('other');

  const reload = async () => {
    await Promise.all([refresh(), loadStats(), getRooms({ limit: 100 }).then((result) => setRooms(result.data))]);
  };

  const openCreate = () => {
    setEditingTask(null);
    setForm({ ...emptyForm, roomId: rooms[0] ? getEntityId(rooms[0]) : '' });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (task: HousekeepingTask) => {
    setEditingTask(task);
    setForm({
      roomId: typeof task.roomId === 'object' ? getEntityId(task.roomId) : task.roomId,
      assignedTo: typeof task.assignedTo === 'object' ? task.assignedTo.id || task.assignedTo._id : task.assignedTo || '',
      taskType: task.taskType,
      status: task.status,
      priority: task.priority,
      scheduledFor: task.scheduledFor ? task.scheduledFor.slice(0, 16) : '',
      estimatedMinutes: task.estimatedMinutes,
      actualMinutes: task.actualMinutes,
      title: task.title,
      description: task.description,
      notes: task.notes,
      checklist: task.checklist ?? [],
    });
    setFormErrors({});
    setFormOpen(true);
    setDetailOpen(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.roomId) errors.roomId = 'Room is required';
    if (!form.title.trim()) errors.title = 'Title is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (editingTask) {
        await updateHousekeepingTask(getEntityId(editingTask), form);
        showToast('Housekeeping task updated', 'success');
      } else {
        await createHousekeepingTask(form);
        showToast('Housekeeping task created', 'success');
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save task' });
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = async (task: HousekeepingTask) => {
    setDetailOpen(true);
    try {
      setDetailTask(await getHousekeepingTaskById(getEntityId(task)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load task', 'error');
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusTask) return;
    setIsSaving(true);
    try {
      await updateHousekeepingTaskStatus(getEntityId(statusTask), { status: nextStatus, notes: statusNotes || undefined });
      showToast('Task status updated', 'success');
      setStatusTask(null);
      setStatusNotes('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTask || !assignTo) return;
    setIsSaving(true);
    try {
      await assignHousekeepingTask(getEntityId(assignTask), assignTo);
      showToast('Task assigned', 'success');
      setAssignTask(null);
      setAssignTo('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to assign task', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoomStatus = async () => {
    if (!roomStatusTarget) return;
    setIsSaving(true);
    try {
      await updateHousekeepingStatus(getEntityId(roomStatusTarget), roomStatus);
      showToast('Room cleaning status updated', 'success');
      setRoomStatusTarget(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update room status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReportMaintenance = async () => {
    if (!maintenanceTask || !maintenanceTitle.trim()) return;
    const roomId = typeof maintenanceTask.roomId === 'object' ? getEntityId(maintenanceTask.roomId) : maintenanceTask.roomId;
    setIsSaving(true);
    try {
      await createMaintenanceIssue({
        roomId,
        sourceHousekeepingTaskId: getEntityId(maintenanceTask),
        title: maintenanceTitle,
        description: maintenanceDescription || undefined,
        issueType: maintenanceIssueType,
        priority: maintenancePriority,
      });
      showToast('Maintenance issue reported', 'success');
      setMaintenanceTask(null);
      setMaintenanceTitle('');
      setMaintenanceDescription('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to report maintenance issue', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteHousekeepingTask(getEntityId(deleteTarget));
      showToast('Task deleted', 'success');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete task', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'taskNumber', header: 'Task', render: (row: HousekeepingTask) => <div><p className="font-semibold text-slate-900">{row.taskNumber}</p><p className="text-xs text-slate-500">{row.title}</p></div> },
    { key: 'room', header: 'Room', render: (row: HousekeepingTask) => getTaskRoom(row) },
    { key: 'type', header: 'Type', render: (row: HousekeepingTask) => capitalize(row.taskType.replace(/_/g, ' ')) },
    { key: 'assignee', header: 'Assigned To', render: (row: HousekeepingTask) => getAssigneeName(row) },
    { key: 'scheduledFor', header: 'Schedule', render: (row: HousekeepingTask) => row.scheduledFor ? formatDateTime(row.scheduledFor) : '—' },
    { key: 'status', header: 'Status', render: (row: HousekeepingTask) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: HousekeepingTask) => (
        <div className="flex gap-1">
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => void openDetail(row)}><Eye className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => { setAssignTask(row); setAssignTo(typeof row.assignedTo === 'object' ? row.assignedTo.id || row.assignedTo._id || '' : row.assignedTo || ''); }}><UserPlus className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => { setStatusTask(row); setNextStatus(row.status === 'in_progress' ? 'completed' : 'in_progress'); }}><Sparkles className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  const boardStatuses = ['pending', 'assigned', 'in_progress', 'inspection_pending', 'completed'];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-slate-950 via-emerald-700 to-cyan-700 px-5 py-6 text-white sm:px-6 lg:px-8">
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-100">Hotel Operations</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Housekeeping Management</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">Control daily room readiness, cleaning assignments, inspections, and housekeeping workload.</p>
            </div>
            <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" onClick={openCreate}>
              <Plus className="mr-2 inline h-4 w-4" /> Add Task
            </button>
          </div>
        </div>
      </section>

      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Open Tasks" value={stats.pending + stats.assigned + stats.inProgress + stats.inspectionPending + stats.recleanRequired} helper={`${stats.completed} completed`} />
          <StatCard title="Dirty Rooms" value={stats.dirtyRooms} helper={`${stats.cleaningInProgressRooms} cleaning now`} />
          <StatCard title="Inspection Queue" value={stats.inspectionPending + stats.inspectionRooms} helper={`${stats.recleanRequired} re-clean required`} />
          <StatCard title="Clean Rooms" value={stats.cleanRooms} helper={`${stats.workloadByStaff.length} staff with workload`} />
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <SelectInput label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...TASK_STATUSES]} />
          <SelectInput label="Task Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[{ value: '', label: 'All types' }, ...TASK_TYPES]} />
          <SelectInput label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} options={[{ value: '', label: 'All priorities' }, ...PRIORITIES]} />
          <SelectInput label="Housekeeper" value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} options={[{ value: '', label: 'All staff' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
          <div className="ml-auto flex rounded-lg border border-slate-200 p-0.5">
            <button type="button" className={`rounded-md p-2 ${viewMode === 'board' ? 'bg-slate-100' : ''}`} onClick={() => setViewMode('board')}><ClipboardCheck className="h-4 w-4" /></button>
            <button type="button" className={`rounded-md p-2 ${viewMode === 'table' ? 'bg-slate-100' : ''}`} onClick={() => setViewMode('table')}><ListChecks className="h-4 w-4" /></button>
            <button type="button" className={`rounded-md p-2 ${viewMode === 'rooms' ? 'bg-slate-100' : ''}`} onClick={() => setViewMode('rooms')}><Grid3X3 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {viewMode === 'board' && (
        <div className="grid gap-4 xl:grid-cols-5">
          {boardStatuses.map((status) => (
            <div key={status} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{capitalize(status.replace(/_/g, ' '))}</h3>
                <span className="text-xs text-slate-500">{data.filter((task) => task.status === status).length}</span>
              </div>
              <div className="space-y-3">
                {data.filter((task) => task.status === status).map((task) => (
                  <button key={getEntityId(task)} type="button" onClick={() => void openDetail(task)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{getTaskRoom(task)} · {capitalize(task.priority)}</p>
                    <div className="mt-3"><StatusBadge status={task.status} /></div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'rooms' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => (
            <div key={getEntityId(room)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold text-slate-900">Room {room.roomNumber}</p><p className="text-xs text-slate-500">{room.floor ? `Floor ${room.floor}` : room.roomName || 'Room'}</p></div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize text-slate-700">{String(room.housekeepingStatus || 'clean').replace(/_/g, ' ')}</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{room.cleaningNotes || 'No cleaning notes'}</p>
              <button type="button" className="btn-secondary mt-4 w-full text-sm" onClick={() => { setRoomStatusTarget(room); setRoomStatus(room.housekeepingStatus || 'clean'); }}>Update Status</button>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'table' && (
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          error={error}
          onSearch={setSearch}
          searchPlaceholder="Search tasks, task number, room..."
          rowKey={(row) => getEntityId(row)}
          emptyTitle="No housekeeping tasks"
          emptyDescription="Create tasks for today's room readiness schedule."
          pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingTask ? 'Edit Housekeeping Task' : 'Add Housekeeping Task'} size="xl" footer={
        <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Task'}</button></div>
      }>
        {formErrors.form ? <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formErrors.form}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput label="Room" value={form.roomId} onChange={(e) => setForm((prev) => ({ ...prev, roomId: e.target.value }))} options={[{ value: '', label: 'Select room' }, ...rooms.map((room) => ({ value: getEntityId(room), label: getRoomLabel(room) }))]} error={formErrors.roomId} required />
          <SelectInput label="Assigned Staff" value={form.assignedTo || ''} onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))} options={[{ value: '', label: 'Assign later' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
          <SelectInput label="Task Type" value={form.taskType} onChange={(e) => setForm((prev) => ({ ...prev, taskType: e.target.value }))} options={TASK_TYPES} />
          <SelectInput label="Priority" value={form.priority || 'medium'} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} options={PRIORITIES} />
          <SelectInput label="Status" value={form.status || 'pending'} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} options={TASK_STATUSES} />
          <FormInput label="Scheduled For" type="datetime-local" value={form.scheduledFor || ''} onChange={(e) => setForm((prev) => ({ ...prev, scheduledFor: e.target.value }))} />
          <FormInput label="Estimated Minutes" type="number" value={form.estimatedMinutes ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, estimatedMinutes: e.target.value ? Number(e.target.value) : undefined }))} />
          <FormInput label="Actual Minutes" type="number" value={form.actualMinutes ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, actualMinutes: e.target.value ? Number(e.target.value) : undefined }))} />
          <FormInput label="Title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} error={formErrors.title} className="sm:col-span-2" required />
          <TextArea label="Description" value={form.description || ''} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="sm:col-span-2" />
          <TextArea label="Notes" value={form.notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="sm:col-span-2" />
        </div>
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => { setDetailOpen(false); setDetailTask(null); }} title="Housekeeping Task Details" size="xl">
        {detailTask ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{detailTask.taskNumber}</p><h3 className="mt-1 text-xl font-semibold text-slate-900">{detailTask.title}</h3><p className="text-sm text-slate-500">{getTaskRoom(detailTask)} · {getAssigneeName(detailTask)}</p></div>
              <StatusBadge status={detailTask.status} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <p className="text-sm"><span className="font-semibold">Type:</span> {capitalize(detailTask.taskType.replace(/_/g, ' '))}</p>
              <p className="text-sm"><span className="font-semibold">Priority:</span> {capitalize(detailTask.priority)}</p>
              <p className="text-sm"><span className="font-semibold">Scheduled:</span> {detailTask.scheduledFor ? formatDateTime(detailTask.scheduledFor) : '—'}</p>
              <p className="text-sm"><span className="font-semibold">Minutes:</span> {detailTask.actualMinutes || detailTask.estimatedMinutes || '—'}</p>
            </div>
            {detailTask.description ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{detailTask.description}</p> : null}
            {detailTask.timeline?.length ? <div><h4 className="mb-2 text-sm font-semibold">Timeline</h4><div className="space-y-2">{detailTask.timeline.slice(0, 6).map((item, index) => <div key={`${item.action}-${index}`} className="rounded-lg border border-slate-100 px-3 py-2 text-sm"><p className="font-medium">{item.action.replace(/\./g, ' ')}</p><p className="text-xs text-slate-500">{item.message || ''} {item.createdAt ? `· ${formatDateTime(item.createdAt)}` : ''}</p></div>)}</div></div> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => { if (detailTask) { setMaintenanceTask(detailTask); setMaintenanceTitle(`Maintenance issue from ${getTaskRoom(detailTask)}`); } }}>Report Maintenance</button>
              <button type="button" className="btn-secondary" onClick={() => detailTask && openEdit(detailTask)}>Edit</button>
              <button type="button" className="btn-primary" onClick={() => { if (detailTask) { setStatusTask(detailTask); setNextStatus(detailTask.status === 'in_progress' ? 'completed' : 'in_progress'); } }}>Update Status</button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={!!assignTask} onClose={() => setAssignTask(null)} title="Assign Housekeeping Staff" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setAssignTask(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleAssign()} disabled={isSaving}>Assign</button></div>}>
        <SelectInput label="Housekeeper" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} options={[{ value: '', label: 'Select staff' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
      </Modal>

      <Modal isOpen={!!statusTask} onClose={() => setStatusTask(null)} title="Update Task Status" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setStatusTask(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleStatusUpdate()} disabled={isSaving}>Update</button></div>}>
        <div className="space-y-4"><SelectInput label="Status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} options={TASK_STATUSES} /><TextArea label="Notes" value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} /></div>
      </Modal>

      <Modal isOpen={!!roomStatusTarget} onClose={() => setRoomStatusTarget(null)} title="Update Room Cleaning Status" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setRoomStatusTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleRoomStatus()} disabled={isSaving}>Update</button></div>}>
        <SelectInput label="Housekeeping Status" value={roomStatus} onChange={(e) => setRoomStatus(e.target.value)} options={HOUSEKEEPING_STATUSES} />
      </Modal>

      <Modal isOpen={!!maintenanceTask} onClose={() => setMaintenanceTask(null)} title="Report Maintenance Issue" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setMaintenanceTask(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleReportMaintenance()} disabled={isSaving || !maintenanceTitle.trim()}>Report Issue</button></div>}>
        <div className="space-y-4">
          <FormInput label="Issue Title" value={maintenanceTitle} onChange={(e) => setMaintenanceTitle(e.target.value)} required />
          <SelectInput label="Issue Type" value={maintenanceIssueType} onChange={(e) => setMaintenanceIssueType(e.target.value)} options={[{ value: 'ac', label: 'AC' }, { value: 'plumbing', label: 'Plumbing' }, { value: 'electrical', label: 'Electrical' }, { value: 'furniture', label: 'Furniture' }, { value: 'bathroom', label: 'Bathroom' }, { value: 'cleaning_equipment', label: 'Cleaning Equipment' }, { value: 'wifi', label: 'WiFi' }, { value: 'tv', label: 'TV' }, { value: 'door_lock', label: 'Door Lock' }, { value: 'safety', label: 'Safety' }, { value: 'other', label: 'Other' }]} />
          <SelectInput label="Priority" value={maintenancePriority} onChange={(e) => setMaintenancePriority(e.target.value)} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
          <TextArea label="Description" value={maintenanceDescription} onChange={(e) => setMaintenanceDescription(e.target.value)} />
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Housekeeping Task" message={`Delete task ${deleteTarget?.taskNumber}?`} confirmLabel="Delete" isLoading={isSaving} variant="danger" />
    </div>
  );
}
