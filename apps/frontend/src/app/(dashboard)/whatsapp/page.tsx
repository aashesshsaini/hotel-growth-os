'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  MessageCircle,
  RefreshCw,
  Send,
  Settings2,
  Sparkles,
  LayoutTemplate,
  BarChart3,
} from 'lucide-react';
import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import {
  WHATSAPP_AUTOMATION_TRIGGERS,
  WHATSAPP_STATUSES,
  WHATSAPP_TEMPLATE_STATUSES,
} from '@/features/whatsapp/constants';
import {
  broadcastWhatsAppMessage,
  createWhatsAppAutomationRule,
  createWhatsAppTemplate,
  getWhatsAppAutomationRules,
  getWhatsAppConversationThread,
  getWhatsAppConversations,
  getWhatsAppIntegrationStatus,
  getWhatsAppStats,
  getWhatsAppTemplates,
  retryWhatsAppMessage,
  sendWhatsAppMessage,
  updateWhatsAppAutomationRule,
  updateWhatsAppTemplate,
} from '@/services/whatsapp.service';
import type {
  WhatsAppAutomationRule,
  WhatsAppConversation,
  WhatsAppIntegrationStatus,
  WhatsAppMessage,
  WhatsAppStats,
  WhatsAppTemplate,
} from '@/types';
import { getEntityId } from '@/types';
import { capitalize, formatDateTime } from '@/utils/format';

type Tab = 'inbox' | 'templates' | 'automation' | 'analytics';

function StatCard({ title, value, helper }: { title: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'read' || status === 'delivered'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : status === 'failed'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : status === 'scheduled' || status === 'queued'
        ? 'bg-violet-50 text-violet-700 ring-violet-200'
        : status === 'sent'
          ? 'bg-blue-50 text-blue-700 ring-blue-200'
          : 'bg-slate-50 text-slate-700 ring-slate-200';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>{capitalize(status)}</span>;
}

function MessageBubble({ message }: { message: WhatsAppMessage }) {
  const outgoing = message.direction === 'outgoing';
  return (
    <div className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${outgoing ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        <div className={`mt-2 flex items-center gap-2 text-[11px] ${outgoing ? 'text-emerald-100' : 'text-slate-400'}`}>
          <span>{formatDateTime(message.sentAt || message.createdAt)}</span>
          {outgoing ? <StatusBadge status={message.status} /> : null}
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppAutomationPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('inbox');
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [integration, setIntegration] = useState<WhatsAppIntegrationStatus | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [thread, setThread] = useState<WhatsAppMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [rules, setRules] = useState<WhatsAppAutomationRule[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({ phone: '', content: '', templateName: '' });
  const [broadcastForm, setBroadcastForm] = useState({ phones: '', content: '' });
  const [templateForm, setTemplateForm] = useState({ name: '', body: '', category: 'UTILITY', status: 'approved' });
  const [ruleForm, setRuleForm] = useState({ name: '', trigger: 'welcome_message', messageContent: '', isActive: true });
  const [isSaving, setIsSaving] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [statsData, integrationData] = await Promise.all([
        getWhatsAppStats(),
        getWhatsAppIntegrationStatus(),
      ]);
      setStats(statsData);
      setIntegration(integrationData);
    } catch {
      setStats(null);
      setIntegration(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const result = await getWhatsAppConversations({
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      setConversations(result.data);
    } catch {
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  }, [search, statusFilter]);

  const loadThread = useCallback(async (phone: string) => {
    setThreadLoading(true);
    try {
      setThread(await getWhatsAppConversationThread(phone));
    } catch {
      setThread([]);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const result = await getWhatsAppTemplates({ limit: 50 });
      setTemplates(result.data);
    } catch {
      setTemplates([]);
    }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const result = await getWhatsAppAutomationRules({ limit: 50 });
      setRules(result.data);
    } catch {
      setRules([]);
    }
  }, []);

  const reload = async () => {
    await Promise.all([loadStats(), loadConversations(), loadTemplates(), loadRules()]);
    if (selectedPhone) await loadThread(selectedPhone);
  };

  useEffect(() => {
    void loadStats();
    void loadTemplates();
    void loadRules();
  }, [loadStats, loadTemplates, loadRules]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedPhone) void loadThread(selectedPhone);
  }, [selectedPhone, loadThread]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.phone === selectedPhone) ?? null,
    [conversations, selectedPhone]
  );

  const handleSend = async () => {
    if (!composeForm.phone.trim() || !composeForm.content.trim()) return;
    setIsSaving(true);
    try {
      await sendWhatsAppMessage({
        phone: composeForm.phone.trim(),
        content: composeForm.content.trim(),
        templateName: composeForm.templateName || undefined,
      });
      showToast('Message sent', 'success');
      setComposeOpen(false);
      setComposeForm({ phone: selectedPhone || '', content: '', templateName: '' });
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send message', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBroadcast = async () => {
    const phones = broadcastForm.phones.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
    if (phones.length === 0 || !broadcastForm.content.trim()) return;
    setIsSaving(true);
    try {
      const result = await broadcastWhatsAppMessage({ phones, content: broadcastForm.content.trim() });
      showToast(`Broadcast sent to ${result.sent} recipients`, 'success');
      setBroadcastOpen(false);
      setBroadcastForm({ phones: '', content: '' });
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Broadcast failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.body.trim()) return;
    setIsSaving(true);
    try {
      await createWhatsAppTemplate(templateForm);
      showToast('Template created', 'success');
      setTemplateOpen(false);
      setTemplateForm({ name: '', body: '', category: 'UTILITY', status: 'approved' });
      await loadTemplates();
      await loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create template', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRule = async () => {
    if (!ruleForm.name.trim()) return;
    setIsSaving(true);
    try {
      await createWhatsAppAutomationRule({
        ...ruleForm,
        messageType: 'text',
      });
      showToast('Automation rule created', 'success');
      setRuleOpen(false);
      setRuleForm({ name: '', trigger: 'welcome_message', messageContent: '', isActive: true });
      await loadRules();
      await loadStats();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create rule', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'inbox', label: 'Inbox', icon: <MessageCircle className="h-4 w-4" /> },
    { id: 'templates', label: 'Templates', icon: <LayoutTemplate className="h-4 w-4" /> },
    { id: 'automation', label: 'Automation', icon: <Bot className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <MessageCircle className="h-3.5 w-3.5" /> Customer Communication
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">WhatsApp Automation</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage conversations, templates, automation rules, and delivery analytics in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void reload()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button type="button" onClick={() => { setComposeForm({ phone: selectedPhone || '', content: '', templateName: '' }); setComposeOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <Send className="h-4 w-4" /> Send Message
          </button>
          <button type="button" onClick={() => setBroadcastOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
            <Sparkles className="h-4 w-4" /> Broadcast
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />) : (
          <>
            <StatCard title="Messages Sent" value={stats?.sentMessages ?? 0} helper={`${stats?.deliveryRate ?? 0}% delivery rate`} />
            <StatCard title="Read Rate" value={`${stats?.readRate ?? 0}%`} helper={`${stats?.readMessages ?? 0} read messages`} />
            <StatCard title="Reply Rate" value={`${stats?.replyRate ?? 0}%`} helper={`${stats?.incomingMessages ?? 0} incoming`} />
            <StatCard title="Automation Success" value={`${stats?.automationSuccessRate ?? 0}%`} helper={`${stats?.failedMessages ?? 0} failed · ${stats?.scheduledMessages ?? 0} scheduled`} />
          </>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${tab === item.id ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {item.icon}{item.label}
              </button>
            ))}
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${integration?.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            <Settings2 className="h-3.5 w-3.5" />
            {integration?.configured ? 'Meta WhatsApp API Connected' : 'Simulation Mode (API not configured)'}
          </div>
        </div>
      </div>

      {tab === 'inbox' && (
        <div className="grid min-h-[620px] gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
          <div className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
            <div className="space-y-3">
              <FormInput placeholder="Search conversations..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: '', label: 'All statuses' }, ...WHATSAPP_STATUSES]} />
            </div>
            <div className="mt-4 space-y-2 overflow-y-auto">
              {conversationsLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />) : conversations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No conversations yet. Send a message to start.</div>
              ) : conversations.map((conversation) => (
                <button
                  key={conversation.phone}
                  type="button"
                  onClick={() => setSelectedPhone(conversation.phone)}
                  className={`w-full rounded-xl border p-3 text-left transition ${selectedPhone === conversation.phone ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{conversation.guestName || conversation.phone}</p>
                      <p className="text-xs text-slate-500">{conversation.phone}</p>
                    </div>
                    {conversation.unreadCount > 0 ? <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">{conversation.unreadCount}</span> : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{conversation.lastMessage}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{formatDateTime(conversation.lastMessageAt)}</span>
                    {conversation.lastStatus ? <StatusBadge status={conversation.lastStatus} /> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-[620px] flex-col">
            {selectedPhone ? (
              <>
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-lg font-bold text-slate-950">{selectedConversation?.guestName || selectedPhone}</h2>
                  <p className="text-sm text-slate-500">{selectedPhone} · {selectedConversation?.messageCount ?? 0} messages</p>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto bg-[#ece5dd] p-4">
                  {threadLoading ? <div className="h-40 animate-pulse rounded-xl bg-white/70" /> : thread.length === 0 ? (
                    <div className="rounded-xl bg-white/80 p-6 text-center text-sm text-slate-500">No messages in this conversation yet.</div>
                  ) : thread.map((message) => <MessageBubble key={getEntityId(message)} message={message} />)}
                </div>
                <div className="border-t border-slate-200 p-4">
                  <div className="flex gap-2">
                    <TextArea rows={2} value={composeForm.content} onChange={(e) => setComposeForm({ ...composeForm, phone: selectedPhone, content: e.target.value })} placeholder="Type a WhatsApp message..." />
                    <button type="button" onClick={() => void handleSend()} disabled={isSaving || !composeForm.content.trim()} className="self-end rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <MessageCircle className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-3 text-lg font-semibold text-slate-900">Select a conversation</p>
                  <p className="mt-1 text-sm text-slate-500">Choose a guest thread to view message history and reply.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setTemplateOpen(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Add Template</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                Default templates are seeded automatically when you open this page.
              </div>
            ) : templates.map((template) => (
              <div key={getEntityId(template)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{template.category || 'Template'}</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-950">{template.name}</h3>
                  </div>
                  <StatusBadge status={template.status || 'draft'} />
                </div>
                <p className="mt-3 line-clamp-4 text-sm text-slate-600">{template.body}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void updateWhatsAppTemplate(getEntityId(template), { isActive: !template.isActive }).then(() => loadTemplates())}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    {template.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'automation' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setRuleOpen(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Add Automation Rule</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {rules.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                Default automation rules are seeded for booking, payment, review, lead, and enquiry flows.
              </div>
            ) : rules.map((rule) => (
              <div key={getEntityId(rule)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">{rule.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{capitalize(rule.trigger.replace(/_/g, ' '))}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rule.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{rule.messageContent || rule.template?.body || 'Uses linked template'}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-slate-50 p-2"><div className="font-bold">{rule.stats?.triggered ?? 0}</div><div className="text-slate-500">Triggered</div></div>
                  <div className="rounded-xl bg-slate-50 p-2"><div className="font-bold">{rule.stats?.sent ?? 0}</div><div className="text-slate-500">Sent</div></div>
                  <div className="rounded-xl bg-slate-50 p-2"><div className="font-bold">{rule.stats?.failed ?? 0}</div><div className="text-slate-500">Failed</div></div>
                </div>
                <button
                  type="button"
                  onClick={() => void updateWhatsAppAutomationRule(getEntityId(rule), { isActive: !rule.isActive }).then(() => loadRules())}
                  className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {rule.isActive ? 'Disable Rule' : 'Enable Rule'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard title="Total Messages" value={stats?.totalMessages ?? 0} helper={`${stats?.activeConversations ?? 0} active conversations`} />
          <StatCard title="Outgoing Messages" value={stats?.outgoingMessages ?? 0} helper={`${stats?.queuedMessages ?? 0} queued`} />
          <StatCard title="Failed Messages" value={stats?.failedMessages ?? 0} helper="Retry from message logs if needed" />
          <StatCard title="Scheduled Messages" value={stats?.scheduledMessages ?? 0} helper="Future sends waiting to dispatch" />
          <StatCard title="Active Templates" value={stats?.activeTemplates ?? 0} helper="Approved and active templates" />
          <StatCard title="Active Automation Rules" value={stats?.activeAutomationRules ?? 0} helper="Workflows currently enabled" />
          <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Delivery Breakdown</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(stats?.byStatus ?? {}).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{capitalize(key)}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={composeOpen} onClose={() => setComposeOpen(false)} title="Send WhatsApp Message" size="lg">
        <div className="space-y-4">
          <FormInput label="Phone" value={composeForm.phone} onChange={(e) => setComposeForm({ ...composeForm, phone: e.target.value })} />
          <SelectInput label="Template (optional)" value={composeForm.templateName} onChange={(e) => setComposeForm({ ...composeForm, templateName: e.target.value })} options={[{ value: '', label: 'No template' }, ...templates.map((t) => ({ value: t.name, label: t.name }))]} />
          <TextArea label="Message" rows={5} value={composeForm.content} onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setComposeOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={() => void handleSend()} disabled={isSaving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{isSaving ? 'Sending...' : 'Send Message'}</button>
        </div>
      </Modal>

      <Modal isOpen={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="Broadcast WhatsApp Message" size="lg">
        <div className="space-y-4">
          <TextArea label="Phone numbers (comma or new line separated)" rows={4} value={broadcastForm.phones} onChange={(e) => setBroadcastForm({ ...broadcastForm, phones: e.target.value })} />
          <TextArea label="Message" rows={5} value={broadcastForm.content} onChange={(e) => setBroadcastForm({ ...broadcastForm, content: e.target.value })} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setBroadcastOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={() => void handleBroadcast()} disabled={isSaving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{isSaving ? 'Sending...' : 'Send Broadcast'}</button>
        </div>
      </Modal>

      <Modal isOpen={templateOpen} onClose={() => setTemplateOpen(false)} title="Create Template" size="lg">
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label="Template Name" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
          <FormInput label="Category" value={templateForm.category} onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })} />
          <SelectInput label="Status" value={templateForm.status} onChange={(e) => setTemplateForm({ ...templateForm, status: e.target.value })} options={WHATSAPP_TEMPLATE_STATUSES} />
        </div>
        <div className="mt-4"><TextArea label="Body" rows={5} value={templateForm.body} onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })} /></div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setTemplateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={() => void handleCreateTemplate()} disabled={isSaving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Save Template</button>
        </div>
      </Modal>

      <Modal isOpen={ruleOpen} onClose={() => setRuleOpen(false)} title="Create Automation Rule" size="lg">
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput label="Rule Name" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
          <SelectInput label="Trigger" value={ruleForm.trigger} onChange={(e) => setRuleForm({ ...ruleForm, trigger: e.target.value })} options={WHATSAPP_AUTOMATION_TRIGGERS} />
        </div>
        <div className="mt-4"><TextArea label="Message Content" rows={5} value={ruleForm.messageContent} onChange={(e) => setRuleForm({ ...ruleForm, messageContent: e.target.value })} /></div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setRuleOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={() => void handleCreateRule()} disabled={isSaving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Save Rule</button>
        </div>
      </Modal>
    </div>
  );
}
