'use client';

import { CalendarCheck, CreditCard, DoorOpen, Edit, LogIn, LogOut, XCircle } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { BookingDetails, Guest, Room, RoomType } from '@/types';
import { capitalize, formatCurrency, formatDate, formatDateTime } from '@/utils/format';

function StatusPill({ status }: { status: string }) {
  const tone = status === 'cancelled' || status === 'no_show'
    ? 'bg-red-50 text-red-700 ring-red-200'
    : status === 'checked_in' || status === 'confirmed' || status === 'paid'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-amber-50 text-amber-700 ring-amber-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(status)}</span>;
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value || '—'}</div>
    </div>
  );
}

const guestName = (details: BookingDetails) => {
  const guest = details.booking.guestId;
  if (typeof guest === 'object') return guest.fullName || guest.name || guest.phone;
  return 'Guest';
};

const roomName = (details: BookingDetails) => {
  const room = details.booking.roomId;
  if (typeof room === 'object') return `Room ${(room as Room).roomNumber}`;
  return 'Unassigned';
};

const roomTypeName = (details: BookingDetails) => {
  const roomType = details.booking.roomTypeId;
  if (typeof roomType === 'object') return (roomType as RoomType).name;
  return '—';
};

export function BookingDetailDrawer({
  details,
  isOpen,
  isLoading,
  onClose,
  onEdit,
  onCancel,
  onCheckIn,
  onCheckOut,
  onPayment,
}: {
  details: BookingDetails | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onPayment: () => void;
}) {
  const booking = details?.booking;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Booking Profile"
      size="xl"
      footer={
        booking ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Edit</button>
            <button type="button" className="btn-secondary" onClick={onPayment}><CreditCard className="mr-2 h-4 w-4" />Payment</button>
            <button type="button" className="btn-secondary" onClick={onCheckIn}><LogIn className="mr-2 h-4 w-4" />Check-in</button>
            <button type="button" className="btn-secondary" onClick={onCheckOut}><LogOut className="mr-2 h-4 w-4" />Check-out</button>
            <button type="button" className="btn-secondary text-red-600" onClick={onCancel}><XCircle className="mr-2 h-4 w-4" />Cancel</button>
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : details && booking ? (
        <div className="space-y-6">
          <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-700 to-purple-700 p-5 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-100">Reservation</p>
                <h3 className="mt-2 text-2xl font-bold">{booking.bookingNumber}</h3>
                <p className="mt-1 text-sm text-indigo-100">{guestName(details)} · {roomName(details)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill status={booking.status} />
                <StatusPill status={booking.paymentStatus} />
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard label="Guest" value={guestName(details)} />
            <InfoCard label="Room" value={`${roomName(details)} · ${roomTypeName(details)}`} />
            <InfoCard label="Stay" value={`${formatDate(booking.checkInDate)} to ${formatDate(booking.checkOutDate)}`} />
            <InfoCard label="Guests" value={`${booking.adults ?? 1} adults, ${booking.children ?? 0} children`} />
            <InfoCard label="Total" value={formatCurrency(booking.totalAmount)} />
            <InfoCard label="Paid" value={formatCurrency(booking.paidAmount ?? 0)} />
            <InfoCard label="Balance" value={formatCurrency(Math.max((booking.totalAmount ?? 0) - (booking.paidAmount ?? 0), 0))} />
            <InfoCard label="Type" value={capitalize(booking.bookingType ?? 'individual')} />
          </section>

          {(booking.specialRequests || booking.guestPreferences || booking.internalNotes || booking.notes) && (
            <section className="grid gap-4 lg:grid-cols-2">
              <InfoCard label="Special Requests" value={booking.specialRequests} />
              <InfoCard label="Guest Preferences" value={booking.guestPreferences} />
              <InfoCard label="Internal Notes" value={booking.internalNotes} />
              <InfoCard label="Notes" value={booking.notes} />
            </section>
          )}

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-3 flex items-center text-sm font-semibold text-slate-950"><CreditCard className="mr-2 h-4 w-4 text-indigo-600" />Payments</h4>
              {details.payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments recorded yet.</p>
              ) : details.payments.map((payment) => (
                <div key={payment._id} className="mb-2 rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="font-semibold text-slate-950">{formatCurrency(payment.amount)}</div>
                  <div className="text-slate-500">{capitalize(payment.method)} · {capitalize(payment.status)}</div>
                  {(payment.paymentNumber || payment.invoiceNumber) && (
                    <div className="text-xs text-slate-400">{payment.paymentNumber || payment.invoiceNumber}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-3 flex items-center text-sm font-semibold text-slate-950"><CalendarCheck className="mr-2 h-4 w-4 text-indigo-600" />Reviews</h4>
              {details.reviews.length === 0 ? (
                <p className="text-sm text-slate-500">No review recorded for this booking yet.</p>
              ) : details.reviews.map((review) => (
                <div key={review._id} className="mb-2 rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="font-semibold text-slate-950">{review.rating ? `${review.rating}/5` : 'Review pending'}</div>
                  <div className="text-slate-600">{review.feedback || 'Awaiting guest feedback'}</div>
                  <div className="text-xs text-slate-400">{review.status ? capitalize(review.status.replace(/_/g, ' ')) : '—'}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-3 flex items-center text-sm font-semibold text-slate-950"><CalendarCheck className="mr-2 h-4 w-4 text-indigo-600" />Timeline</h4>
              {(details.timeline ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No timeline events yet.</p>
              ) : details.timeline.slice().reverse().map((item, index) => (
                <div key={`${item.action}-${index}`} className="mb-2 rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="font-semibold text-slate-950">{capitalize(item.action)}</div>
                  {item.message && <div className="text-slate-600">{item.message}</div>}
                  <div className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-2 flex items-center text-sm font-semibold text-slate-950"><DoorOpen className="mr-2 h-4 w-4 text-indigo-600" />Documents & History</h4>
            <p className="text-sm text-slate-500">Document upload and full audit history hooks are prepared at the data level and can be connected when file storage workflows are finalized.</p>
          </section>
        </div>
      ) : null}
    </Modal>
  );
}

