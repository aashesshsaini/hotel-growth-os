'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Clock, FileText, MessageSquare, Paperclip, ShieldAlert, UserCheck } from 'lucide-react';
import { FormInput, TextArea } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { LoadingState, ModulePageLayout, StatCard, SummaryCardGrid } from '@/components/layout';
import { getPlatformTicket, runPlatformTicketAction, type PlatformTicketDetails } from '@/services/platform.service';
import { formatDate } from '@/utils/format';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-semibold text-slate-950">{title}</h2>{children}</section>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-1 text-sm font-semibold text-slate-900">{value || '—'}</div></div>;
}

export default function TicketDetailsPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [ticket, setTicket] = useState<PlatformTicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [message, setMessage] = useState('');

  const loadTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      setTicket(await getPlatformTicket(params.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTicket(); }, [params.id]);

  const submitMessage = async (action: 'add_public_reply' | 'add_internal_note') => {
    if (!ticket) return;
    try {
      await runPlatformTicketAction(ticket.id, { action, message });
      showToast('Ticket updated');
      setReplyOpen(false);
      setNoteOpen(false);
      setMessage('');
      await loadTicket();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update ticket', 'error');
    }
  };

  return (
    <PlatformOnly>
      <ModulePageLayout
        title={ticket?.ticketNumber || 'Ticket Details'}
        subtitle="Conversation, internal notes, SLA readiness, escalation, and activity timeline."
        actions={<Link href="/support" className="btn-secondary"><ArrowLeft className="mr-2 h-4 w-4" />Back to Support</Link>}
      >
        {loading ? (
          <LoadingState variant="page" />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : ticket ? (
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={ticket.status} />
                    <StatusBadge status={ticket.priority} />
                    <StatusBadge status={ticket.category} />
                  </div>
                  <h1 className="mt-3 text-2xl font-bold text-slate-950">{ticket.subject}</h1>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{ticket.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setNoteOpen(true)}>Internal Note</button>
                  <button type="button" className="btn-primary" onClick={() => setReplyOpen(true)}>Public Reply</button>
                </div>
              </div>
            </section>

            <SummaryCardGrid columns={4}>
              <StatCard title="Hotel" value={ticket.hotelName} helper="Tenant context" icon={<Building2 className="h-5 w-5" />} />
              <StatCard title="Assigned" value={ticket.assignedToName || 'Unassigned'} helper="Support agent future-ready" icon={<UserCheck className="h-5 w-5" />} />
              <StatCard title="SLA" value={ticket.sla?.breached ? 'Breached' : 'On Track'} helper="Automation future-ready" icon={<Clock className="h-5 w-5" />} />
              <StatCard title="Escalation" value={ticket.escalation?.isEscalated ? 'Escalated' : 'Normal'} helper={ticket.escalation?.reason || 'No escalation'} icon={<ShieldAlert className="h-5 w-5" />} />
            </SummaryCardGrid>

            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                <Section title="Conversation Thread">
                  <div className="space-y-3">
                    {ticket.thread.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No conversation yet.</p>
                    ) : (
                      ticket.thread.map((item, index) => (
                        <div key={`${item.createdAt}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">{item.authorName || 'System'}</p>
                            <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>
                          </div>
                          <p className="text-sm leading-6 text-slate-700">{item.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Section>

                <Section title="Internal Notes">
                  <div className="space-y-3">
                    {ticket.internalNotes.length === 0 ? (
                      <p className="rounded-xl bg-amber-50 px-4 py-8 text-center text-sm text-amber-700">No internal notes yet. Visible to Super Admin only.</p>
                    ) : (
                      ticket.internalNotes.map((item, index) => (
                        <div key={`${item.createdAt}-${index}`} className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-amber-950">{item.authorName || 'Support'}</p>
                            <span className="text-xs text-amber-700">{formatDate(item.createdAt)}</span>
                          </div>
                          <p className="text-sm leading-6 text-amber-900">{item.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Section>

                <Section title="Activity Timeline">
                  <div className="space-y-3">
                    {ticket.activity.map((item, index) => (
                      <div key={`${item.createdAt}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">{item.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500">{item.actorName || 'System'} · {formatDate(item.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>

              <aside className="space-y-5">
                <Section title="Ticket Details">
                  <div className="grid gap-3">
                    <Info label="Ticket" value={ticket.ticketNumber} />
                    <Info label="Created" value={formatDate(ticket.createdAt)} />
                    <Info label="Updated" value={formatDate(ticket.updatedAt)} />
                    <Info label="Created By" value={ticket.createdByName || ticket.createdByRole} />
                    <Info label="Tags" value={ticket.tags.length ? ticket.tags.join(', ') : '—'} />
                  </div>
                </Section>

                <Section title="Hotel Information">
                  <div className="grid gap-3">
                    <Info label="Hotel" value={ticket.hotelName} />
                    <Info label="Hotel ID" value={ticket.hotelId} />
                    <Info label="Merge Tickets" value={ticket.mergeDesign.note} />
                  </div>
                </Section>

                <Section title="Attachments">
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                    <Paperclip className="mx-auto h-6 w-6 text-slate-400" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">Attachment viewer placeholder</p>
                    <p className="text-xs text-slate-500">Metadata-ready, storage integration future-ready.</p>
                  </div>
                </Section>

                <Section title="Audit History">
                  <div className="space-y-3">
                    {ticket.auditHistory.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">No audit records.</p>
                    ) : (
                      ticket.auditHistory.map((item) => (
                        <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-sm font-semibold text-slate-900">{item.action.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-500">{item.actor} · {formatDate(item.createdAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Section>
              </aside>
            </div>

            <Modal isOpen={replyOpen} onClose={() => setReplyOpen(false)} title="Add Public Reply" size="md" footer={
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setReplyOpen(false)}>Cancel</button>
                <button type="button" className="btn-primary" onClick={() => void submitMessage('add_public_reply')}>Send Reply</button>
              </div>
            }>
              <TextArea label="Reply" value={message} onChange={(e) => setMessage(e.target.value)} />
            </Modal>

            <Modal isOpen={noteOpen} onClose={() => setNoteOpen(false)} title="Add Internal Note" size="md" footer={
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setNoteOpen(false)}>Cancel</button>
                <button type="button" className="btn-primary" onClick={() => void submitMessage('add_internal_note')}>Save Note</button>
              </div>
            }>
              <TextArea label="Internal Note" value={message} onChange={(e) => setMessage(e.target.value)} />
            </Modal>
          </div>
        ) : null}
      </ModulePageLayout>
    </PlatformOnly>
  );
}
