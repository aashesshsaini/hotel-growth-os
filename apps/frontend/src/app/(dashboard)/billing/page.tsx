'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, AlertTriangle, CheckCircle2, FileText, IndianRupee, XCircle } from 'lucide-react';
import { LoadingState, ModulePageLayout, StatCard, SummaryCardGrid } from '@/components/layout';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { getPlatformBillingSummary, type PlatformBillingSummary } from '@/services/platform.service';
import { formatCurrency } from '@/utils/format';

export default function BillingPage() {
  const [summary, setSummary] = useState<PlatformBillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlatformBillingSummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load billing summary'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PlatformOnly>
      <ModulePageLayout
        title="Billing"
        subtitle="Platform-wide billing health, invoice collections, payment failures, and future gateway readiness."
        actions={<Link href="/invoices" className="btn-primary">Open Invoices<ArrowRight className="ml-2 h-4 w-4" /></Link>}
      >
        {loading ? (
          <LoadingState variant="cards" count={4} />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : summary ? (
          <div className="space-y-5">
            <SummaryCardGrid columns={4}>
              <StatCard title="Total Billed" value={formatCurrency(summary.totalBilled)} helper={`${summary.totalInvoices} invoices`} icon={<IndianRupee className="h-5 w-5" />} />
              <StatCard title="Paid" value={formatCurrency(summary.paidAmount)} helper="Manual/gateway-ready collections" icon={<CheckCircle2 className="h-5 w-5" />} />
              <StatCard title="Overdue" value={formatCurrency(summary.overdueAmount)} helper="Collection attention required" icon={<AlertTriangle className="h-5 w-5" />} />
              <StatCard title="Failed" value={formatCurrency(summary.failedAmount)} helper="Retry-ready payment failures" icon={<XCircle className="h-5 w-5" />} />
            </SummaryCardGrid>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-950">Invoice Status Overview</h2>
                  <p className="text-sm text-slate-500">Financial reporting-ready status distribution.</p>
                </div>
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {Object.entries(summary.statusCounts).map(([status, count]) => (
                  <div key={status} className="rounded-xl bg-slate-50 p-4">
                    <StatusBadge status={status} />
                    <p className="mt-3 text-2xl font-bold text-slate-950">{count}</p>
                    <p className="text-xs text-slate-500">Invoices</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
              <h2 className="font-semibold text-slate-950">Payment Gateway Readiness</h2>
              <p className="mt-1 text-sm text-slate-500">
                Payment tracking fields are ready for Stripe/Razorpay integration: transaction ID, gateway, failure reason, retry attempts, payment date, and refund records.
              </p>
            </section>
          </div>
        ) : null}
      </ModulePageLayout>
    </PlatformOnly>
  );
}
