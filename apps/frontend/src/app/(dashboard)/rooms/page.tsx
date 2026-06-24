'use client';

import {
  Ban,
  Eye,
  Grid3X3,
  Layers,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionMenu } from '@/components/ActionMenu';
import { ConfirmDialog } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/components/Toast';
import { AvailableRoomsChecker } from '@/features/rooms/AvailableRoomsChecker';
import { BulkRoomCreateForm } from '@/features/rooms/BulkRoomCreateForm';
import { HousekeepingStatusBadge } from '@/features/rooms/HousekeepingStatusBadge';
import { MaintenanceStatusBadge } from '@/features/rooms/MaintenanceStatusBadge';
import { RoomCard } from '@/features/rooms/RoomCard';
import { RoomDetailDrawer } from '@/features/rooms/RoomDetailDrawer';
import { RoomFilters } from '@/features/rooms/RoomFilters';
import { RoomForm } from '@/features/rooms/RoomForm';
import { RoomStatsCards } from '@/features/rooms/RoomStatsCards';
import { RoomStatusBadge } from '@/features/rooms/RoomStatusBadge';
import {
  emptyBulkRoomForm,
  emptyRoomForm,
  HOUSEKEEPING_STATUSES,
  MAINTENANCE_ROLES,
  MAINTENANCE_STATUSES,
  MANAGEMENT_ROLES,
  ROOM_STATUSES,
} from '@/features/rooms/constants';
import { getBookingLabel, getGuestName, getRoomTypeName } from '@/features/rooms/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { getRoomTypes } from '@/services/roomTypes.service';
import {
  blockRoom,
  bulkCreateRooms,
  createRoom,
  deleteRoom,
  getRoomById,
  getRoomStats,
  getRooms,
  markRoomMaintenance,
  unblockRoom,
  updateHousekeepingStatus,
  updateRoom,
  updateRoomStatus,
} from '@/services/rooms.service';
import type { BulkRoomFormData, Room, RoomFormData, RoomStats, RoomType } from '@/types';
import { getEntityId } from '@/types';

type ViewMode = 'table' | 'grid' | 'floor';

const RoomsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user ? MANAGEMENT_ROLES.includes(user.role) : false;
  const canMaintenance = user ? MAINTENANCE_ROLES.includes(user.role) || canManage : false;

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [hkFilter, setHkFilter] = useState('');
  const [maintFilter, setMaintFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [bookableFilter, setBookableFilter] = useState('');
  const [blockedFilter, setBlockedFilter] = useState('');

  const listParams = useMemo(
    () => ({
      status: statusFilter || undefined,
      housekeepingStatus: hkFilter || undefined,
      maintenanceStatus: maintFilter || undefined,
      roomTypeId: roomTypeFilter || undefined,
      floorNumber: floorFilter ? Number(floorFilter) : undefined,
      isBookable: bookableFilter ? bookableFilter === 'true' : undefined,
      isBlocked: blockedFilter ? blockedFilter === 'true' : undefined,
    }),
    [statusFilter, hkFilter, maintFilter, roomTypeFilter, floorFilter, bookableFilter, blockedFilter]
  );

  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;

  const fetchRooms = useCallback(
    (params: Parameters<typeof getRooms>[0]) => getRooms({ ...params, ...listParamsRef.current }),
    []
  );

  const { data, pagination, isLoading, error, setPage, setSearch, refresh } =
    usePaginatedQuery<Room>({ fetchFn: fetchRooms });

  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    setPage(1);
    refresh();
  }, [listParams, setPage, refresh]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getRoomStats());
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    getRoomTypes({ limit: 100 }).then((r) => setRoomTypes(r.data)).catch(() => {});
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadStats();
  }, [data.length, loadStats]);

  const resetFilters = () => {
    setStatusFilter('');
    setHkFilter('');
    setMaintFilter('');
    setRoomTypeFilter('');
    setFloorFilter('');
    setBookableFilter('');
    setBlockedFilter('');
  };

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [form, setForm] = useState<RoomFormData>({ ...emptyRoomForm });
  const [bulkForm, setBulkForm] = useState<BulkRoomFormData>({ ...emptyBulkRoomForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [statusRoom, setStatusRoom] = useState<Room | null>(null);
  const [newStatus, setNewStatus] = useState('available');
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [blockTarget, setBlockTarget] = useState<Room | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);

  const [hkRoom, setHkRoom] = useState<Room | null>(null);
  const [newHkStatus, setNewHkStatus] = useState('clean');
  const [showHkModal, setShowHkModal] = useState(false);

  const [maintRoom, setMaintRoom] = useState<Room | null>(null);
  const [newMaintStatus, setNewMaintStatus] = useState('none');
  const [showMaintModal, setShowMaintModal] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFormChange = (field: keyof RoomFormData, value: string | number | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreate = () => {
    setForm({ ...emptyRoomForm, roomTypeId: roomTypes[0] ? getEntityId(roomTypes[0]) : '' });
    setFormErrors({});
    setEditingId(null);
    setFormMode('create');
  };

  const openEdit = (room: Room) => {
    setForm({
      roomNumber: room.roomNumber,
      roomTypeId: typeof room.roomTypeId === 'object' ? getEntityId(room.roomTypeId) : room.roomTypeId,
      floorNumber: room.floorNumber ?? room.floor,
      buildingName: room.buildingName,
      wing: room.wing,
      roomName: room.roomName,
      description: room.description,
      status: room.status,
      housekeepingStatus: room.housekeepingStatus,
      maintenanceStatus: room.maintenanceStatus,
      maxGuestsOverride: room.maxGuestsOverride,
      priceOverride: room.priceOverride,
      isPriceOverridden: room.isPriceOverridden,
      isBookable: room.isBookable,
      isVisibleToStaff: room.isVisibleToStaff,
      notes: room.notes,
      tags: room.tags,
    });
    setEditingId(getEntityId(room));
    setFormMode('edit');
    setShowDetail(false);
  };

  const openView = async (room: Room) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      setDetailRoom(await getRoomById(getEntityId(room)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load room', 'error');
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.roomNumber.trim()) errors.roomNumber = 'Room number is required';
    if (!form.roomTypeId) errors.roomTypeId = 'Room type is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (formMode === 'create') {
        await createRoom(form);
        showToast('Room created successfully', 'success');
      } else if (editingId) {
        await updateRoom(editingId, form);
        showToast('Room updated successfully', 'success');
      }
      setFormMode(null);
      refresh();
      void loadStats();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save room' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!bulkForm.roomTypeId) {
      setFormErrors({ roomTypeId: 'Room type is required' });
      return;
    }
    setIsSaving(true);
    try {
      const result = await bulkCreateRooms(bulkForm);
      showToast(`${result.created} rooms created (${result.skipped} skipped)`, 'success');
      setBulkMode(false);
      setBulkForm({ ...emptyBulkRoomForm });
      refresh();
      void loadStats();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Bulk create failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteRoom(getEntityId(deleteTarget));
      showToast('Room deleted successfully', 'success');
      setDeleteTarget(null);
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete room', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const floorGroups = useMemo(() => {
    const groups = new Map<string, Room[]>();
    data.forEach((room) => {
      const floor = String(room.floorNumber ?? room.floor ?? 'Unassigned');
      if (!groups.has(floor)) groups.set(floor, []);
      groups.get(floor)!.push(room);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => Number(a) - Number(b));
  }, [data]);

  const columns = [
    { key: 'roomNumber', header: 'Room #', render: (row: Room) => <span className="font-medium">{row.roomNumber}</span> },
    { key: 'roomTypeId', header: 'Type', render: (row: Room) => getRoomTypeName(row) },
    { key: 'floor', header: 'Floor', render: (row: Room) => row.floorNumber ?? row.floor ?? '—' },
    { key: 'buildingName', header: 'Building', render: (row: Room) => row.buildingName || '—' },
    { key: 'status', header: 'Status', render: (row: Room) => <RoomStatusBadge status={row.status} /> },
    { key: 'housekeepingStatus', header: 'HK', render: (row: Room) => <HousekeepingStatusBadge status={row.housekeepingStatus} /> },
    { key: 'maintenanceStatus', header: 'Maint.', render: (row: Room) => <MaintenanceStatusBadge status={row.maintenanceStatus} /> },
    { key: 'currentGuestId', header: 'Guest', render: (row: Room) => getGuestName(row) },
    { key: 'currentBookingId', header: 'Booking', render: (row: Room) => getBookingLabel(row) },
    { key: 'isBookable', header: 'Bookable', render: (row: Room) => (row.isBookable !== false ? 'Yes' : 'No') },
    { key: 'isBlocked', header: 'Blocked', render: (row: Room) => (row.isBlocked ? 'Yes' : 'No') },
    ...(canManage || canMaintenance
      ? [{
          key: 'actions',
          header: 'Actions',
          className: 'sticky right-0 bg-white',
          render: (row: Room) => (
            <ActionMenu
              items={[
                { label: 'View', icon: Eye, onClick: () => void openView(row) },
                ...(canManage ? [
                  { label: 'Edit', icon: Pencil, onClick: () => openEdit(row) },
                  { label: 'Change Status', icon: Sparkles, onClick: () => { setStatusRoom(row); setNewStatus(row.status); setShowStatusModal(true); } },
                  row.isBlocked
                    ? { label: 'Unblock', icon: Ban, onClick: () => void handleUnblock(row) }
                    : { label: 'Block', icon: Ban, onClick: () => { setBlockTarget(row); setShowBlockModal(true); } },
                  { label: 'Housekeeping', icon: Sparkles, onClick: () => { setHkRoom(row); setNewHkStatus(row.housekeepingStatus || 'clean'); setShowHkModal(true); } },
                  { label: 'Maintenance', icon: Wrench, onClick: () => { setMaintRoom(row); setNewMaintStatus(row.maintenanceStatus || 'none'); setShowMaintModal(true); } },
                  { label: 'Delete', icon: Trash2, variant: 'danger' as const, onClick: () => setDeleteTarget(row) },
                ] : []),
              ]}
            />
          ),
        }]
      : []),
  ];

  const handleStatusUpdate = async () => {
    if (!statusRoom) return;
    setIsSaving(true);
    try {
      await updateRoomStatus(getEntityId(statusRoom), newStatus);
      showToast('Status updated', 'success');
      setShowStatusModal(false);
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlock = async () => {
    if (!blockTarget || !blockReason.trim()) return;
    setIsSaving(true);
    try {
      await blockRoom(getEntityId(blockTarget), { blockedReason: blockReason.trim() });
      showToast('Room blocked', 'success');
      setShowBlockModal(false);
      setBlockReason('');
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to block room', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnblock = async (room: Room) => {
    try {
      await unblockRoom(getEntityId(room));
      showToast('Room unblocked', 'success');
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to unblock room', 'error');
    }
  };

  const handleHkUpdate = async () => {
    if (!hkRoom) return;
    setIsSaving(true);
    try {
      await updateHousekeepingStatus(getEntityId(hkRoom), newHkStatus);
      showToast('Housekeeping status updated', 'success');
      setShowHkModal(false);
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update housekeeping', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMaintUpdate = async () => {
    if (!maintRoom) return;
    setIsSaving(true);
    try {
      await markRoomMaintenance(getEntityId(maintRoom), newMaintStatus);
      showToast('Maintenance status updated', 'success');
      setShowMaintModal(false);
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update maintenance', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Rooms"
        subtitle="Manage physical room inventory and availability"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              <button type="button" className={`rounded-md p-2 ${viewMode === 'table' ? 'bg-slate-100' : ''}`} onClick={() => setViewMode('table')} aria-label="Table view"><Grid3X3 className="h-4 w-4 rotate-90" /></button>
              <button type="button" className={`rounded-md p-2 ${viewMode === 'grid' ? 'bg-slate-100' : ''}`} onClick={() => setViewMode('grid')} aria-label="Grid view"><Grid3X3 className="h-4 w-4" /></button>
              <button type="button" className={`rounded-md p-2 ${viewMode === 'floor' ? 'bg-slate-100' : ''}`} onClick={() => setViewMode('floor')} aria-label="Floor view"><Layers className="h-4 w-4" /></button>
            </div>
            {canManage && (
              <>
                <button type="button" className="btn-secondary" onClick={() => setBulkMode(true)}>Bulk Create</button>
                <button type="button" className="btn-primary" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Room</button>
              </>
            )}
          </div>
        }
      />

      <RoomStatsCards stats={stats} isLoading={statsLoading} />
      <AvailableRoomsChecker roomTypes={roomTypes} />
      <RoomFilters
        roomTypes={roomTypes}
        statusFilter={statusFilter}
        hkFilter={hkFilter}
        maintFilter={maintFilter}
        roomTypeFilter={roomTypeFilter}
        floorFilter={floorFilter}
        bookableFilter={bookableFilter}
        blockedFilter={blockedFilter}
        onStatusChange={setStatusFilter}
        onHkChange={setHkFilter}
        onMaintChange={setMaintFilter}
        onRoomTypeChange={setRoomTypeFilter}
        onFloorChange={setFloorFilter}
        onBookableChange={setBookableFilter}
        onBlockedChange={setBlockedFilter}
        onReset={resetFilters}
      />

      {viewMode === 'table' && (
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          error={error}
          onSearch={setSearch}
          rowKey={(row) => getEntityId(row)}
          searchPlaceholder="Search room number, name, building..."
          emptyTitle="No rooms found"
          emptyDescription="Add rooms or bulk create room inventory."
          pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />
      )}

      {viewMode === 'grid' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((room) => (
            <RoomCard key={getEntityId(room)} room={room} onView={() => void openView(room)} onEdit={() => openEdit(room)} />
          ))}
        </div>
      )}

      {viewMode === 'floor' && (
        <div className="space-y-6">
          {floorGroups.map(([floor, rooms]) => (
            <div key={floor}>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Floor {floor}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                {rooms.map((room) => (
                  <button key={getEntityId(room)} type="button" onClick={() => void openView(room)} className="rounded-lg border border-slate-200 p-3 text-left hover:border-primary-300 hover:shadow-sm">
                    <p className="font-semibold text-slate-900">{room.roomNumber}</p>
                    <p className="text-xs text-slate-500">{getRoomTypeName(room)}</p>
                    <div className="mt-2"><RoomStatusBadge status={room.status} /></div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={formMode !== null} onClose={() => setFormMode(null)} title={formMode === 'create' ? 'Add Room' : 'Edit Room'} size="lg" footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => setFormMode(null)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>{isSaving ? 'Saving...' : formMode === 'create' ? 'Create' : 'Save'}</button>
        </div>
      }>
        <RoomForm form={form} roomTypes={roomTypes} errors={formErrors} onChange={handleFormChange} />
      </Modal>

      <Modal isOpen={bulkMode} onClose={() => setBulkMode(false)} title="Bulk Create Rooms" size="lg" footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => setBulkMode(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => void handleBulkCreate()} disabled={isSaving}>{isSaving ? 'Creating...' : 'Create Rooms'}</button>
        </div>
      }>
        <BulkRoomCreateForm form={bulkForm} roomTypes={roomTypes} errors={formErrors} onChange={(f, v) => setBulkForm((p) => ({ ...p, [f]: v }))} />
      </Modal>

      <RoomDetailDrawer
        room={detailRoom}
        isOpen={showDetail}
        isLoading={detailLoading}
        canManage={canManage}
        onClose={() => { setShowDetail(false); setDetailRoom(null); }}
        onEdit={() => detailRoom && openEdit(detailRoom)}
        onStatusChange={() => { if (detailRoom) { setStatusRoom(detailRoom); setNewStatus(detailRoom.status); setShowStatusModal(true); } }}
        onBlock={() => { if (detailRoom) { setBlockTarget(detailRoom); setShowBlockModal(true); } }}
        onUnblock={() => detailRoom && void handleUnblock(detailRoom)}
        onMaintenance={() => { if (detailRoom) { setMaintRoom(detailRoom); setNewMaintStatus(detailRoom.maintenanceStatus || 'none'); setShowMaintModal(true); } }}
        onHousekeeping={() => { if (detailRoom) { setHkRoom(detailRoom); setNewHkStatus(detailRoom.housekeepingStatus || 'clean'); setShowHkModal(true); } }}
      />

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Change Room Status" footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => void handleStatusUpdate()} disabled={isSaving}>Update</button>
        </div>
      }>
        <SelectInput label="Status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} options={ROOM_STATUSES} />
      </Modal>

      <Modal isOpen={showBlockModal} onClose={() => setShowBlockModal(false)} title="Block Room" footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => setShowBlockModal(false)}>Cancel</button>
          <button type="button" className="btn-danger" onClick={() => void handleBlock()} disabled={isSaving}>Block Room</button>
        </div>
      }>
        <FormInput label="Reason" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Why is this room being blocked?" required />
      </Modal>

      <Modal isOpen={showHkModal} onClose={() => setShowHkModal(false)} title="Update Housekeeping" footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => setShowHkModal(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => void handleHkUpdate()} disabled={isSaving}>Update</button>
        </div>
      }>
        <SelectInput label="Housekeeping Status" value={newHkStatus} onChange={(e) => setNewHkStatus(e.target.value)} options={HOUSEKEEPING_STATUSES} />
      </Modal>

      <Modal isOpen={showMaintModal} onClose={() => setShowMaintModal(false)} title="Update Maintenance" footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => setShowMaintModal(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={() => void handleMaintUpdate()} disabled={isSaving}>Update</button>
        </div>
      }>
        <SelectInput label="Maintenance Status" value={newMaintStatus} onChange={(e) => setNewMaintStatus(e.target.value)} options={MAINTENANCE_STATUSES} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Room" message={`Delete room ${deleteTarget?.roomNumber}? This cannot be undone.`} confirmLabel="Delete" isLoading={isDeleting} variant="danger" />
    </div>
  );
};

export default RoomsPage;
