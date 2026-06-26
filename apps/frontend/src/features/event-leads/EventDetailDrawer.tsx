'use client';

import { CalendarClock, FileText, IndianRupee, MapPin, PartyPopper } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { EventLeadDetails } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import { getEventTypeLabel } from './constants';
import { StatusBadge } from './PipelineBoard';

export function EventDetailDrawer({
  details,
  isOpen,
  isLoading,
  onClose,
  onEdit,
  onConvert,
}: {
  details: EventLeadDetails | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onConvert: () => void;
}) {
  const event = details?.event;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Event Lead Profile"
      size="xl"
      footer={event ? (
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onEdit}>Edit Event</button>
          {!['converted', 'completed', 'lost'].includes(event.status) && (
            <button type="button" className="btn-primary" onClick={onConvert}>Convert to Booking</button>
          )}
        </div>
      ) : undefined}
    >
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : event && details ? (
        <div className="space-y-6">
          <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-rose-800 to-orange-700 p-5 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-200">Event Sales</p>
                <h3 className="mt-2 text-2xl font-bold">{event.eventName}</h3>
                <p className="mt-1 text-sm text-rose-100">{event.eventNumber} · {getEventTypeLabel(event.eventType)} · {event.contactPerson}</p>
              </div>
              <StatusBadge status={event.status} />
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Event Value" value={formatCurrency(event.totalValue ?? event.estimatedValue ?? 0)} icon={IndianRupee} />
            <InfoCard label="Advance Paid" value={formatCurrency(event.advanceAmount ?? 0)} icon={IndianRupee} />
            <InfoCard label="Outstanding" value={formatCurrency(event.outstandingAmount ?? 0)} icon={IndianRupee} />
            <InfoCard label="Guests" value={event.guestCount} icon={PartyPopper} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Event Details">
              <InfoRow label="Event Date" value={formatDate(event.eventDate)} />
              <InfoRow label="End Date" value={event.eventEndDate ? formatDate(event.eventEndDate) : '—'} />
              <InfoRow label="Time" value={[event.eventStartTime, event.eventEndTime].filter(Boolean).join(' – ') || '—'} />
              <InfoRow label="Phone" value={event.phone} />
              <InfoRow label="Email" value={event.email} />
              <InfoRow label="Source" value={event.source?.replace(/_/g, ' ')} />
              <InfoRow label="Priority" value={event.priority} />
              <InfoRow label="Follow-up" value={event.followUpDate ? formatDate(event.followUpDate) : '—'} />
              <InfoRow label="Budget" value={event.budgetMin || event.budgetMax ? `${formatCurrency(event.budgetMin ?? 0)} – ${formatCurrency(event.budgetMax ?? 0)}` : '—'} />
            </Panel>
            <Panel title="Requirements">
              <InfoRow label="Venue" value={event.requirements?.venue} />
              <InfoRow label="Room Block" value={event.requirements?.roomBlock} />
              <InfoRow label="Catering" value={event.requirements?.catering} />
              <InfoRow label="Decoration" value={event.requirements?.decoration} />
              <InfoRow label="AV Setup" value={event.requirements?.avSetup} />
              <InfoRow label="Special Requests" value={event.requirements?.specialRequests || event.notes} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Proposals" icon={FileText}>
              {(event.proposals ?? []).length === 0 ? <Empty label="No proposals yet" /> : (
                <div className="space-y-2">
                  {event.proposals!.slice(0, 5).map((proposal, index) => (
                    <div key={proposal._id || index} className="rounded-xl border border-slate-200 px-3 py-2">
                      <p className="font-semibold text-slate-900">{proposal.title}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(proposal.amount)} · {proposal.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Site Visits" icon={MapPin}>
              {(event.siteVisits ?? []).length === 0 ? <Empty label="No site visits scheduled" /> : (
                <div className="space-y-2">
                  {event.siteVisits!.slice(0, 5).map((visit, index) => (
                    <div key={visit._id || index} className="rounded-xl border border-slate-200 px-3 py-2">
                      <p className="font-semibold text-slate-900">{visit.title}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(visit.scheduledAt)} · {visit.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Packages">
            {(event.packages ?? []).length === 0 ? <Empty label="No packages added" /> : (
              <div className="grid gap-2 sm:grid-cols-2">
                {event.packages!.map((pkg, index) => (
                  <div key={pkg._id || index} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-900">{pkg.name}</p>
                    <p className="text-sm text-slate-600">{formatCurrency(pkg.price)} · {pkg.status}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Payments">
            {(event.payments ?? []).length === 0 ? <Empty label="No payments recorded" /> : (
              <div className="space-y-2">
                {event.payments!.slice(0, 8).map((payment, index) => (
                  <div key={payment._id || index} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <span className="font-medium capitalize text-slate-900">{payment.paymentType?.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-emerald-700">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Booking History">
            {details.bookings.length === 0 ? <Empty label="No linked bookings yet" /> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="py-2">Booking</th><th>Guest</th><th>Stay</th><th>Amount</th></tr></thead>
                  <tbody>
                    {details.bookings.map((booking) => (
                      <tr key={String(booking._id)} className="border-t border-slate-100">
                        <td className="py-2 font-medium">{booking.bookingNumber as string}</td>
                        <td>{typeof booking.guestId === 'object' ? (booking.guestId as { fullName?: string }).fullName : 'Guest'}</td>
                        <td>{formatDate(String(booking.checkInDate))}</td>
                        <td>{formatCurrency(Number(booking.totalAmount ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Activity Timeline" icon={CalendarClock}>
            {(event.timeline ?? []).length === 0 ? <Empty label="No activity yet" /> : (
              <div className="space-y-2">
                {event.timeline!.slice(0, 8).map((item, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{item.action.replace(/\./g, ' ')}</p>
                    {item.message && <p className="text-sm text-slate-600">{item.message}</p>}
                    <p className="text-xs text-slate-400">{item.createdAt ? formatDateTime(item.createdAt) : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Event lead not found.</p>
      )}
    </Modal>
  );
}

function InfoCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof PartyPopper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-xs font-semibold uppercase">{label}</span></div>
      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Panel({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: typeof PartyPopper }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">{Icon && <Icon className="h-4 w-4 text-rose-600" />}{title}</h4>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-slate-900">{value || '—'}</span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">{label}</p>;
}
