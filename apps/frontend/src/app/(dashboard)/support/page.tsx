'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, MessageSquare, Pencil, Plus, RotateCcw, ShieldAlert, UserCheck, XCircle } from 'lucide-react';
import { ActionMenu } from '@/components/ActionMenu';
import { DataTable, type Column } from '@/components/DataTable';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { FilterPanel, ModulePageLayout, ModuleToolbar, StatCard, SummaryCardGrid } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  createPlatformTicket,
  getPlatformHotels,
  getPlatformSupportSummary,
  getPlatformTickets,
  runPlatformTicketAction,
  type PlatformHotel,
  type PlatformSupportSummary,
  type PlatformTicket,
  type PlatformTicketPayload,
} from '@/services/platform.service';
import { formatDate } from '@/utils/format';

const emptyTicket: PlatformTicketPayload = {
  hotelId: '',
  subject: '',
  description: '',
  category: 'technical',
  priority: 'medium',
  tags: [],
};

export default function SupportPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<PlatformSupportSummary | null>(null);
  const [hotels, setHotels] = useState<PlatformHotel[]>([]);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [hotelId, setHotelId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState<PlatformTicketPayload>(emptyTicket);
  const [messageTarget, setMessageTarget] = useState<{ ticket: PlatformTicket; action: 'add_internal_note' | 'add_public_reply' | 'close' | 'escalate' } | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([getPlatformSupportSummary(), getPlatformHotels({ limit: 100 })]).then(([summaryResult, hotelResult]) => {
      setSummary(summaryResult);
      setHotels(hotelResult.data);
    });
  }, []);

  const fetchTickets = useCallback(
    (params: Parameters<typeof getPlatformTickets>[0]) =>
      getPlatformTickets({
        ...params,
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        hotelId: hotelId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    [category, fromDate, hotelId, priority, status, toDate]
  );

  const { data, pagination, isLoading, error, setPage, setSearch, setParams, refresh } =
    usePaginatedQuery<PlatformTicket>({ fetchFn: fetchTickets });

  const activeFilters = [status, priority, category, hotelId, fromDate, toDate].filter(Boolean).length;
  const userId = user?.id ? String(user.id) : undefined;

  const reloadSummary = async () => setSummary(await getPlatformSupportSummary());

  const updateFilter = (key: string, value: string, setter: (value: string) => void) => {
    setter(value);
    setParams((prev) => ({ ...prev, [key]: value || undefined, page: 1 }));
  };

  const resetFilters = () => {
    setStatus('');
    setPriority('');
    setCategory('');
    setHotelId('');
    setFromDate('');
    setToDate('');
    setParams((prev) => ({ ...prev, status: undefined, priority: undefined, category: undefined, hotelId: undefined, fromDate: undefined, toDate: undefined, page: 1 }));
  };

  const createTicket = async () => {
    setSaving(true);
    try {
      await createPlatformTicket(ticketForm);
      showToast('Ticket created');
      setCreateOpen(false);
      setTicketForm(emptyTicket);
      await refresh();
      await reloadSummary();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to create ticket', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (ticket: PlatformTicket, action: Parameters<typeof runPlatformTicketAction>[1]['action'], payload = {}) => {
    try {
      await runPlatformTicketAction(ticket.id, { action, ...payload });
      showToast('Ticket updated');
      await refresh();
      await reloadSummary();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update ticket', 'error');
    }
  };

  const submitMessageAction = async () => {
    if (!messageTarget) return;
    setSaving(true);
    try {
      const payload =
        messageTarget.action === 'close'
          ? { resolutionNotes: message }
          : messageTarget.action === 'escalate'
            ? { reason: message }
            : { message };
      await runAction(messageTarget.ticket, messageTarget.action, payload);
      setMessageTarget(null);
      setMessage('');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<Column<PlatformTicket>[]>(
    () => [
      { key: 'ticketNumber', header: 'Ticket Number', render: (ticket) => <Link href={`/support/${ticket.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">{ticket.ticketNumber}</Link> },
      { key: 'hotelName', header: 'Hotel Name', render: (ticket) => <div>{ticket.hotelName}<div className="text-xs text-slate-500">{ticket.createdByRole}</div></div> },
      { key: 'subject', header: 'Subject', render: (ticket) => <div className="max-w-sm truncate font-medium text-slate-900">{ticket.subject}</div> },
      { key: 'category', header: 'Category', render: (ticket) => <StatusBadge status={ticket.category} /> },
      { key: 'priority', header: 'Priority', render: (ticket) => <StatusBadge status={ticket.priority} /> },
      { key: 'status', header: 'Status', render: (ticket) => <StatusBadge status={ticket.status} /> },
      { key: 'assignedTo', header: 'Assigned To', render: (ticket) => ticket.assignedToName || 'Unassigned' },
      { key: 'createdAt', header: 'Created', render: (ticket) => formatDate(ticket.createdAt) },
      { key: 'updatedAt', header: 'Updated', render: (ticket) => formatDate(ticket.updatedAt) },
      {
        key: 'actions',
        header: '',
        className: 'text-right',
        render: (ticket) => (
          <ActionMenu
            items={[
              { label: 'View', icon: MessageSquare, onClick: () => { window.location.href = `/support/${ticket.id}`; } },
              { label: 'Assign to Me', icon: UserCheck, onClick: () => userId ? void runAction(ticket, 'assign', { assignedTo: userId }) : showToast('User profile not loaded', 'error') },
              { label: 'Mark In Progress', icon: Pencil, onClick: () => void runAction(ticket, 'change_status', { status: 'in_progress', assignedTo: ticket.assignedTo || userId }), dividerBefore: true },
              { label: 'Add Public Reply', icon: MessageSquare, onClick: () => setMessageTarget({ ticket, action: 'add_public_reply' }) },
              { label: 'Add Internal Note', icon: Pencil, onClick: () => setMessageTarget({ ticket, action: 'add_internal_note' }) },
              { label: 'Escalate', icon: ShieldAlert, onClick: () => setMessageTarget({ ticket, action: 'escalate' }), dividerBefore: true },
              { label: 'Resolve', icon: CheckCircle2, onClick: () => void runAction(ticket, 'change_status', { status: 'resolved' }) },
              { label: 'Close', icon: XCircle, onClick: () => setMessageTarget({ ticket, action: 'close' }), variant: 'danger' },
              { label: 'Reopen', icon: RotateCcw, onClick: () => void runAction(ticket, 'reopen'), hidden: !['closed', 'resolved'].includes(ticket.status) },
            ]}
          />
        ),
      },
    ],
    [showToast, userId]
  );

  return (
    <PlatformOnly>
      <ModulePageLayout
        title="Support Center"
        subtitle="Centralized ticketing, escalation, hotel communication, internal notes, SLA readiness, and support analytics."
        actions={<button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Ticket</button>}
        summary={
          <SummaryCardGrid columns={4}>
            <StatCard title="Open" value={summary?.open ?? 0} helper={`${summary?.inProgress ?? 0} in progress`} icon={<MessageSquare className="h-5 w-5" />} />
            <StatCard title="Pending" value={summary?.pending ?? 0} helper="Waiting on customer/platform" />
            <StatCard title="Urgent" value={summary?.urgent ?? 0} helper={`${summary?.escalated ?? 0} escalated`} icon={<AlertTriangle className="h-5 w-5" />} />
            <StatCard title="Resolved / Closed" value={`${summary?.resolved ?? 0}/${summary?.closed ?? 0}`} helper={`${summary?.slaBreached ?? 0} SLA breaches`} />
          </SummaryCardGrid>
        }
        toolbar={
          <ModuleToolbar
            onSearch={setSearch}
            searchPlaceholder="Search ticket number, hotel, subject..."
            filters={
              <FilterPanel title="Ticket Filters" activeCount={activeFilters} onReset={resetFilters} basicFilters={
                <>
                  <div className="filter-field">
                    <SelectInput label="Status" value={status} onChange={(e) => updateFilter('status', e.target.value, setStatus)} options={[{ value: '', label: 'All statuses' }, { value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In Progress' }, { value: 'pending', label: 'Pending' }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' }, { value: 'reopened', label: 'Reopened' }]} />
                  </div>
                  <div className="filter-field">
                    <SelectInput label="Priority" value={priority} onChange={(e) => updateFilter('priority', e.target.value, setPriority)} options={[{ value: '', label: 'All priorities' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
                  </div>
                </>
              }>
                <SelectInput label="Category" value={category} onChange={(e) => updateFilter('category', e.target.value, setCategory)} options={[{ value: '', label: 'All categories' }, { value: 'billing', label: 'Billing' }, { value: 'technical', label: 'Technical' }, { value: 'account', label: 'Account' }, { value: 'subscription', label: 'Subscription' }, { value: 'bug', label: 'Bug' }, { value: 'feature_request', label: 'Feature Request' }, { value: 'other', label: 'Other' }]} />
                <SelectInput label="Hotel" value={hotelId} onChange={(e) => updateFilter('hotelId', e.target.value, setHotelId)} options={[{ value: '', label: 'All hotels' }, ...hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))]} />
                <FormInput label="Created From" type="date" value={fromDate} onChange={(e) => updateFilter('fromDate', e.target.value, setFromDate)} />
                <FormInput label="Created To" type="date" value={toDate} onChange={(e) => updateFilter('toDate', e.target.value, setToDate)} />
              </FilterPanel>
            }
          />
        }
      >
        <DataTable compact hideToolbar columns={columns} data={data} isLoading={isLoading} error={error} rowKey={(ticket) => ticket.id} emptyTitle="No support tickets found" emptyDescription="Create a ticket to start tracking tenant support issues." pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }} />

        <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Support Ticket" size="lg" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void createTicket()}>Create Ticket</button>
          </div>
        }>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput label="Hotel" value={ticketForm.hotelId} onChange={(e) => setTicketForm((prev) => ({ ...prev, hotelId: e.target.value }))} options={[{ value: '', label: 'Select hotel' }, ...hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))]} />
            <SelectInput label="Category" value={ticketForm.category} onChange={(e) => setTicketForm((prev) => ({ ...prev, category: e.target.value as PlatformTicketPayload['category'] }))} options={[{ value: 'billing', label: 'Billing' }, { value: 'technical', label: 'Technical' }, { value: 'account', label: 'Account' }, { value: 'subscription', label: 'Subscription' }, { value: 'bug', label: 'Bug' }, { value: 'feature_request', label: 'Feature Request' }, { value: 'other', label: 'Other' }]} />
            <SelectInput label="Priority" value={ticketForm.priority} onChange={(e) => setTicketForm((prev) => ({ ...prev, priority: e.target.value as PlatformTicketPayload['priority'] }))} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
            <FormInput label="Tags" value={(ticketForm.tags ?? []).join(', ')} onChange={(e) => setTicketForm((prev) => ({ ...prev, tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) }))} placeholder="billing, onboarding" />
            <div className="sm:col-span-2">
              <FormInput label="Subject" value={ticketForm.subject} onChange={(e) => setTicketForm((prev) => ({ ...prev, subject: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <TextArea label="Description" value={ticketForm.description} onChange={(e) => setTicketForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
        </Modal>

        <Modal isOpen={!!messageTarget} onClose={() => setMessageTarget(null)} title={messageTarget?.action.replace(/_/g, ' ') ?? 'Ticket Action'} size="md" footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setMessageTarget(null)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void submitMessageAction()}>Submit</button>
          </div>
        }>
          <TextArea label={messageTarget?.action === 'close' ? 'Resolution Notes' : messageTarget?.action === 'escalate' ? 'Escalation Reason' : 'Message'} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Modal>
      </ModulePageLayout>
    </PlatformOnly>
  );
}
