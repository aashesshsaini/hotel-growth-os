'use client';

import { CalendarClock, FileText, IndianRupee, Users } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { CorporateLeadDetails } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import { StatusBadge } from './PipelineBoard';

export function CompanyDetailDrawer({
  details,
  isOpen,
  isLoading,
  onClose,
  onEdit,
}: {
  details: CorporateLeadDetails | null;
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const company = details?.company;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Company Profile"
      size="xl"
      footer={company ? (
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onEdit}>Edit Company</button>
        </div>
      ) : undefined}
    >
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : company && details ? (
        <div className="space-y-6">
          <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-800 to-violet-700 p-5 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">Corporate Account</p>
                <h3 className="mt-2 text-2xl font-bold">{company.companyName}</h3>
                <p className="mt-1 text-sm text-indigo-100">{company.companyNumber} · {company.contactPerson}</p>
              </div>
              <StatusBadge status={company.status} />
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Pipeline Value" value={formatCurrency(company.totalValue ?? 0)} icon={IndianRupee} />
            <InfoCard label="Paid" value={formatCurrency(company.paidAmount ?? 0)} icon={IndianRupee} />
            <InfoCard label="Outstanding" value={formatCurrency(company.outstandingAmount ?? 0)} icon={IndianRupee} />
            <InfoCard label="Bookings" value={details.revenueSummary.bookingCount} icon={Users} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Company Details">
              <InfoRow label="Type" value={company.companyType?.replace(/_/g, ' ')} />
              <InfoRow label="Industry" value={company.industry} />
              <InfoRow label="Phone" value={company.phone} />
              <InfoRow label="Email" value={company.email} />
              <InfoRow label="GST" value={company.gstNumber} />
              <InfoRow label="PAN" value={company.panNumber} />
              <InfoRow label="Payment Terms" value={company.paymentTerms?.replace(/_/g, ' ')} />
              <InfoRow label="Credit Limit" value={company.creditLimit ? formatCurrency(company.creditLimit) : '-'} />
              <InfoRow label="Follow-up" value={company.followUpDate ? formatDate(company.followUpDate) : '-'} />
            </Panel>
            <Panel title="Contract & Rates">
              <InfoRow label="Corporate Rate" value={company.corporateRate ? formatCurrency(company.corporateRate) : '-'} />
              <InfoRow label="Room Allocation" value={company.roomAllocation ?? '-'} />
              <InfoRow label="Contract Start" value={company.contractStartDate ? formatDate(company.contractStartDate) : '-'} />
              <InfoRow label="Contract End" value={company.contractEndDate ? formatDate(company.contractEndDate) : '-'} />
              <InfoRow label="Special Pricing" value={company.specialPricing || '-'} />
              <InfoRow label="Requirements" value={company.requirements || '-'} />
            </Panel>
          </div>

          {company.contacts && company.contacts.length > 0 && (
            <Panel title="Contact Persons">
              <div className="space-y-2">
                {company.contacts.map((contact, index) => (
                  <div key={contact._id || index} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-900">{contact.name}{contact.isPrimary ? ' · Primary' : ''}</p>
                    <p className="text-sm text-slate-600">{contact.designation || 'Contact'} · {contact.phone || '-'} · {contact.email || '-'}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Meetings" icon={CalendarClock}>
              {(company.meetings ?? []).length === 0 ? <Empty label="No meetings scheduled" /> : (
                <div className="space-y-2">
                  {company.meetings!.slice(0, 5).map((meeting, index) => (
                    <div key={meeting._id || index} className="rounded-xl border border-slate-200 px-3 py-2">
                      <p className="font-semibold text-slate-900">{meeting.title}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(meeting.scheduledAt)} · {meeting.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title="Proposals" icon={FileText}>
              {(company.proposals ?? []).length === 0 ? <Empty label="No proposals yet" /> : (
                <div className="space-y-2">
                  {company.proposals!.slice(0, 5).map((proposal, index) => (
                    <div key={proposal._id || index} className="rounded-xl border border-slate-200 px-3 py-2">
                      <p className="font-semibold text-slate-900">{proposal.title}</p>
                      <p className="text-xs text-slate-500">{formatCurrency(proposal.amount)} · {proposal.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

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

          <Panel title="Activity Timeline">
            {(company.timeline ?? []).length === 0 ? <Empty label="No activity yet" /> : (
              <div className="space-y-2">
                {company.timeline!.slice(0, 8).map((item, index) => (
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
        <p className="text-sm text-slate-500">Company not found.</p>
      )}
    </Modal>
  );
}

function InfoCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Users }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-xs font-semibold uppercase">{label}</span></div>
      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Panel({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: typeof Users }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">{Icon && <Icon className="h-4 w-4 text-indigo-600" />}{title}</h4>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value || '—'}</span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">{label}</p>;
}
