'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Eye,
  IndianRupee,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TYPE_LABELS,
} from '@/features/payments/constants';
import {
  addPaymentNote,
  createPayment,
  deletePayment,
  getPaymentById,
  getPaymentStats,
  getPayments,
  refundPayment,
} from '@/services/payments.service';
import type { Payment, PaymentStats } from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatCurrency, formatDateTime } from '@/utils/format';

const emptyStats: PaymentStats = {
  totalPayments: 0,
  totalCollected: 0,
  pendingAmount: 0,
  refundedAmount: 0,
  todayRevenue: 0,
  monthlyRevenue: 0,
  collectionRate: 0,
  outstandingBookings: 0,
  outstandingAmount: 0,
  statusBreakdown: {},
  methodBreakdown: {},
  typeBreakdown: {},
  recentTrend: [],
};

function StatusBadge({ status }: { status?: string }) {
  const value = status === 'completed' ? 'paid' : status || 'pending';
  const tone = value === 'paid'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : value === 'refunded'
      ? 'bg-violet-50 text-violet-700 ring-violet-200'
      : value === 'failed' || value === 'cancelled'
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : value === 'partially_paid'
          ? 'bg-amber-50 text-amber-700 ring-amber-200'
          : 'bg-slate-50 text-slate-700 ring-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {PAYMENT_STATUS_LABELS[value] || capitalize(value.replace(/_/g, ' '))}
    </span>
  );
}

function MethodBadge({ method }: { method?: string }) {
  const label = PAYMENT_METHOD_LABELS[method || 'other'] || capitalize(method || 'other');
  return <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{label}</span>;
}

function StatCard({ title, value, helper, icon: Icon, tone = 'slate' }: {
  title: string;
  value: string | number;
  helper?: string;
  icon: typeof Wallet;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'violet';
}) {
  const tones = {
    slate: 'from-slate-900 to-slate-700',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-red-600',
    violet: 'from-violet-500 to-purple-600',
  };
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
          {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
        </div>
        <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-3 text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function guestLabel(payment: Payment) {
  const guest = payment.guestId;
  if (typeof guest === 'object' && guest) return guest.fullName || guest.name || guest.phone || 'Guest';
  return 'Guest';
}

function bookingLabel(payment: Payment) {
  const booking = payment.bookingId;
  if (typeof booking === 'object' && booking) return booking.bookingNumber || 'Booking';
  return typeof booking === 'string' ? booking.slice(-6) : '—';
}

export default function PaymentsPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<PaymentStats>(emptyStats);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [noteText, setNoteText] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [form, setForm] = useState({
    bookingId: '',
    guestId: '',
    amount: '',
    method: 'upi',
    status: 'paid',
    transactionId: '',
    upiReference: '',
    notes: '',
  });

  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } = usePaginatedQuery<Payment>({
    fetchFn: getPayments,
  });

  useEffect(() => {
    setParams((current) => ({
      ...current,
      page: 1,
      status: statusFilter || undefined,
      method: methodFilter || undefined,
    }));
  }, [statusFilter, methodFilter, setParams]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getPaymentStats());
    } catch {
      setStats(emptyStats);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const openDetail = async (payment: Payment) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      setSelected(await getPaymentById(getEntityId(payment)));
    } catch {
      setSelected(payment);
      showToast('Could not load full payment details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.bookingId || !form.amount) {
      showToast('Booking ID and amount are required', 'error');
      return;
    }
    try {
      await createPayment({
        bookingId: form.bookingId,
        guestId: form.guestId || undefined,
        amount: Number(form.amount),
        method: form.method,
        status: form.status,
        transactionId: form.transactionId || undefined,
        upiReference: form.upiReference || undefined,
        notes: form.notes || undefined,
      });
      setCreateOpen(false);
      setForm({ bookingId: '', guestId: '', amount: '', method: 'upi', status: 'paid', transactionId: '', upiReference: '', notes: '' });
      showToast('Payment recorded', 'success');
      refresh();
      loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to record payment', 'error');
    }
  };

  const handleRefund = async () => {
    if (!selected || !refundReason.trim()) return;
    try {
      await refundPayment(getEntityId(selected), {
        refundReason: refundReason.trim(),
        amount: refundAmount ? Number(refundAmount) : undefined,
      });
      setRefundOpen(false);
      setRefundReason('');
      setRefundAmount('');
      showToast('Refund processed', 'success');
      setDrawerOpen(false);
      refresh();
      loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refund failed', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!selected || !noteText.trim()) return;
    try {
      const updated = await addPaymentNote(getEntityId(selected), { text: noteText.trim() });
      setSelected(updated);
      setNoteText('');
      showToast('Note added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add note', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePayment(getEntityId(deleteTarget));
      setDeleteTarget(null);
      if (selected && getEntityId(selected) === getEntityId(deleteTarget)) {
        setDrawerOpen(false);
        setSelected(null);
      }
      showToast('Payment archived', 'success');
      refresh();
      loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete payment', 'error');
    }
  };

  const maxMethod = Math.max(...Object.values(stats.methodBreakdown || {}), 1);

  const columns = [
    {
      key: 'paymentNumber',
      header: 'Payment',
      render: (row: Payment) => (
        <div>
          <div className="font-semibold text-slate-950">{row.paymentNumber || getEntityId(row).slice(-6)}</div>
          <div className="text-xs text-slate-500">{guestLabel(row)} · {bookingLabel(row)}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: Payment) => <span className="font-semibold text-slate-950">{formatCurrency(row.amount)}</span>,
    },
    { key: 'method', header: 'Method', render: (row: Payment) => <MethodBadge method={row.method} /> },
    { key: 'status', header: 'Status', render: (row: Payment) => <StatusBadge status={row.status} /> },
    {
      key: 'paymentType',
      header: 'Type',
      render: (row: Payment) => (
        <span className="text-sm text-slate-600">{PAYMENT_TYPE_LABELS[row.paymentType || 'partial'] || capitalize(row.paymentType || 'partial')}</span>
      ),
    },
    {
      key: 'paidAt',
      header: 'Date',
      render: (row: Payment) => <span className="text-sm text-slate-500">{formatDateTime(row.paidAt || row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row: Payment) => (
        <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => openDetail(row)}>
          <Eye className="mr-1 h-3.5 w-3.5" />View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-800 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">Billing & Collections</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Payments Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-100">
              Track advance, partial, and full payments across cash, UPI, card, and gateway channels. Monitor outstanding dues, refunds, and invoice status.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary !border-white/20 !bg-white/10 !text-white hover:!bg-white/20" onClick={() => { refresh(); loadStats(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />Refresh
            </button>
            <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>Record Payment</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Collected" value={formatCurrency(stats.totalCollected)} helper={`${stats.collectionRate}% collection rate`} icon={IndianRupee} tone="emerald" />
        <StatCard title="Today's Revenue" value={formatCurrency(stats.todayRevenue)} helper={`${formatCurrency(stats.monthlyRevenue)} this month`} icon={TrendingUp} tone="violet" />
        <StatCard title="Outstanding" value={formatCurrency(stats.outstandingAmount)} helper={`${stats.outstandingBookings} bookings pending`} icon={Wallet} tone="amber" />
        <StatCard title="Refunded" value={formatCurrency(stats.refundedAmount)} helper={`${formatCurrency(stats.pendingAmount)} pending payments`} icon={RotateCcw} tone="rose" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-950">Collection Trend</h3>
          <div className="mt-4 space-y-3">
            {(stats.recentTrend ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Trend data will appear as payments are recorded.</p>
            ) : stats.recentTrend.map((item) => {
              const maxCollected = Math.max(...stats.recentTrend.map((t) => t.collected), 1);
              const width = Math.round((item.collected / maxCollected) * 100);
              return (
                <div key={item.month} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-semibold text-slate-700">{item.month}</div>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${width}%` }} />
                  </div>
                  <div className="w-24 text-right text-sm text-slate-500">{formatCurrency(item.collected)}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Method Breakdown</h3>
          <div className="mt-4 space-y-2">
            {PAYMENT_METHODS.map((method) => {
              const count = stats.methodBreakdown?.[method] ?? 0;
              if (!count) return null;
              return (
                <div key={method} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{PAYMENT_METHOD_LABELS[method]}</span>
                    <span className="font-semibold text-slate-950">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.round((count / maxMethod) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <SelectInput
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-w-[160px]"
            options={[{ value: '', label: 'All statuses' }, ...PAYMENT_STATUS_OPTIONS]}
          />
          <SelectInput
            label=""
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="min-w-[160px]"
            options={[{ value: '', label: 'All methods' }, ...PAYMENT_METHOD_OPTIONS]}
          />
        </div>

        <DataTable<Payment>
          columns={columns}
          data={data}
          isLoading={isLoading}
          error={error}
          onSearch={setSearch}
          searchPlaceholder="Search payments, invoices, transaction IDs..."
          rowKey={(row) => getEntityId(row)}
          emptyTitle="No payments found"
          emptyDescription="Record a payment against a booking to start tracking collections."
          pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />
      </section>

      <Modal
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelected(null); }}
        title="Payment Details"
        size="xl"
        footer={selected ? (
          <div className="flex flex-wrap justify-end gap-2">
            {['paid', 'completed', 'partially_paid'].includes(selected.status) && selected.paymentType !== 'refund' && (
              <button type="button" className="btn-secondary" onClick={() => { setRefundAmount(String(selected.amount)); setRefundOpen(true); }}>
                <RotateCcw className="mr-2 h-4 w-4" />Refund
              </button>
            )}
            <button type="button" className="btn-secondary text-red-600" onClick={() => setDeleteTarget(selected)}>Archive</button>
          </div>
        ) : undefined}
      >
        {detailLoading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        ) : selected ? (
          <div className="space-y-6">
            <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-700 to-teal-700 p-5 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-emerald-100">Payment Record</p>
                  <h3 className="mt-2 text-2xl font-bold">{formatCurrency(selected.amount)}</h3>
                  <p className="mt-1 text-sm text-emerald-100">{selected.paymentNumber} · {guestLabel(selected)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selected.status} />
                  <MethodBadge method={selected.method} />
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Booking</p><p className="mt-1 text-sm font-semibold">{bookingLabel(selected)}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Invoice</p><p className="mt-1 text-sm font-semibold">{selected.invoiceNumber || '—'}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Transaction</p><p className="mt-1 text-sm font-semibold">{selected.transactionId || selected.upiReference || '—'}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Paid At</p><p className="mt-1 text-sm font-semibold">{formatDateTime(selected.paidAt || selected.createdAt)}</p></div>
            </section>

            {(selected.notes || selected.internalNotes || selected.refundReason) && (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">Notes</p><p className="mt-2 text-sm">{selected.notes || '—'}</p></div>
                {selected.refundReason && <div className="rounded-2xl border border-slate-200 bg-rose-50 p-4"><p className="text-xs font-semibold uppercase text-rose-700">Refund Reason</p><p className="mt-2 text-sm text-rose-900">{selected.refundReason}</p></div>}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-950">Internal Notes</p>
              <div className="mb-3 space-y-2">
                {(selected.paymentNotes ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No internal notes yet.</p>
                ) : selected.paymentNotes?.map((note, index) => (
                  <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p>{note.text}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(note.createdAt)}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <TextArea label="" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add internal note..." rows={2} />
                <button type="button" className="btn-secondary self-end" onClick={handleAddNote}>Add</button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-950">Timeline</p>
              {(selected.timeline ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No timeline events yet.</p>
              ) : (
                <div className="space-y-2">
                  {selected.timeline?.map((item, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm">
                      <div className="font-semibold text-slate-950">{capitalize(item.action.replace(/\./g, ' '))}</div>
                      {item.message && <p className="text-slate-600">{item.message}</p>}
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Record Payment" footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleCreate}>Save Payment</button>
        </div>
      }>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Booking ID" value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} required />
          <FormInput label="Guest ID (optional)" value={form.guestId} onChange={(e) => setForm({ ...form, guestId: e.target.value })} />
          <FormInput label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <SelectInput label="Method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} options={PAYMENT_METHOD_OPTIONS} />
          <SelectInput label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={PAYMENT_STATUS_OPTIONS} />
          <FormInput label="Transaction ID" value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} />
          <FormInput label="UPI Reference" value={form.upiReference} onChange={(e) => setForm({ ...form, upiReference: e.target.value })} />
          <div className="sm:col-span-2">
            <TextArea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
        </div>
      </Modal>

      <Modal isOpen={refundOpen} onClose={() => setRefundOpen(false)} title="Process Refund" footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setRefundOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleRefund}>Confirm Refund</button>
        </div>
      }>
        <div className="space-y-4">
          <FormInput label="Refund Amount" type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
          <TextArea label="Refund Reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={4} required />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Archive Payment"
        message="This payment will be archived and booking totals will be recalculated."
        confirmLabel="Archive"
        variant="danger"
      />
    </div>
  );
}
