'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, Download, Eye, Mail, Plus, RefreshCw, XCircle } from 'lucide-react';
import { ActionMenu } from '@/components/ActionMenu';
import { DataTable, type Column } from '@/components/DataTable';
import { FormInput, SelectInput } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { FilterPanel, ModulePageLayout, ModuleToolbar, StatCard, SummaryCardGrid } from '@/components/layout';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  generatePlatformInvoice,
  getPlatformHotels,
  getPlatformInvoices,
  getPlatformPlans,
  getPlatformSubscriptions,
  runPlatformInvoiceAction,
  type PlatformHotel,
  type PlatformInvoice,
  type PlatformPlan,
  type PlatformSubscription,
} from '@/services/platform.service';
import { formatCurrency, formatDate } from '@/utils/format';

export default function InvoicesPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [hotels, setHotels] = useState<PlatformHotel[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>([]);
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [hotelId, setHotelId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generation, setGeneration] = useState({ subscriptionId: '', issuedDate: '', dueDate: '', status: 'issued', taxRate: 18 });
  const [failureTarget, setFailureTarget] = useState<PlatformInvoice | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([getPlatformPlans({ limit: 100 }), getPlatformHotels({ limit: 100 }), getPlatformSubscriptions({ limit: 100 })]).then(
      ([planResult, hotelResult, subscriptionResult]) => {
        setPlans(planResult.data);
        setHotels(hotelResult.data);
        setSubscriptions(subscriptionResult.data);
      }
    );
  }, []);

  const fetchInvoices = useCallback(
    (params: Parameters<typeof getPlatformInvoices>[0]) =>
      getPlatformInvoices({
        ...params,
        status: status || undefined,
        planId: planId || undefined,
        hotelId: hotelId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        minAmount: minAmount || undefined,
        maxAmount: maxAmount || undefined,
      }),
    [fromDate, hotelId, maxAmount, minAmount, planId, status, toDate]
  );

  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } =
    usePaginatedQuery<PlatformInvoice>({ fetchFn: fetchInvoices });

  const paidAmount = data.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const overdueAmount = data.filter((invoice) => invoice.status === 'overdue').reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const failedCount = data.filter((invoice) => invoice.status === 'failed').length;
  const activeFilters = [status, planId, hotelId, fromDate, toDate, minAmount, maxAmount].filter(Boolean).length;

  const updateFilter = (key: string, value: string, setter: (value: string) => void) => {
    setter(value);
    setParams((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const resetFilters = () => {
    setStatus('');
    setPlanId('');
    setHotelId('');
    setFromDate('');
    setToDate('');
    setMinAmount('');
    setMaxAmount('');
    setParams((prev) => ({ ...prev, status: undefined, planId: undefined, hotelId: undefined, fromDate: undefined, toDate: undefined, minAmount: undefined, maxAmount: undefined, page: 1 }));
  };

  const generateInvoice = async () => {
    setSaving(true);
    try {
      await generatePlatformInvoice({
        subscriptionId: generation.subscriptionId,
        issuedDate: generation.issuedDate || undefined,
        dueDate: generation.dueDate || undefined,
        status: generation.status as 'draft' | 'issued',
        taxRate: generation.taxRate,
      });
      showToast('Invoice generated');
      setGenerateOpen(false);
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to generate invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (invoice: PlatformInvoice, action: Parameters<typeof runPlatformInvoiceAction>[1]['action'], payload = {}) => {
    try {
      await runPlatformInvoiceAction(invoice.id, { action, ...payload, reason: 'Invoice action from Super Admin panel' });
      showToast('Invoice updated');
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update invoice', 'error');
    }
  };

  const columns = useMemo<Column<PlatformInvoice>[]>(
    () => [
      { key: 'invoiceNumber', header: 'Invoice Number', render: (invoice) => <Link href={`/invoices/${invoice.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">{invoice.invoiceNumber}</Link> },
      { key: 'hotelName', header: 'Hotel Name', render: (invoice) => <div>{invoice.hotelName}<div className="text-xs text-slate-500">{invoice.ownerEmail || 'Owner email unavailable'}</div></div> },
      { key: 'planName', header: 'Plan', render: (invoice) => <StatusBadge status={invoice.planName} /> },
      { key: 'amount', header: 'Amount', render: (invoice) => <div className="font-semibold">{formatCurrency(invoice.totalAmount)}<div className="text-xs font-normal text-slate-500">{invoice.currency} · {invoice.billingCycle}</div></div> },
      { key: 'status', header: 'Status', render: (invoice) => <StatusBadge status={invoice.status} /> },
      { key: 'issuedDate', header: 'Issued Date', render: (invoice) => formatDate(invoice.issuedDate) },
      { key: 'dueDate', header: 'Due Date', render: (invoice) => formatDate(invoice.dueDate) },
      {
        key: 'actions',
        header: '',
        className: 'text-right',
        render: (invoice) => (
          <ActionMenu
            items={[
              { label: 'View', icon: Eye, onClick: () => { window.location.href = `/invoices/${invoice.id}`; } },
              { label: 'Mark as Paid', icon: CheckCircle2, onClick: () => void runAction(invoice, 'mark_paid', { paymentMethod: 'manual', gateway: 'manual' }) },
              { label: 'Mark as Failed', icon: XCircle, onClick: () => setFailureTarget(invoice) },
              { label: 'Mark as Overdue', icon: AlertTriangle, onClick: () => void runAction(invoice, 'mark_overdue') },
              { label: 'Regenerate Invoice', icon: RefreshCw, onClick: () => void runAction(invoice, 'regenerate'), dividerBefore: true },
              { label: 'Send Invoice Email', icon: Mail, onClick: () => void runAction(invoice, 'send_email') },
              { label: 'Export Invoice', icon: Download, onClick: () => void runAction(invoice, 'export') },
              { label: 'Cancel Invoice', icon: Ban, onClick: () => void runAction(invoice, 'cancel'), variant: 'danger', dividerBefore: true },
            ]}
          />
        ),
      },
    ],
    []
  );

  return (
    <PlatformOnly>
      <ModulePageLayout
        title="Invoices"
        subtitle="Generate, track, and manage SaaS invoices across all hotel subscriptions."
        actions={<button type="button" className="btn-primary" onClick={() => setGenerateOpen(true)}><Plus className="mr-2 h-4 w-4" />Generate Invoice</button>}
        summary={
          <SummaryCardGrid columns={4}>
            <StatCard title="Invoices On Page" value={data.length} helper="Paginated financial records" />
            <StatCard title="Paid Amount" value={formatCurrency(paidAmount)} helper="Collected invoice value" />
            <StatCard title="Overdue Amount" value={formatCurrency(overdueAmount)} helper="Needs collection follow-up" />
            <StatCard title="Failed Payments" value={failedCount} helper="Gateway-ready tracking" />
          </SummaryCardGrid>
        }
        toolbar={
          <ModuleToolbar
            onSearch={setSearch}
            searchPlaceholder="Search invoice number, hotel, owner email..."
            filters={
              <FilterPanel title="Invoice Filters" activeCount={activeFilters} onReset={resetFilters} basicFilters={
                <>
                  <div className="filter-field">
                    <SelectInput label="Status" value={status} onChange={(e) => updateFilter('status', e.target.value, setStatus)} options={[{ value: '', label: 'All statuses' }, { value: 'draft', label: 'Draft' }, { value: 'issued', label: 'Issued' }, { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' }, { value: 'failed', label: 'Failed' }, { value: 'cancelled', label: 'Cancelled' }]} />
                  </div>
                  <div className="filter-field">
                    <SelectInput label="Plan" value={planId} onChange={(e) => updateFilter('planId', e.target.value, setPlanId)} options={[{ value: '', label: 'All plans' }, ...plans.map((plan) => ({ value: plan.id, label: plan.name }))]} />
                  </div>
                </>
              }>
                <SelectInput label="Hotel" value={hotelId} onChange={(e) => updateFilter('hotelId', e.target.value, setHotelId)} options={[{ value: '', label: 'All hotels' }, ...hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))]} />
                <FormInput label="Issued From" type="date" value={fromDate} onChange={(e) => updateFilter('fromDate', e.target.value, setFromDate)} />
                <FormInput label="Issued To" type="date" value={toDate} onChange={(e) => updateFilter('toDate', e.target.value, setToDate)} />
                <FormInput label="Min Amount" type="number" value={minAmount} onChange={(e) => updateFilter('minAmount', e.target.value, setMinAmount)} />
                <FormInput label="Max Amount" type="number" value={maxAmount} onChange={(e) => updateFilter('maxAmount', e.target.value, setMaxAmount)} />
              </FilterPanel>
            }
          />
        }
      >
        <DataTable compact hideToolbar columns={columns} data={data} isLoading={isLoading} error={error} rowKey={(invoice) => invoice.id} emptyTitle="No invoices found" emptyDescription="Generate invoices from active subscriptions to start platform billing." pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }} />

        <Modal isOpen={generateOpen} onClose={() => setGenerateOpen(false)} title="Generate Invoice" size="lg" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setGenerateOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void generateInvoice()}>Generate</button>
          </div>
        }>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput label="Subscription" value={generation.subscriptionId} onChange={(e) => setGeneration((prev) => ({ ...prev, subscriptionId: e.target.value }))} options={[{ value: '', label: 'Select subscription' }, ...subscriptions.map((subscription) => ({ value: subscription.id, label: `${subscription.hotelName} · ${subscription.planName}` }))]} />
            <SelectInput label="Status" value={generation.status} onChange={(e) => setGeneration((prev) => ({ ...prev, status: e.target.value }))} options={[{ value: 'issued', label: 'Issued' }, { value: 'draft', label: 'Draft' }]} />
            <FormInput label="Issued Date" type="date" value={generation.issuedDate} onChange={(e) => setGeneration((prev) => ({ ...prev, issuedDate: e.target.value }))} />
            <FormInput label="Due Date" type="date" value={generation.dueDate} onChange={(e) => setGeneration((prev) => ({ ...prev, dueDate: e.target.value }))} />
            <FormInput label="Tax Rate %" type="number" value={generation.taxRate} onChange={(e) => setGeneration((prev) => ({ ...prev, taxRate: Number(e.target.value) }))} />
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Proration is design-ready and will be added when billing proration rules are finalized.</p>
        </Modal>

        <Modal isOpen={!!failureTarget} onClose={() => setFailureTarget(null)} title="Mark Invoice as Failed" size="sm" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setFailureTarget(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={async () => { if (failureTarget) { await runAction(failureTarget, 'mark_failed', { failureReason }); setFailureTarget(null); setFailureReason(''); } }}>Mark Failed</button>
          </div>
        }>
          <FormInput label="Failure Reason" value={failureReason} onChange={(e) => setFailureReason(e.target.value)} />
        </Modal>
      </ModulePageLayout>
    </PlatformOnly>
  );
}
