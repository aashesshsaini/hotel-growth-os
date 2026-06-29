'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText, Hotel, Receipt, WalletCards } from 'lucide-react';
import { LoadingState, ModulePageLayout, StatCard, SummaryCardGrid } from '@/components/layout';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { getPlatformInvoice, type PlatformInvoiceDetails } from '@/services/platform.service';
import { formatCurrency, formatDate } from '@/utils/format';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-semibold text-slate-950">{title}</h2>{children}</section>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-1 text-sm font-semibold text-slate-900">{value || '—'}</div></div>;
}

export default function InvoiceDetailsPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<PlatformInvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlatformInvoice(params.id)
      .then(setInvoice)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load invoice'))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <PlatformOnly>
      <ModulePageLayout
        title={invoice?.invoiceNumber || 'Invoice Details'}
        subtitle="Invoice summary, payment tracking, subscription context, line items, and audit history."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary"><Download className="mr-2 h-4 w-4" />PDF Placeholder</button>
            <Link href="/invoices" className="btn-secondary"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
          </div>
        }
      >
        {loading ? (
          <LoadingState variant="page" />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : invoice ? (
          <div className="space-y-5">
            <SummaryCardGrid columns={4}>
              <StatCard title="Invoice Total" value={formatCurrency(invoice.totalAmount)} helper={`${invoice.currency} · ${invoice.billingCycle}`} icon={<Receipt className="h-5 w-5" />} />
              <StatCard title="Status" value={<StatusBadge status={invoice.status} />} helper={invoice.paymentStatus} icon={<FileText className="h-5 w-5" />} />
              <StatCard title="Due Date" value={formatDate(invoice.dueDate)} helper={`Issued ${formatDate(invoice.issuedDate)}`} icon={<WalletCards className="h-5 w-5" />} />
              <StatCard title="Hotel" value={invoice.hotelName} helper={invoice.ownerEmail || 'Owner email unavailable'} icon={<Hotel className="h-5 w-5" />} />
            </SummaryCardGrid>

            <div className="grid gap-5 lg:grid-cols-2">
              <Section title="Hotel Information">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Hotel" value={invoice.hotelName} />
                  <Info label="Owner Email" value={invoice.ownerEmail} />
                  <Info label="Invoice ID" value={invoice.invoiceId} />
                  <Info label="Gateway" value={invoice.gateway || 'none'} />
                </div>
              </Section>

              <Section title="Subscription Details">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Plan" value={<StatusBadge status={invoice.planName} />} />
                  <Info label="Billing Cycle" value={invoice.billingCycle} />
                  <Info label="Payment Method" value={invoice.paymentMethod || 'Future-ready'} />
                  <Info label="Transaction ID" value={invoice.transactionId || 'Pending'} />
                </div>
              </Section>
            </div>

            <Section title="Line Items Breakdown">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr><th className="px-3 py-2">Description</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2">Unit Price</th><th className="px-3 py-2">Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, index) => (
                      <tr key={`${item.description}-${index}`}>
                        <td className="px-3 py-2 font-medium text-slate-900">{item.description}</td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-2 font-semibold">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <div className="grid gap-5 lg:grid-cols-2">
              <Section title="Tax Breakdown">
                <div className="space-y-3">
                  <Info label="Subtotal" value={formatCurrency(invoice.amountSubtotal)} />
                  {invoice.taxBreakdown.map((tax) => <Info key={tax.label} label={tax.label} value={formatCurrency(tax.amount)} />)}
                  <Info label="Total" value={formatCurrency(invoice.totalAmount)} />
                </div>
              </Section>

              <Section title="Payment Status Timeline">
                <div className="space-y-3">
                  {invoice.paymentTimeline.map((item) => (
                    <div key={item.label} className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-xs text-slate-500">{item.date ? formatDate(item.date) : 'Pending'}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <Section title="Billing History Context">
              <div className="space-y-3">
                {invoice.billingHistory.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No billing history yet.</p>
                ) : (
                  invoice.billingHistory.map((item) => (
                    <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{item.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{item.actor} · {formatDate(item.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </Section>
          </div>
        ) : null}
      </ModulePageLayout>
    </PlatformOnly>
  );
}
