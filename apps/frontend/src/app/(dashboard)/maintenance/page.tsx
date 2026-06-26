'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Eye, Gauge, ListChecks, Pencil, Plus, Trash2, UserPlus, Wrench } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  assignMaintenanceIssue,
  createMaintenanceIssue,
  deleteMaintenanceIssue,
  getMaintenanceIssueById,
  getMaintenanceIssues,
  getMaintenanceStats,
  getRoomMaintenanceHistory,
  updateMaintenanceIssue,
  updateMaintenanceIssueStatus,
} from '@/services/maintenance.service';
import { getRooms, markRoomMaintenance } from '@/services/rooms.service';
import { staffService } from '@/services/staff.service';
import type { MaintenanceIssue, MaintenanceIssueFormData, MaintenanceStats, Room, Staff } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatCurrency, formatDateTime } from '@/utils/format';

const ISSUE_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
];

const ISSUE_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const ISSUE_TYPES = [
  { value: 'ac', label: 'AC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'cleaning_equipment', label: 'Cleaning Equipment' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'tv', label: 'TV' },
  { value: 'door_lock', label: 'Door Lock' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
];

const ROOM_MAINTENANCE_STATUSES = [
  { value: 'none', label: 'No Issue' },
  { value: 'minor_issue', label: 'Minor Issue' },
  { value: 'major_issue', label: 'Major Issue' },
  { value: 'under_repair', label: 'Under Repair' },
  { value: 'resolved', label: 'Resolved' },
];

const emptyForm: MaintenanceIssueFormData = {
  roomId: '',
  assignedTo: '',
  title: '',
  description: '',
  issueType: 'other',
  status: 'open',
  priority: 'medium',
  scheduledFor: '',
  estimatedCost: undefined,
  actualCost: undefined,
  vendorName: '',
  vendorPhone: '',
  resolutionNotes: '',
  holdReason: '',
};

function StatusBadge({ status }: { status: string }) {
  const tone = ['resolved', 'closed'].includes(status)
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : status === 'urgent'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : ['in_progress', 'assigned'].includes(status)
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(status.replace(/_/g, ' '))}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone = priority === 'urgent'
    ? 'bg-rose-600 text-white'
    : priority === 'high'
      ? 'bg-orange-100 text-orange-700'
      : priority === 'medium'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{capitalize(priority)}</span>;
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

const getRoomLabel = (room: Room) => `Room ${room.roomNumber}${room.roomName ? ` · ${room.roomName}` : ''}`;
const getIssueRoom = (issue: MaintenanceIssue) => typeof issue.roomId === 'object' ? getRoomLabel(issue.roomId) : 'Room';
const getAssigneeName = (issue: MaintenanceIssue) => typeof issue.assignedTo === 'object' ? issue.assignedTo.name || issue.assignedTo.email : 'Unassigned';

export default function MaintenancePage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  const listParams = useMemo(() => ({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    issueType: typeFilter || undefined,
    assignedTo: assignedFilter || undefined,
  }), [statusFilter, priorityFilter, typeFilter, assignedFilter]);

  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;
  const fetchIssues = useCallback((params: Parameters<typeof getMaintenanceIssues>[0]) => getMaintenanceIssues({ ...params, ...listParamsRef.current }), []);
  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } = usePaginatedQuery<MaintenanceIssue>({ fetchFn: fetchIssues });

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getMaintenanceStats());
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
      staffService.list({ limit: 100, role: 'maintenance' }).then((result) => setStaff(result.data)).catch(() => setStaff([])),
    ]);
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<MaintenanceIssue | null>(null);
  const [form, setForm] = useState<MaintenanceIssueFormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [detailIssue, setDetailIssue] = useState<MaintenanceIssue | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [roomHistory, setRoomHistory] = useState<MaintenanceIssue[]>([]);
  const [statusIssue, setStatusIssue] = useState<MaintenanceIssue | null>(null);
  const [nextStatus, setNextStatus] = useState('in_progress');
  const [statusNotes, setStatusNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [assignIssue, setAssignIssue] = useState<MaintenanceIssue | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceIssue | null>(null);
  const [roomStatusTarget, setRoomStatusTarget] = useState<Room | null>(null);
  const [roomStatus, setRoomStatus] = useState('none');

  const reload = async () => {
    await Promise.all([refresh(), loadStats(), getRooms({ limit: 100 }).then((result) => setRooms(result.data))]);
  };

  const openCreate = () => {
    setEditingIssue(null);
    setForm({ ...emptyForm, roomId: rooms[0] ? getEntityId(rooms[0]) : '' });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (issue: MaintenanceIssue) => {
    setEditingIssue(issue);
    setForm({
      roomId: typeof issue.roomId === 'object' ? getEntityId(issue.roomId) : issue.roomId,
      assignedTo: typeof issue.assignedTo === 'object' ? issue.assignedTo.id || issue.assignedTo._id : issue.assignedTo || '',
      sourceHousekeepingTaskId: typeof issue.sourceHousekeepingTaskId === 'object' ? getEntityId(issue.sourceHousekeepingTaskId) : issue.sourceHousekeepingTaskId,
      title: issue.title,
      description: issue.description || '',
      issueType: issue.issueType,
      status: issue.status,
      priority: issue.priority,
      scheduledFor: issue.scheduledFor ? issue.scheduledFor.slice(0, 16) : '',
      estimatedCost: issue.estimatedCost,
      actualCost: issue.actualCost,
      vendorName: issue.vendorName || '',
      vendorPhone: issue.vendorPhone || '',
      resolutionNotes: issue.resolutionNotes || '',
      holdReason: issue.holdReason || '',
      images: issue.images ?? [],
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
      if (editingIssue) {
        await updateMaintenanceIssue(getEntityId(editingIssue), form);
        showToast('Maintenance issue updated', 'success');
      } else {
        await createMaintenanceIssue(form);
        showToast('Maintenance issue created', 'success');
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save issue' });
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = async (issue: MaintenanceIssue) => {
    setDetailOpen(true);
    try {
      const detail = await getMaintenanceIssueById(getEntityId(issue));
      setDetailIssue(detail);
      const roomId = typeof detail.roomId === 'object' ? getEntityId(detail.roomId) : detail.roomId;
      setRoomHistory(roomId ? await getRoomMaintenanceHistory(roomId) : []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load issue', 'error');
    }
  };

  const handleAssign = async () => {
    if (!assignIssue || !assignTo) return;
    setIsSaving(true);
    try {
      await assignMaintenanceIssue(getEntityId(assignIssue), assignTo);
      showToast('Issue assigned', 'success');
      setAssignIssue(null);
      setAssignTo('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to assign issue', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusIssue) return;
    setIsSaving(true);
    try {
      await updateMaintenanceIssueStatus(getEntityId(statusIssue), {
        status: nextStatus,
        notes: statusNotes || undefined,
        resolutionNotes: resolutionNotes || undefined,
        actualCost: actualCost ? Number(actualCost) : undefined,
      });
      showToast('Issue status updated', 'success');
      setStatusIssue(null);
      setStatusNotes('');
      setResolutionNotes('');
      setActualCost('');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoomStatus = async () => {
    if (!roomStatusTarget) return;
    setIsSaving(true);
    try {
      await markRoomMaintenance(getEntityId(roomStatusTarget), roomStatus);
      showToast('Room maintenance status updated', 'success');
      setRoomStatusTarget(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update room status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await deleteMaintenanceIssue(getEntityId(deleteTarget));
      showToast('Issue deleted', 'success');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete issue', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    { key: 'issueNumber', header: 'Issue', render: (row: MaintenanceIssue) => <div><p className="font-semibold text-slate-900">{row.issueNumber}</p><p className="text-xs text-slate-500">{row.title}</p></div> },
    { key: 'room', header: 'Room', render: (row: MaintenanceIssue) => getIssueRoom(row) },
    { key: 'type', header: 'Type', render: (row: MaintenanceIssue) => capitalize(row.issueType.replace(/_/g, ' ')) },
    { key: 'priority', header: 'Priority', render: (row: MaintenanceIssue) => <PriorityBadge priority={row.priority} /> },
    { key: 'assignedTo', header: 'Assigned To', render: (row: MaintenanceIssue) => getAssigneeName(row) },
    { key: 'cost', header: 'Cost', render: (row: MaintenanceIssue) => formatCurrency(row.actualCost ?? row.estimatedCost ?? 0) },
    { key: 'status', header: 'Status', render: (row: MaintenanceIssue) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: MaintenanceIssue) => (
        <div className="flex gap-1">
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => void openDetail(row)}><Eye className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => { setAssignIssue(row); setAssignTo(typeof row.assignedTo === 'object' ? row.assignedTo.id || row.assignedTo._id || '' : row.assignedTo || ''); }}><UserPlus className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => { setStatusIssue(row); setNextStatus(row.status === 'in_progress' ? 'resolved' : 'in_progress'); }}><Wrench className="h-4 w-4" /></button>
          <button type="button" className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /></button>
        </div>
      ),
    },
  ];

  const boardStatuses = ['open', 'assigned', 'in_progress', 'on_hold', 'resolved'];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-orange-700 to-amber-600 px-5 py-6 text-white sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-100">Hotel Operations</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Maintenance Management</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-100">Track room issues, technician assignments, costs, repairs, and room availability risk.</p>
            </div>
            <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50" onClick={openCreate}>
              <Plus className="mr-2 inline h-4 w-4" /> Add Issue
            </button>
          </div>
        </div>
      </section>

      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}</div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Open Issues" value={stats.open + stats.assigned + stats.inProgress + stats.onHold + stats.reopened} helper={`${stats.resolved + stats.closed} resolved/closed`} />
          <StatCard title="Urgent / High" value={stats.urgentIssues + stats.highPriorityIssues} helper={`${stats.urgentIssues} urgent`} />
          <StatCard title="Out Of Service Rooms" value={stats.outOfServiceRooms} helper={`${stats.maintenanceRooms} rooms affected`} />
          <StatCard title="Actual Cost" value={formatCurrency(stats.totalActualCost)} helper={`Est. ${formatCurrency(stats.totalEstimatedCost)}`} />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ISSUE_PRIORITIES.map((priority) => (
          <div key={priority.value} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between"><p className="font-semibold text-slate-900">{priority.label} Priority</p><PriorityBadge priority={priority.value} /></div>
            <p className="mt-3 text-2xl font-bold text-slate-950">{data.filter((issue) => issue.priority === priority.value).length}</p>
            <p className="text-xs text-slate-500">Current filtered issues</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <SelectInput label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...ISSUE_STATUSES]} />
          <SelectInput label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} options={[{ value: '', label: 'All priorities' }, ...ISSUE_PRIORITIES]} />
          <SelectInput label="Issue Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={[{ value: '', label: 'All types' }, ...ISSUE_TYPES]} />
          <SelectInput label="Technician" value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} options={[{ value: '', label: 'All staff' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
          <div className="ml-auto flex rounded-lg border border-slate-200 p-0.5">
            <button type="button" className={`rounded-md p-2 ${viewMode === 'board' ? 'bg-slate-100' : ''}`} onClick={() => setViewMode('board')}><Gauge className="h-4 w-4" /></button>
            <button type="button" className={`rounded-md p-2 ${viewMode === 'table' ? 'bg-slate-100' : ''}`} onClick={() => setViewMode('table')}><ListChecks className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="font-semibold text-slate-900">Affected Rooms</h2>
          </div>
          <span className="text-xs text-slate-500">{rooms.filter((room) => ['minor_issue', 'major_issue', 'under_repair'].includes(room.maintenanceStatus || '')).length} active</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rooms.filter((room) => ['minor_issue', 'major_issue', 'under_repair'].includes(room.maintenanceStatus || '')).slice(0, 8).map((room) => (
            <div key={getEntityId(room)} className="rounded-xl border border-orange-100 bg-orange-50/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold text-slate-900">Room {room.roomNumber}</p><p className="text-xs text-slate-500">{room.floor ? `Floor ${room.floor}` : room.roomName || 'Room'}</p></div>
                <span className="rounded-full bg-white px-2 py-1 text-xs capitalize text-orange-700">{String(room.maintenanceStatus || 'none').replace(/_/g, ' ')}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{room.maintenanceNotes || 'No maintenance notes'}</p>
              <button type="button" className="btn-secondary mt-3 w-full text-sm" onClick={() => { setRoomStatusTarget(room); setRoomStatus(room.maintenanceStatus || 'none'); }}>Update Room Status</button>
            </div>
          ))}
          {!rooms.some((room) => ['minor_issue', 'major_issue', 'under_repair'].includes(room.maintenanceStatus || '')) ? <p className="text-sm text-slate-500">No rooms are currently marked under maintenance.</p> : null}
        </div>
      </section>

      {viewMode === 'board' && (
        <div className="grid gap-4 xl:grid-cols-5">
          {boardStatuses.map((status) => (
            <div key={status} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{capitalize(status.replace(/_/g, ' '))}</h3>
                <span className="text-xs text-slate-500">{data.filter((issue) => issue.status === status).length}</span>
              </div>
              <div className="space-y-3">
                {data.filter((issue) => issue.status === status).map((issue) => (
                  <button key={getEntityId(issue)} type="button" onClick={() => void openDetail(issue)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2"><p className="font-semibold text-slate-900">{issue.title}</p><PriorityBadge priority={issue.priority} /></div>
                    <p className="mt-1 text-xs text-slate-500">{getIssueRoom(issue)} · {capitalize(issue.issueType.replace(/_/g, ' '))}</p>
                    <p className="mt-2 text-xs text-slate-500">{getAssigneeName(issue)}</p>
                  </button>
                ))}
              </div>
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
          searchPlaceholder="Search issues, issue number, room..."
          rowKey={(row) => getEntityId(row)}
          emptyTitle="No maintenance issues"
          emptyDescription="Create maintenance issues to track room repair and availability risk."
          pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />
      )}

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={editingIssue ? 'Edit Maintenance Issue' : 'Add Maintenance Issue'} size="xl" footer={
        <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Issue'}</button></div>
      }>
        {formErrors.form ? <div className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formErrors.form}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput label="Room" value={form.roomId} onChange={(e) => setForm((prev) => ({ ...prev, roomId: e.target.value }))} options={[{ value: '', label: 'Select room' }, ...rooms.map((room) => ({ value: getEntityId(room), label: getRoomLabel(room) }))]} error={formErrors.roomId} required />
          <SelectInput label="Technician" value={form.assignedTo || ''} onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))} options={[{ value: '', label: 'Assign later' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
          <SelectInput label="Issue Type" value={form.issueType} onChange={(e) => setForm((prev) => ({ ...prev, issueType: e.target.value }))} options={ISSUE_TYPES} />
          <SelectInput label="Priority" value={form.priority || 'medium'} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} options={ISSUE_PRIORITIES} />
          <SelectInput label="Status" value={form.status || 'open'} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} options={ISSUE_STATUSES} />
          <FormInput label="Scheduled For" type="datetime-local" value={form.scheduledFor || ''} onChange={(e) => setForm((prev) => ({ ...prev, scheduledFor: e.target.value }))} />
          <FormInput label="Estimated Cost" type="number" value={form.estimatedCost ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, estimatedCost: e.target.value ? Number(e.target.value) : undefined }))} />
          <FormInput label="Actual Cost" type="number" value={form.actualCost ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, actualCost: e.target.value ? Number(e.target.value) : undefined }))} />
          <FormInput label="Title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} error={formErrors.title} className="sm:col-span-2" required />
          <TextArea label="Description" value={form.description || ''} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="sm:col-span-2" />
          <FormInput label="Vendor Name" value={form.vendorName || ''} onChange={(e) => setForm((prev) => ({ ...prev, vendorName: e.target.value }))} />
          <FormInput label="Vendor Phone" value={form.vendorPhone || ''} onChange={(e) => setForm((prev) => ({ ...prev, vendorPhone: e.target.value }))} />
          <TextArea label="Resolution Notes" value={form.resolutionNotes || ''} onChange={(e) => setForm((prev) => ({ ...prev, resolutionNotes: e.target.value }))} className="sm:col-span-2" />
        </div>
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => { setDetailOpen(false); setDetailIssue(null); setRoomHistory([]); }} title="Maintenance Issue Details" size="xl">
        {detailIssue ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{detailIssue.issueNumber}</p><h3 className="mt-1 text-xl font-semibold text-slate-900">{detailIssue.title}</h3><p className="text-sm text-slate-500">{getIssueRoom(detailIssue)} · {getAssigneeName(detailIssue)}</p></div>
              <div className="flex flex-col items-end gap-2"><PriorityBadge priority={detailIssue.priority} /><StatusBadge status={detailIssue.status} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <p className="text-sm"><span className="font-semibold">Type:</span> {capitalize(detailIssue.issueType.replace(/_/g, ' '))}</p>
              <p className="text-sm"><span className="font-semibold">Reported:</span> {detailIssue.reportedAt ? formatDateTime(detailIssue.reportedAt) : '—'}</p>
              <p className="text-sm"><span className="font-semibold">Estimated Cost:</span> {formatCurrency(detailIssue.estimatedCost ?? 0)}</p>
              <p className="text-sm"><span className="font-semibold">Actual Cost:</span> {formatCurrency(detailIssue.actualCost ?? 0)}</p>
            </div>
            {detailIssue.description ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{detailIssue.description}</p> : null}
            <div className="rounded-xl border border-slate-100 p-4">
              <h4 className="mb-2 text-sm font-semibold">Cost & Resolution</h4>
              <p className="text-sm text-slate-600">{detailIssue.resolutionNotes || 'No resolution notes yet.'}</p>
              {(detailIssue.vendorName || detailIssue.vendorPhone) ? <p className="mt-2 text-xs text-slate-500">Vendor: {detailIssue.vendorName || '—'} {detailIssue.vendorPhone ? `· ${detailIssue.vendorPhone}` : ''}</p> : null}
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Room Issue History</h4>
              <div className="space-y-2">
                {roomHistory.slice(0, 5).map((issue) => <div key={getEntityId(issue)} className="rounded-lg border border-slate-100 px-3 py-2 text-sm"><p className="font-medium">{issue.issueNumber} · {issue.title}</p><p className="text-xs text-slate-500">{capitalize(issue.status.replace(/_/g, ' '))} · {issue.reportedAt ? formatDateTime(issue.reportedAt) : '—'}</p></div>)}
                {!roomHistory.length ? <p className="text-sm text-slate-500">No room maintenance history found.</p> : null}
              </div>
            </div>
            {detailIssue.timeline?.length ? <div><h4 className="mb-2 text-sm font-semibold">Timeline</h4><div className="space-y-2">{detailIssue.timeline.slice(0, 6).map((item, index) => <div key={`${item.action}-${index}`} className="rounded-lg border border-slate-100 px-3 py-2 text-sm"><p className="font-medium">{item.action.replace(/\./g, ' ')}</p><p className="text-xs text-slate-500">{item.message || ''} {item.createdAt ? `· ${formatDateTime(item.createdAt)}` : ''}</p></div>)}</div></div> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => detailIssue && openEdit(detailIssue)}>Edit</button>
              <button type="button" className="btn-primary" onClick={() => { if (detailIssue) { setStatusIssue(detailIssue); setNextStatus(detailIssue.status === 'in_progress' ? 'resolved' : 'in_progress'); } }}>Update Status</button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={!!assignIssue} onClose={() => setAssignIssue(null)} title="Assign Technician" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setAssignIssue(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleAssign()} disabled={isSaving}>Assign</button></div>}>
        <SelectInput label="Technician" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} options={[{ value: '', label: 'Select staff' }, ...staff.map((member) => ({ value: typeof member.userId === 'string' ? member.userId : member._id, label: member.fullName || member.name || member.email }))]} />
      </Modal>

      <Modal isOpen={!!statusIssue} onClose={() => setStatusIssue(null)} title="Update Issue Status" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setStatusIssue(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleStatusUpdate()} disabled={isSaving}>Update</button></div>}>
        <div className="space-y-4"><SelectInput label="Status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} options={ISSUE_STATUSES} /><FormInput label="Actual Cost" type="number" value={actualCost} onChange={(e) => setActualCost(e.target.value)} /><TextArea label="Resolution Notes" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} /><TextArea label="Notes" value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} /></div>
      </Modal>

      <Modal isOpen={!!roomStatusTarget} onClose={() => setRoomStatusTarget(null)} title="Update Room Maintenance Status" footer={<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setRoomStatusTarget(null)}>Cancel</button><button type="button" className="btn-primary" onClick={() => void handleRoomStatus()} disabled={isSaving}>Update</button></div>}>
        <SelectInput label="Maintenance Status" value={roomStatus} onChange={(e) => setRoomStatus(e.target.value)} options={ROOM_MAINTENANCE_STATUSES} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Maintenance Issue" message={`Delete issue ${deleteTarget?.issueNumber}?`} confirmLabel="Delete" isLoading={isSaving} variant="danger" />
    </div>
  );
}
