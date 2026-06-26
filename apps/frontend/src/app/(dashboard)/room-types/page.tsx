'use client';

import {
  Eye,
  Globe,
  Grid3X3,
  IndianRupee,
  LayoutList,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionMenu } from '@/components/ActionMenu';
import { ConfirmDialog } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { RoomTypeCard } from '@/features/room-types/RoomTypeCard';
import { RoomTypeDetailDrawer } from '@/features/room-types/RoomTypeDetailDrawer';
import { RoomTypeFilters } from '@/features/room-types/RoomTypeFilters';
import { RoomTypeForm } from '@/features/room-types/RoomTypeForm';
import { RoomTypeStatusBadge } from '@/features/room-types/RoomTypeStatusBadge';
import { RoomTypeStatsCards } from '@/features/room-types/RoomTypeStatsCards';
import { emptyRoomTypeForm, MANAGEMENT_ROLES, ROOM_TYPE_STATUSES } from '@/features/room-types/constants';
import { useAuth } from '@/hooks/useAuth';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  createRoomType,
  deleteRoomType,
  getRoomTypeById,
  getRoomTypeStats,
  getRoomTypes,
  updateRoomType,
  updateRoomTypePricing,
  updateRoomTypeStatus,
  uploadRoomTypeImages,
  removeRoomTypeImage,
} from '@/services/roomTypes.service';
import type { RoomType, RoomTypeFormData, RoomTypeStats } from '@/types';
import { getEntityId } from '@/types';
import { formatCurrency, capitalize } from '@/utils/format';

type ViewMode = 'table' | 'grid';

const RoomTypesPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user ? MANAGEMENT_ROLES.includes(user.role) : false;

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [stats, setStats] = useState<RoomTypeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [bedTypeFilter, setBedTypeFilter] = useState('');
  const [mealPlanFilter, setMealPlanFilter] = useState('');
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minGuests, setMinGuests] = useState('');
  const [maxGuests, setMaxGuests] = useState('');

  const listParams = useMemo(
    () => ({
      status: statusFilter || undefined,
      bedType: bedTypeFilter || undefined,
      mealPlan: mealPlanFilter || undefined,
      inventoryType: inventoryTypeFilter || undefined,
      isVisibleOnWebsite: websiteFilter ? websiteFilter === 'true' : undefined,
      isAvailableForBooking: bookingFilter ? bookingFilter === 'true' : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minGuests: minGuests ? Number(minGuests) : undefined,
      maxGuests: maxGuests ? Number(maxGuests) : undefined,
    }),
    [statusFilter, bedTypeFilter, mealPlanFilter, inventoryTypeFilter, websiteFilter, bookingFilter, minPrice, maxPrice, minGuests, maxGuests]
  );

  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;

  const fetchRoomTypes = useCallback(
    (params: Parameters<typeof getRoomTypes>[0]) =>
      getRoomTypes({ ...params, ...listParamsRef.current }),
    []
  );

  const { data, pagination, isLoading, error, setPage, setSearch, refresh } =
    usePaginatedQuery<RoomType>({ fetchFn: fetchRoomTypes });

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
      setStats(await getRoomTypeStats());
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats, data.length]);

  const resetFilters = () => {
    setStatusFilter('');
    setBedTypeFilter('');
    setMealPlanFilter('');
    setInventoryTypeFilter('');
    setWebsiteFilter('');
    setBookingFilter('');
    setMinPrice('');
    setMaxPrice('');
    setMinGuests('');
    setMaxGuests('');
  };

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<RoomTypeFormData>({ ...emptyRoomTypeForm });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [detailRoomType, setDetailRoomType] = useState<RoomType | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [pricingRoomType, setPricingRoomType] = useState<RoomType | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingForm, setPricingForm] = useState({ basePrice: 0, weekdayPrice: 0, weekendPrice: 0, taxPercentage: 0, discountPercentage: 0 });

  const [statusRoomType, setStatusRoomType] = useState<RoomType | null>(null);
  const [newStatus, setNewStatus] = useState('active');
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RoomType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFormChange = (field: keyof RoomTypeFormData, value: string | number | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreate = () => {
    setForm({ ...emptyRoomTypeForm });
    setFormErrors({});
    setEditingId(null);
    setFormMode('create');
  };

  const openEdit = (roomType: RoomType) => {
    setForm({
      name: roomType.name,
      code: roomType.code,
      shortDescription: roomType.shortDescription,
      description: roomType.description,
      basePrice: roomType.basePrice,
      weekdayPrice: roomType.weekdayPrice,
      weekendPrice: roomType.weekendPrice,
      extraAdultPrice: roomType.extraAdultPrice,
      extraChildPrice: roomType.extraChildPrice,
      taxPercentage: roomType.taxPercentage,
      discountPercentage: roomType.discountPercentage,
      maxGuests: roomType.maxGuests,
      maxAdults: roomType.maxAdults,
      maxChildren: roomType.maxChildren,
      bedType: roomType.bedType,
      roomSize: roomType.roomSize,
      roomSizeUnit: roomType.roomSizeUnit,
      totalRooms: roomType.totalRooms,
      amenities: roomType.amenities ?? [],
      facilities: roomType.facilities ?? [],
      mealPlan: roomType.mealPlan,
      inventoryType: roomType.inventoryType,
      cancellationPolicy: roomType.cancellationPolicy,
      checkInInstructions: roomType.checkInInstructions,
      internalNotes: roomType.internalNotes,
      isVisibleOnWebsite: roomType.isVisibleOnWebsite,
      isAvailableForBooking: roomType.isAvailableForBooking,
      isPopular: roomType.isPopular,
      status: roomType.status || 'active',
      sortOrder: roomType.sortOrder,
      tags: roomType.tags ?? [],
    });
    setFormErrors({});
    setEditingId(getEntityId(roomType));
    setFormMode('edit');
    setShowDetail(false);
  };

  const openView = async (roomType: RoomType) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const full = await getRoomTypeById(getEntityId(roomType));
      setDetailRoomType(full);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load room type', 'error');
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.basePrice || form.basePrice < 0) errors.basePrice = 'Valid base price is required';
    if (!form.maxGuests || form.maxGuests < 1) errors.maxGuests = 'Max guests must be at least 1';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (formMode === 'create') {
        await createRoomType(form);
        showToast('Room type created successfully', 'success');
      } else if (editingId) {
        await updateRoomType(editingId, form);
        showToast('Room type updated successfully', 'success');
      }
      setFormMode(null);
      refresh();
      void loadStats();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save room type' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteRoomType(getEntityId(deleteTarget));
      showToast('Room type archived successfully', 'success');
      setDeleteTarget(null);
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete room type', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusRoomType) return;
    setIsSaving(true);
    try {
      await updateRoomTypeStatus(getEntityId(statusRoomType), newStatus);
      showToast('Status updated successfully', 'success');
      setShowStatusModal(false);
      setStatusRoomType(null);
      refresh();
      void loadStats();
      if (detailRoomType && getEntityId(detailRoomType) === getEntityId(statusRoomType)) {
        const updated = await getRoomTypeById(getEntityId(statusRoomType));
        setDetailRoomType(updated);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePricingUpdate = async () => {
    if (!pricingRoomType) return;
    setIsSaving(true);
    try {
      await updateRoomTypePricing(getEntityId(pricingRoomType), pricingForm);
      showToast('Pricing updated successfully', 'success');
      setShowPricingModal(false);
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update pricing', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleVisibility = async (roomType: RoomType, field: 'isVisibleOnWebsite' | 'isAvailableForBooking') => {
    try {
      await updateRoomType(getEntityId(roomType), { [field]: !roomType[field] });
      showToast('Visibility updated', 'success');
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update visibility', 'error');
    }
  };

  const handleUploadImage = async (url: string, altText: string, setAsCover: boolean) => {
    if (!detailRoomType) return;
    setIsUploading(true);
    try {
      const updated = await uploadRoomTypeImages(
        getEntityId(detailRoomType),
        [{ url, altText }],
        setAsCover ? url : undefined
      );
      setDetailRoomType(updated);
      showToast('Image added successfully', 'success');
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    if (!detailRoomType) return;
    setIsUploading(true);
    try {
      const updated = await removeRoomTypeImage(getEntityId(detailRoomType), imageId);
      setDetailRoomType(updated);
      showToast('Image removed', 'success');
      refresh();
      void loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetCover = async (url: string) => {
    if (!detailRoomType) return;
    try {
      const updated = await updateRoomType(getEntityId(detailRoomType), { coverImage: url } as Partial<RoomTypeFormData>);
      setDetailRoomType(updated);
      showToast('Cover image updated', 'success');
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to set cover image', 'error');
    }
  };

  const columns = [
    {
      key: 'coverImage',
      header: '',
      render: (row: RoomType) => (
        <div className="h-10 w-14 overflow-hidden rounded bg-slate-100">
          {row.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.coverImage} alt={row.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-slate-400">N/A</div>
          )}
        </div>
      ),
    },
    { key: 'name', header: 'Name', render: (row: RoomType) => (
      <div>
        <p className="font-medium text-slate-900">{row.name}</p>
        <p className="text-xs text-slate-500">{row.code}</p>
      </div>
    )},
    { key: 'basePrice', header: 'Base Price', render: (row: RoomType) => formatCurrency(row.basePrice) },
    { key: 'weekendPrice', header: 'Weekend', render: (row: RoomType) => row.weekendPrice ? formatCurrency(row.weekendPrice) : '—' },
    { key: 'maxGuests', header: 'Guests' },
    { key: 'bedType', header: 'Bed', render: (row: RoomType) => row.bedType ? capitalize(row.bedType) : '—' },
    { key: 'totalRooms', header: 'Rooms', render: (row: RoomType) => row.linkedRoomsCount ?? row.totalRooms ?? 0 },
    { key: 'availableRooms', header: 'Available', render: (row: RoomType) => row.availableRoomsCount ?? '—' },
    { key: 'bookings', header: 'Bookings', render: (row: RoomType) => row.bookingCount ?? '—' },
    { key: 'revenue', header: 'Revenue', render: (row: RoomType) => row.revenue !== undefined ? formatCurrency(row.revenue) : '—' },
    { key: 'isVisibleOnWebsite', header: 'Website', render: (row: RoomType) => row.isVisibleOnWebsite ? 'Yes' : 'No' },
    { key: 'isAvailableForBooking', header: 'Booking', render: (row: RoomType) => row.isAvailableForBooking ? 'Yes' : 'No' },
    { key: 'status', header: 'Status', render: (row: RoomType) => <RoomTypeStatusBadge status={row.status || (row.isActive ? 'active' : 'inactive')} /> },
    ...(canManage
      ? [{
          key: 'actions',
          header: 'Actions',
          className: 'sticky right-0 bg-white',
          render: (row: RoomType) => (
            <ActionMenu
              items={[
                { label: 'View', icon: Eye, onClick: () => void openView(row) },
                { label: 'Edit', icon: Pencil, onClick: () => openEdit(row) },
                {
                  label: 'Update Pricing',
                  icon: IndianRupee,
                  onClick: () => {
                    setPricingRoomType(row);
                    setPricingForm({
                      basePrice: row.basePrice,
                      weekdayPrice: row.weekdayPrice ?? row.basePrice,
                      weekendPrice: row.weekendPrice ?? row.basePrice,
                      taxPercentage: row.taxPercentage ?? 0,
                      discountPercentage: row.discountPercentage ?? 0,
                    });
                    setShowPricingModal(true);
                  },
                },
                {
                  label: row.isVisibleOnWebsite ? 'Hide from Website' : 'Show on Website',
                  icon: Globe,
                  onClick: () => void handleToggleVisibility(row, 'isVisibleOnWebsite'),
                },
                {
                  label: row.isAvailableForBooking ? 'Disable Booking' : 'Enable Booking',
                  icon: Settings2,
                  onClick: () => void handleToggleVisibility(row, 'isAvailableForBooking'),
                },
                {
                  label: 'Change Status',
                  icon: Settings2,
                  onClick: () => {
                    setStatusRoomType(row);
                    setNewStatus(row.status || 'active');
                    setShowStatusModal(true);
                  },
                },
                { label: 'Delete', icon: Trash2, variant: 'danger' as const, onClick: () => setDeleteTarget(row) },
              ]}
            />
          ),
        }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-slate-950 via-indigo-700 to-purple-700 px-5 py-6 text-white sm:px-6 lg:px-8">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-100">Inventory & Pricing</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Room Types</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Manage sellable room categories, pricing, capacity, amenities, images, availability, and website visibility.
              </p>
            </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/20 p-0.5">
              <button type="button" className={`rounded-md p-2 text-white ${viewMode === 'table' ? 'bg-white/20' : ''}`} onClick={() => setViewMode('table')} aria-label="Table view">
                <LayoutList className="h-4 w-4" />
              </button>
              <button type="button" className={`rounded-md p-2 text-white ${viewMode === 'grid' ? 'bg-white/20' : ''}`} onClick={() => setViewMode('grid')} aria-label="Grid view">
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
            {canManage && (
              <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" onClick={openCreate}>
                <Plus className="mr-2 inline h-4 w-4" /> Add Room Type
              </button>
            )}
          </div>
          </div>
        </div>
      </section>

      <RoomTypeStatsCards stats={stats} isLoading={statsLoading} />

      <RoomTypeFilters
        statusFilter={statusFilter}
        bedTypeFilter={bedTypeFilter}
        mealPlanFilter={mealPlanFilter}
        inventoryTypeFilter={inventoryTypeFilter}
        websiteFilter={websiteFilter}
        bookingFilter={bookingFilter}
        minPrice={minPrice}
        maxPrice={maxPrice}
        minGuests={minGuests}
        maxGuests={maxGuests}
        onStatusChange={setStatusFilter}
        onBedTypeChange={setBedTypeFilter}
        onMealPlanChange={setMealPlanFilter}
        onInventoryTypeChange={setInventoryTypeFilter}
        onWebsiteChange={setWebsiteFilter}
        onBookingChange={setBookingFilter}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
        onMinGuestsChange={setMinGuests}
        onMaxGuestsChange={setMaxGuests}
        onReset={resetFilters}
      />

      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          error={error}
          onSearch={setSearch}
          rowKey={(row) => getEntityId(row)}
          searchPlaceholder="Search by name, code, description..."
          emptyTitle="No room types found"
          emptyDescription="Create your first room category to get started."
          pagination={{
            page: pagination.page,
            totalPages: pagination.totalPages,
            total: pagination.total,
            onPageChange: setPage,
          }}
        />
      ) : (
        <div>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="card h-64 animate-pulse bg-slate-100" />)}
            </div>
          ) : data.length === 0 ? (
            <div className="card py-12 text-center text-slate-500">No room types found.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((roomType) => (
                <RoomTypeCard
                  key={getEntityId(roomType)}
                  roomType={roomType}
                  onView={() => void openView(roomType)}
                  onEdit={() => openEdit(roomType)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={formMode !== null}
        onClose={() => setFormMode(null)}
        title={formMode === 'create' ? 'Add Room Type' : 'Edit Room Type'}
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setFormMode(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Saving...' : formMode === 'create' ? 'Create' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <RoomTypeForm form={form} errors={formErrors} isEdit={formMode === 'edit'} onChange={handleFormChange} />
      </Modal>

      <RoomTypeDetailDrawer
        roomType={detailRoomType}
        isOpen={showDetail}
        isLoading={detailLoading}
        canManage={canManage}
        isUploading={isUploading}
        onClose={() => { setShowDetail(false); setDetailRoomType(null); }}
        onEdit={() => detailRoomType && openEdit(detailRoomType)}
        onPricing={() => {
          if (!detailRoomType) return;
          setPricingRoomType(detailRoomType);
          setPricingForm({
            basePrice: detailRoomType.basePrice,
            weekdayPrice: detailRoomType.weekdayPrice ?? detailRoomType.basePrice,
            weekendPrice: detailRoomType.weekendPrice ?? detailRoomType.basePrice,
            taxPercentage: detailRoomType.taxPercentage ?? 0,
            discountPercentage: detailRoomType.discountPercentage ?? 0,
          });
          setShowPricingModal(true);
        }}
        onStatusChange={() => {
          if (!detailRoomType) return;
          setStatusRoomType(detailRoomType);
          setNewStatus(detailRoomType.status || 'active');
          setShowStatusModal(true);
        }}
        onUploadImage={handleUploadImage}
        onRemoveImage={handleRemoveImage}
        onSetCover={handleSetCover}
      />

      <Modal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        title="Update Pricing"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowPricingModal(false)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void handlePricingUpdate()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Update Pricing'}
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Base Price (₹)" type="number" value={String(pricingForm.basePrice)} onChange={(e) => setPricingForm({ ...pricingForm, basePrice: Number(e.target.value) })} />
          <FormInput label="Weekday Price (₹)" type="number" value={String(pricingForm.weekdayPrice)} onChange={(e) => setPricingForm({ ...pricingForm, weekdayPrice: Number(e.target.value) })} />
          <FormInput label="Weekend Price (₹)" type="number" value={String(pricingForm.weekendPrice)} onChange={(e) => setPricingForm({ ...pricingForm, weekendPrice: Number(e.target.value) })} />
          <FormInput label="Tax %" type="number" value={String(pricingForm.taxPercentage)} onChange={(e) => setPricingForm({ ...pricingForm, taxPercentage: Number(e.target.value) })} />
          <FormInput label="Discount %" type="number" value={String(pricingForm.discountPercentage)} onChange={(e) => setPricingForm({ ...pricingForm, discountPercentage: Number(e.target.value) })} />
        </div>
      </Modal>

      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Change Status"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void handleStatusUpdate()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Update Status'}
            </button>
          </div>
        }
      >
        <SelectInput label="Status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
          {ROOM_TYPE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </SelectInput>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Archive Room Type"
        message={`Are you sure you want to archive ${deleteTarget?.name}? This will remove it from booking and website listings.`}
        confirmLabel="Archive"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
};

export default RoomTypesPage;
