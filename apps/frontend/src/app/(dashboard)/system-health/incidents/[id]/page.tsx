'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock3, FileCode2, Server, UserCog } from 'lucide-react';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingState, ModulePageLayout, StatCard, SummaryCardGrid } from '@/components/layout';
import { getPlatformSystemIncident, type PlatformSystemIncidentDetails } from '@/services/platform.service';
import { formatDate } from '@/utils/format';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-semibold text-slate-950">{title}</h2>{children}</section>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-1 text-sm font-semibold text-slate-900">{value || '—'}</div></div>;
}

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const [incident, setIncident] = useState<PlatformSystemIncidentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getPlatformSystemIncident(params.id)
      .then(setIncident)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load incident'))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <PlatformOnly>
      <ModulePageLayout
        title={incident?.incidentNumber || 'Incident Details'}
        subtitle="Incident summary, event timeline, affected services, error logs preview, resolution status, and engineer assignment readiness."
        actions={<Link href="/system-health" className="btn-secondary"><ArrowLeft className="mr-2 h-4 w-4" />Back to System Health</Link>}
      >
        {loading ? (
          <LoadingState variant="page" />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : incident ? (
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={incident.severity} />
                    <StatusBadge status={incident.status} />
                    <StatusBadge status={incident.affectedService} />
                  </div>
                  <h1 className="mt-3 text-2xl font-bold text-slate-950">{incident.message}</h1>
                  <p className="mt-2 text-sm text-slate-500">Created {formatDate(incident.createdAt)} · Updated {formatDate(incident.updatedAt)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Runbook automation: {incident.futureReady.runbookAutomation}</div>
              </div>
            </section>

            <SummaryCardGrid columns={4}>
              <StatCard title="Affected Service" value={incident.affectedService} helper="Service impact scope" icon={<Server className="h-5 w-5" />} />
              <StatCard title="Severity" value={incident.severity} helper="Alert routing ready" icon={<AlertTriangle className="h-5 w-5" />} />
              <StatCard title="Resolution" value={incident.resolvedAt ? 'Resolved' : 'Open'} helper={incident.resolvedAt ? formatDate(incident.resolvedAt) : 'Awaiting resolution'} icon={<CheckCircle2 className="h-5 w-5" />} />
              <StatCard title="Engineer" value="Future-ready" helper="On-call assignment placeholder" icon={<UserCog className="h-5 w-5" />} />
            </SummaryCardGrid>

            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                <Section title="Timeline of Events">
                  <div className="space-y-3">
                    {incident.timeline.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No event timeline has been recorded yet.</p>
                    ) : (
                      incident.timeline.map((item, index) => (
                        <div key={`${item.timestamp}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-950">{item.event}</p>
                            <span className="text-xs text-slate-500">{formatDate(item.timestamp)}</span>
                          </div>
                          {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </Section>

                <Section title="Error Logs Preview">
                  <div className="space-y-3">
                    {incident.errorLogsPreview.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                        <FileCode2 className="mx-auto h-6 w-6 text-slate-400" />
                        <p className="mt-2 text-sm font-semibold text-slate-700">Streaming logs placeholder</p>
                        <p className="text-xs text-slate-500">Ready for future log collector and trace integration.</p>
                      </div>
                    ) : (
                      incident.errorLogsPreview.map((log, index) => (
                        <pre key={`${log.timestamp}-${index}`} className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{`[${formatDate(log.timestamp)}] ${log.level.toUpperCase()} ${log.message}`}</pre>
                      ))
                    )}
                  </div>
                </Section>
              </div>

              <aside className="space-y-5">
                <Section title="Incident Summary">
                  <div className="grid gap-3">
                    <Info label="Incident Number" value={incident.incidentNumber} />
                    <Info label="Affected Service" value={incident.affectedService} />
                    <Info label="Status" value={<StatusBadge status={incident.status} />} />
                    <Info label="Severity" value={<StatusBadge status={incident.severity} />} />
                  </div>
                </Section>

                <Section title="Future-Ready Operations">
                  <div className="grid gap-3">
                    <Info label="Alert Routing" value={incident.futureReady.alertRouting} />
                    <Info label="On-call Escalation" value={incident.futureReady.onCallEscalation} />
                    <Info label="Streaming Logs" value={incident.futureReady.streamingLogs} />
                    <Info label="Runbooks" value={incident.futureReady.runbookAutomation} />
                  </div>
                </Section>

                <Section title="Resolution Status">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <Clock3 className="h-5 w-5 text-slate-500" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">{incident.resolvedAt ? 'Resolved' : 'Resolution in progress'}</p>
                    <p className="mt-1 text-xs text-slate-500">Engineer assignment and incident automation are intentionally design-ready.</p>
                  </div>
                </Section>
              </aside>
            </div>
          </div>
        ) : null}
      </ModulePageLayout>
    </PlatformOnly>
  );
}
