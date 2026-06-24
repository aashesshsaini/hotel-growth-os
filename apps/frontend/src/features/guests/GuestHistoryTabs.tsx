'use client';

import { useState } from 'react';
import type { GuestHistory } from '@/types';
import { formatCurrency, formatDate, formatDateTime, capitalize } from '@/utils/format';

interface GuestHistoryTabsProps {
  history: GuestHistory | null;
  isLoading: boolean;
}

type Tab = 'bookings' | 'enquiries' | 'payments' | 'reviews' | 'campaigns' | 'whatsapp' | 'audit';

export const GuestHistoryTabs = ({ history, isLoading }: GuestHistoryTabsProps) => {
  const [tab, setTab] = useState<Tab>('bookings');

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-lg bg-slate-100" />;
  }
  if (!history) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'bookings', label: `Bookings (${history.bookings.length})` },
    { id: 'enquiries', label: `Enquiries (${history.enquiries.length})` },
    { id: 'payments', label: `Payments (${history.payments.length})` },
    { id: 'reviews', label: `Reviews (${history.reviews.length})` },
    { id: 'campaigns', label: `Campaigns (${history.campaigns.length})` },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'audit', label: 'Audit' },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t.id ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bookings' && (
        <div className="space-y-2">
          {history.bookings.length === 0 ? (
            <p className="text-sm text-slate-500">No bookings yet.</p>
          ) : (
            history.bookings.map((b) => (
              <div key={b._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="font-medium">{b.bookingNumber}</div>
                <div className="text-slate-500">{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</div>
                <div className="mt-1 flex gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{capitalize(b.status)}</span>
                  <span className="text-slate-700">{formatCurrency(b.totalAmount ?? 0)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'enquiries' && (
        <div className="space-y-2">
          {history.enquiries.length === 0 ? (
            <p className="text-sm text-slate-500">No enquiries found.</p>
          ) : (
            history.enquiries.map((e) => (
              <div key={e._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="font-medium">{e.guestName}</div>
                <div className="text-slate-500">{formatDate(e.createdAt)} · {capitalize(e.source)}</div>
                <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">{capitalize(e.status)}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-2">
          {history.payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments recorded.</p>
          ) : (
            history.payments.map((p) => (
              <div key={p._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="font-medium">{formatCurrency(p.amount)}</div>
                <div className="text-slate-500">{capitalize(p.method)} · {capitalize(p.status)}</div>
                <div className="text-xs text-slate-400">{formatDateTime(p.createdAt)}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-2">
          {history.reviews.length === 0 ? (
            <p className="text-sm text-slate-500">No reviews yet.</p>
          ) : (
            history.reviews.map((r) => (
              <div key={r._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="font-medium">{r.rating ? `${r.rating}/5` : 'No rating'}</div>
                <p className="text-slate-600">{r.feedback || '—'}</p>
                <div className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-2">
          {history.campaigns.length === 0 ? (
            <p className="text-sm text-slate-500">No campaign history.</p>
          ) : (
            history.campaigns.map((c, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                {JSON.stringify(c)}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'whatsapp' && (
        <div className="space-y-3">
          {history.whatsappSummary && (
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg bg-slate-50 p-3"><div className="font-semibold">{history.whatsappSummary.totalMessages}</div><div className="text-slate-500">Total</div></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="font-semibold">{history.whatsappSummary.incoming}</div><div className="text-slate-500">Incoming</div></div>
              <div className="rounded-lg bg-slate-50 p-3"><div className="font-semibold">{history.whatsappSummary.outgoing}</div><div className="text-slate-500">Outgoing</div></div>
            </div>
          )}
          {(history.whatsappMessages ?? []).slice(0, 20).map((m, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
              {(m as { direction?: string; content?: string; createdAt?: string }).content}
              <div className="text-xs text-slate-400">{formatDateTime((m as { createdAt?: string }).createdAt)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-2">
          {(history.auditLogs ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No audit entries.</p>
          ) : (
            (history.auditLogs ?? []).map((log, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="font-medium">{(log as { action?: string }).action}</div>
                <div className="text-xs text-slate-400">{formatDateTime((log as { createdAt?: string }).createdAt)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
