'use client';

import { useState } from 'react';
import type { GuestHistory } from '@/types';
import { formatCurrency, formatDate, formatDateTime, capitalize } from '@/utils/format';

interface GuestHistoryTabsProps {
  history: GuestHistory | null;
  isLoading: boolean;
}

type Tab = 'bookings' | 'enquiries' | 'payments' | 'reviews' | 'campaigns' | 'whatsapp' | 'audit';

function EmptyHistory({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">This section will fill automatically as guest activity is recorded.</p>
    </div>
  );
}

function TimelineItem({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">{children}</div>;
}

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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === t.id ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100' : 'text-slate-600 hover:bg-white'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bookings' && (
        <div className="space-y-2">
          {history.bookings.length === 0 ? (
            <EmptyHistory label="No bookings yet" />
          ) : (
            history.bookings.map((b) => (
              <TimelineItem key={b._id}>
                <div className="font-medium">{b.bookingNumber}</div>
                <div className="text-slate-500">{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</div>
                <div className="text-xs text-slate-500">
                  {typeof b.roomId === 'object' ? `Room ${b.roomId.roomNumber}` : 'Room not assigned'}
                </div>
                <div className="mt-1 flex gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{capitalize(b.status)}</span>
                  <span className="text-slate-700">{formatCurrency(b.totalAmount ?? 0)}</span>
                </div>
              </TimelineItem>
            ))
          )}
        </div>
      )}

      {tab === 'enquiries' && (
        <div className="space-y-2">
          {history.enquiries.length === 0 ? (
            <EmptyHistory label="No enquiries found" />
          ) : (
            history.enquiries.map((e) => (
              <TimelineItem key={e._id}>
                <div className="font-medium">{e.guestName}</div>
                <div className="text-slate-500">{formatDate(e.createdAt)} · {capitalize(e.source)}</div>
                <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">{capitalize(e.status)}</span>
              </TimelineItem>
            ))
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-2">
          {history.payments.length === 0 ? (
            <EmptyHistory label="No payments recorded" />
          ) : (
            history.payments.map((p) => (
              <TimelineItem key={p._id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{formatCurrency(p.amount)}</div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{capitalize(p.status)}</span>
                </div>
                <div className="text-slate-500">{capitalize(p.method)} · {p.paymentNumber || p.invoiceNumber || 'Payment'}</div>
                <div className="text-xs text-slate-400">
                  {formatDateTime(p.paidAt || p.createdAt)}
                  {typeof p.bookingId === 'object' && p.bookingId?.bookingNumber && ` · ${p.bookingId.bookingNumber}`}
                </div>
              </TimelineItem>
            ))
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-2">
          {history.reviews.length === 0 ? (
            <EmptyHistory label="No reviews yet" />
          ) : (
            history.reviews.map((r) => (
              <TimelineItem key={r._id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{r.rating ? `${r.rating}/5` : 'Pending review'}</div>
                  {r.status && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{capitalize(r.status.replace(/_/g, ' '))}</span>}
                </div>
                <p className="text-slate-600">{r.feedback || '—'}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>{formatDateTime(r.submittedAt || r.createdAt)}</span>
                  {r.source && <span>· {capitalize(r.source.replace(/^ota_/, 'OTA '))}</span>}
                  {typeof r.bookingId === 'object' && r.bookingId?.bookingNumber && <span>· {r.bookingId.bookingNumber}</span>}
                </div>
              </TimelineItem>
            ))
          )}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-2">
          {history.campaigns.length === 0 ? (
            <EmptyHistory label="No campaign history" />
          ) : (
            history.campaigns.map((item, i) => {
              const log = item as {
                _id?: string;
                status?: string;
                phone?: string;
                sentAt?: string;
                deliveredAt?: string;
                createdAt?: string;
                campaignId?: { name?: string; type?: string; status?: string; campaignNumber?: string; channel?: string };
              };
              const campaign = log.campaignId;
              return (
                <TimelineItem key={log._id || i}>
                  <div className="font-medium">{campaign?.name || 'Campaign activity'}</div>
                  <div className="text-xs text-slate-500">
                    {campaign?.campaignNumber ? `${campaign.campaignNumber} · ` : ''}
                    {capitalize((campaign?.type || 'campaign').replace(/_/g, ' '))}
                    {campaign?.channel ? ` · ${capitalize(campaign.channel)}` : ''}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-slate-100 px-2 py-0.5">{capitalize(log.status || 'pending')}</span>
                    {log.phone ? <span className="text-slate-500">{log.phone}</span> : null}
                  </div>
                  <div className="text-xs text-slate-400">{formatDateTime(log.sentAt || log.deliveredAt || log.createdAt)}</div>
                </TimelineItem>
              );
            })
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
          {(history.whatsappMessages ?? []).length === 0 ? (
            <EmptyHistory label="No WhatsApp messages yet" />
          ) : (history.whatsappMessages ?? []).slice(0, 20).map((m, i) => {
            const message = m as {
              _id?: string;
              direction?: string;
              content?: string;
              status?: string;
              messageType?: string;
              sentAt?: string;
              deliveredAt?: string;
              readAt?: string;
              createdAt?: string;
              bookingId?: { bookingNumber?: string };
              campaignId?: { name?: string; campaignNumber?: string };
            };
            return (
              <TimelineItem key={message._id || i}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-900">{capitalize(message.direction || 'message')}</div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{capitalize(message.status || 'received')}</span>
                </div>
                <p className="mt-1 text-slate-600">{message.content || '—'}</p>
                <div className="mt-1 text-xs text-slate-500">
                  {message.messageType ? capitalize(message.messageType) : 'Text'}
                  {message.bookingId?.bookingNumber ? ` · Booking ${message.bookingId.bookingNumber}` : ''}
                  {message.campaignId?.name ? ` · Campaign ${message.campaignId.name}` : ''}
                </div>
                <div className="text-xs text-slate-400">{formatDateTime(message.sentAt || message.deliveredAt || message.readAt || message.createdAt)}</div>
              </TimelineItem>
            );
          })}
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-2">
          {(history.auditLogs ?? []).length === 0 ? (
            <EmptyHistory label="No audit entries" />
          ) : (
            (history.auditLogs ?? []).map((log, i) => (
              <TimelineItem key={i}>
                <div className="font-medium">{(log as { action?: string }).action}</div>
                <div className="text-xs text-slate-400">{formatDateTime((log as { createdAt?: string }).createdAt)}</div>
              </TimelineItem>
            ))
          )}
        </div>
      )}
    </div>
  );
};
