'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CreditCard, Download, Eye, LogIn, LogOut, Pencil, Plus, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { ActionMenu } from '@/components/ActionMenu';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { BookingDetailDrawer } from '@/features/bookings/BookingDetailDrawer';
import { BookingFilters } from '@/features/bookings/BookingFilters';
import { BookingFormModal } from '@/features/bookings/BookingFormModal';
import { BookingStatsCards } from '@/features/bookings/BookingStatsCards';
import { PAYMENT_METHOD_OPTIONS, bookingToForm, emptyBookingForm, getBookingGuestName } from '@/features/bookings/constants';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  createBookings,
  deleteBookings,
  getBookingStats,
  getBookings,
  getBookingsById,
  recordBookingPayment,
  updateBookings,
} from '@/services/bookings.service';
import { getGuests } from '@/services/guests.service';
import { getRooms } from '@/services/rooms.service';
import { getRoomTypes } from '@/services/roomTypes.service';
import { staffService } from '@/services/staff.service';
import type { Booking, BookingDetails, BookingFormData, BookingStats, Guest, Room, RoomType, Staff } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatCurrency, formatDate } from '@/utils/format';

function StatusPill({ status }: { status: string }) {
  const tone = status === 'cancelled' || status === 'no_show'
    ? 'bg-red-50 text-red-700 ring-red-200'
    : ['confirmed', 'checked_in', 'checked_out', 'completed', 'paid'].includes(status)
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-amber-50 text-amber-700 ring-amber-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(status)}</span>;
}

export default function BookingsPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [bookingTypeFilter, setBookingTypeFilter] = useState('');
  const [checkInFrom, setCheckInFrom] = useState('');
  const [checkInTo, setCheckInTo] = useState('');

  const listParams = useMemo(() => ({
    status: statusFilter || undefined,
    paymentStatus: paymentStatusFilter || undefined,
    bookingType: bookingTypeFilter || undefined,
    checkInFrom: checkInFrom || undefined,
    checkInTo: checkInTo || undefined,
  }), [statusFilter, paymentStatusFilter, bookingTypeFilter, checkInFrom, checkInTo]);

  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;

  const fetchBookings = useCallback(
    (params: Parameters<typeof getBookings>[0]) => getBookings({ ...params, ...listParamsRef.current }),
    []
  );

  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } = usePaginatedQuery<Booking>({
    fetchFn: fetchBookings,
  });

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getBookingStats(listParamsRef.current));
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
      getGuests({ limit: 100 }).then((result) => setGuests(result.data)).catch(() => setGuests([])),
      getRooms({ limit: 100 }).then((result) => setRooms(result.data)).catch(() => setRooms([])),
      getRoomTypes({ limit: 100, status: 'active', isAvailableForBooking: true }).then((result) => setRoomTypes(result.data)).catch(() => setRoomTypes([])),
      staffService.list({ limit: 100, status: 'active' }).then((result) => setStaff(result.data)).catch(() => setStaff([])),
    ]);
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState<BookingFormData>(emptyBookingForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [details, setDetails] = useState<BookingDetails | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const resetFilters = () => {
    setStatusFilter('');
    setPaymentStatusFilter('');
    setBookingTypeFilter('');
    setCheckInFrom('');
    setCheckInTo('');
  };

  const openCreate = () => {
    setEditingBooking(null);
    setForm(emptyBookingForm());
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setForm(bookingToForm(booking));
    setFormErrors({});
    setFormOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.guestId) errors.guestId = 'Guest is required';
    if (!form.checkInDate) errors.checkInDate = 'Check-in is required';
    if (!form.checkOutDate) errors.checkOutDate = 'Check-out is required';
    if (!form.totalAmount || form.totalAmount < 0) errors.totalAmount = 'Total amount is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const reload = () => Promise.all([refresh(), loadStats()]);

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (editingBooking) {
        await updateBookings(getEntityId(editingBooking), form);
        showToast('Booking updated successfully', 'success');
      } else {
        await createBookings(form);
        showToast('Booking created successfully', 'success');
      }
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormErrors({ form: err instanceof Error ? err.message : 'Failed to save booking' });
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = async (booking: Booking) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetails(null);
    try {
      setDetails(await getBookingsById(getEntityId(booking)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load booking', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAction = async (action: () => Promise<unknown>, success: string) => {
    try {
      const updated = await action();
      if (updated && typeof updated === 'object' && 'booking' in updated) setDetails(updated as BookingDetails);
      showToast(success, 'success');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    }
  };

  const exportCsv = () => {
    const rows = data.map((booking) => [
      booking.bookingNumber,
      getBookingGuestName(booking),
      booking.status,
      booking.paymentStatus,
      booking.checkInDate,
      booking.checkOutDate,
      booking.totalAmount,
    ]);
    const csv = [['Booking', 'Guest', 'Status', 'Payment', 'Check-in', 'Check-out', 'Total'], ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bookings.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-slate-950 via-indigo-700 to-purple-700 px-5 py-6 text-white sm:px-6 lg:px-8">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-100">Reservation Management</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Bookings</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Manage reservations, check-ins, check-outs, payment progress, room assignments, guest requests, and booking history.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/booking-calendar" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20">
                <CalendarDays className="mr-2 inline h-4 w-4" />Calendar View
              </Link>
              <button type="button" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20" onClick={() => void reload()}>
                <RefreshCw className="mr-2 inline h-4 w-4" />Refresh
              </button>
              <button type="button" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20" onClick={exportCsv}>
                <Download className="mr-2 inline h-4 w-4" />Export
              </button>
              <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" onClick={openCreate}>
                <Plus className="mr-2 inline h-4 w-4" />New Booking
              </button>
            </div>
          </div>
        </div>
      </section>

      <BookingStatsCards stats={stats} isLoading={statsLoading} />
      <BookingFilters
        status={statusFilter}
        paymentStatus={paymentStatusFilter}
        bookingType={bookingTypeFilter}
        checkInFrom={checkInFrom}
        checkInTo={checkInTo}
        onStatusChange={setStatusFilter}
        onPaymentStatusChange={setPaymentStatusFilter}
        onBookingTypeChange={setBookingTypeFilter}
        onCheckInFromChange={setCheckInFrom}
        onCheckInToChange={setCheckInTo}
        onReset={resetFilters}
      />

      <DataTable
        searchPlaceholder="Search booking number, source, or coupon..."
        emptyTitle="No bookings found"
        emptyDescription="Create a reservation or adjust filters to view bookings."
        columns={[
          {
            key: 'bookingNumber',
            header: 'Booking',
            render: (row) => (
              <div>
                <div className="font-semibold text-slate-950">{row.bookingNumber}</div>
                <div className="text-xs text-slate-500">{capitalize(row.bookingType ?? 'individual')} · {row.source ?? 'direct'}</div>
              </div>
            ),
          },
          { key: 'guest', header: 'Guest', render: (row) => getBookingGuestName(row) },
          { key: 'stay', header: 'Stay', render: (row) => <div>{formatDate(row.checkInDate)}<div className="text-xs text-slate-500">to {formatDate(row.checkOutDate)}</div></div> },
          { key: 'room', header: 'Room', render: (row) => (typeof row.roomId === 'object' ? `Room ${row.roomId.roomNumber}` : 'Unassigned') },
          { key: 'status', header: 'Status', render: (row) => <StatusPill status={row.status} /> },
          { key: 'paymentStatus', header: 'Payment', render: (row) => <StatusPill status={row.paymentStatus} /> },
          { key: 'totalAmount', header: 'Revenue', render: (row) => <div className="font-semibold text-slate-950">{formatCurrency(row.totalAmount)}<div className="text-xs text-slate-500">Paid {formatCurrency(row.paidAmount ?? 0)}</div></div> },
          {
            key: 'actions',
            header: '',
            render: (row) => (
              <ActionMenu
                items={[
                  { label: 'View booking', icon: Eye, onClick: () => void openDetail(row) },
                  { label: 'Edit booking', icon: Pencil, onClick: () => openEdit(row) },
                  { label: 'Record payment', icon: CreditCard, onClick: () => { setDetails({ booking: row, payments: [], reviews: [], timeline: row.timeline ?? [] }); setPaymentAmount(String(Math.max((row.totalAmount ?? 0) - (row.paidAmount ?? 0), 0))); setPaymentOpen(true); } },
                  { label: 'Check-in', icon: LogIn, onClick: () => void handleAction(() => checkInBooking(getEntityId(row)), 'Checked in successfully'), dividerBefore: true },
                  { label: 'Check-out', icon: LogOut, onClick: () => void handleAction(() => checkOutBooking(getEntityId(row)), 'Checked out successfully') },
                  { label: 'Cancel booking', icon: XCircle, onClick: () => { setCancelTarget(row); setCancelReason(''); }, variant: 'danger', dividerBefore: true },
                  { label: 'Delete booking', icon: Trash2, onClick: () => setDeleteTarget(row), variant: 'danger' },
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
        pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
      />

      <BookingFormModal
        isOpen={formOpen}
        title={editingBooking ? 'Edit Booking' : 'Create Booking'}
        form={form}
        errors={formErrors}
        guests={guests}
        rooms={rooms}
        roomTypes={roomTypes}
        staff={staff}
        isSaving={isSaving}
        onClose={() => setFormOpen(false)}
        onChange={setForm}
        onSave={() => void handleSave()}
      />

      <BookingDetailDrawer
        details={details}
        isOpen={detailOpen}
        isLoading={detailLoading}
        onClose={() => setDetailOpen(false)}
        onEdit={() => details?.booking && openEdit(details.booking)}
        onCancel={() => details?.booking && setCancelTarget(details.booking)}
        onCheckIn={() => details?.booking && void handleAction(() => checkInBooking(getEntityId(details.booking)), 'Checked in successfully')}
        onCheckOut={() => details?.booking && void handleAction(() => checkOutBooking(getEntityId(details.booking)), 'Checked out successfully')}
        onPayment={() => {
          if (!details?.booking) return;
          setPaymentAmount(String(Math.max((details.booking.totalAmount ?? 0) - (details.booking.paidAmount ?? 0), 0)));
          setPaymentOpen(true);
        }}
      />

      <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Booking" footer={
        <button type="button" className="btn-danger" disabled={!cancelReason.trim()} onClick={() => void handleAction(async () => {
          if (!cancelTarget) return null;
          const updated = await cancelBooking(getEntityId(cancelTarget), cancelReason);
          setCancelTarget(null);
          return updated;
        }, 'Booking cancelled successfully')}>Cancel Booking</button>
      }>
        <FormInput label="Cancellation Reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} required />
      </Modal>

      <Modal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record Payment" footer={
        <button type="button" className="btn-primary" disabled={!details?.booking || !paymentAmount} onClick={() => void handleAction(async () => {
          if (!details?.booking) return null;
          const updated = await recordBookingPayment(getEntityId(details.booking), { amount: Number(paymentAmount), method: paymentMethod });
          setPaymentOpen(false);
          return updated;
        }, 'Payment recorded successfully')}>Record Payment</button>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Amount" type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required />
          <SelectInput label="Method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} options={PAYMENT_METHOD_OPTIONS} />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleAction(async () => {
          if (!deleteTarget) return null;
          await deleteBookings(getEntityId(deleteTarget));
          setDeleteTarget(null);
          return null;
        }, 'Booking deleted successfully')}
        title="Delete Booking"
        message={`Delete ${deleteTarget?.bookingNumber ?? 'this booking'}? This will archive the reservation.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
