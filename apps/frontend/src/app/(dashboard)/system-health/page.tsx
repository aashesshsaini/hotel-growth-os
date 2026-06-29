'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Clock3, Database, Gauge, RefreshCcw, Server, ShieldCheck, Wifi } from 'lucide-react';
import { DataTable, type Column } from '@/components/DataTable';
import { FormInput, SelectInput } from '@/components/FormInput';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { FilterPanel, LoadingState, ModulePageLayout, ModuleToolbar, StatCard, SummaryCardGrid } from '@/components/layout';
import { BarChartWidget } from '@/features/analytics/components/BarChartWidget';
import { DonutChartWidget } from '@/features/analytics/components/DonutChartWidget';
import { SectionPanel } from '@/features/analytics/components/SectionPanel';
import { TrendAreaChart } from '@/features/analytics/components/TrendAreaChart';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import {
  getPlatformSystemHealth,
  getPlatformSystemIncidents,
  type PlatformApiMetric,
  type PlatformServiceMetric,
  type PlatformSystemHealthResponse,
  type PlatformSystemIncident,
} from '@/services/platform.service';
import { formatDate } from '@/utils/format';

const percent = (value: number) => `${value.toFixed(2)}%`;
const ms = (value: number) => `${value}ms`;

function HealthDot({ status }: { status: string }) {
  const tone = status === 'healthy' ? 'bg-emerald-500' : status === 'slow' || status === 'degraded' ? 'bg-amber-500' : 'bg-red-500';
  return <span className={`inline-flex h-2.5 w-2.5 rounded-full ${tone}`} />;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<PlatformSystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceStatus, setServiceStatus] = useState('');
  const [minErrorRate, setMinErrorRate] = useState('');
  const [maxLatency, setMaxLatency] = useState('');
  const [incidentStatus, setIncidentStatus] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState('');

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      setHealth(await getPlatformSystemHealth({
        serviceStatus: serviceStatus || undefined,
        minErrorRate: minErrorRate || undefined,
        maxLatency: maxLatency || undefined,
      }));
    } finally {
      setLoading(false);
    }
  }, [maxLatency, minErrorRate, serviceStatus]);

  useEffect(() => { void loadHealth(); }, [loadHealth]);

  const fetchIncidents = useCallback(
    (params: Parameters<typeof getPlatformSystemIncidents>[0]) =>
      getPlatformSystemIncidents({
        ...params,
        status: incidentStatus || undefined,
        severity: incidentSeverity || undefined,
      }),
    [incidentSeverity, incidentStatus]
  );

  const { data: incidents, pagination, isLoading: incidentsLoading, error: incidentsError, setPage, setSearch, setParams } =
    usePaginatedQuery<PlatformSystemIncident>({ fetchFn: fetchIncidents });

  const resetFilters = () => {
    setServiceStatus('');
    setMinErrorRate('');
    setMaxLatency('');
    setIncidentStatus('');
    setIncidentSeverity('');
    setParams((prev) => ({ ...prev, status: undefined, severity: undefined, page: 1 }));
  };

  const serviceColumns = useMemo<Column<PlatformServiceMetric>[]>(
    () => [
      { key: 'serviceName', header: 'Service Name', render: (service) => <div className="flex items-center gap-2"><HealthDot status={service.status} /><span className="font-semibold capitalize">{service.serviceName}</span></div> },
      { key: 'status', header: 'Status', render: (service) => <StatusBadge status={service.status} /> },
      { key: 'latency', header: 'Latency', render: (service) => ms(service.latency) },
      { key: 'errorRate', header: 'Error Rate', render: (service) => percent(service.errorRate) },
      { key: 'throughput', header: 'Requests/min', render: (service) => service.throughput },
      { key: 'lastUpdatedAt', header: 'Last Updated', render: (service) => formatDate(service.lastUpdatedAt) },
      { key: 'actions', header: '', className: 'text-right', render: (service) => <span className="text-xs font-semibold text-slate-500">Drill-down ready</span> },
    ],
    []
  );

  const apiColumns = useMemo<Column<PlatformApiMetric>[]>(
    () => [
      { key: 'endpoint', header: 'Endpoint', render: (api) => <div><span className="font-mono text-xs text-slate-700">{api.endpoint}</span><div className="mt-1"><StatusBadge status={api.method} /></div></div> },
      { key: 'responseTime', header: 'Response Time', render: (api) => ms(api.responseTime) },
      { key: 'errorCount', header: 'Errors', render: (api) => api.errorCount },
      { key: 'statusCodes', header: 'Status Codes', render: (api) => Object.entries(api.statusCodes).map(([key, value]) => `${key}: ${value}`).join(' / ') },
      { key: 'lastCheckedAt', header: 'Last Checked', render: (api) => formatDate(api.lastCheckedAt) },
    ],
    []
  );

  const incidentColumns = useMemo<Column<PlatformSystemIncident>[]>(
    () => [
      { key: 'incidentNumber', header: 'Incident', render: (incident) => <Link href={`/system-health/incidents/${incident.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900">{incident.incidentNumber}</Link> },
      { key: 'message', header: 'Message', render: (incident) => <div className="max-w-md truncate text-slate-800">{incident.message}</div> },
      { key: 'affectedService', header: 'Service', render: (incident) => <span className="capitalize">{incident.affectedService}</span> },
      { key: 'severity', header: 'Severity', render: (incident) => <StatusBadge status={incident.severity} /> },
      { key: 'status', header: 'Status', render: (incident) => <StatusBadge status={incident.status} /> },
      { key: 'assignedEngineer', header: 'Assigned Engineer', render: (incident) => typeof incident.assignedEngineer === 'string' ? incident.assignedEngineer : incident.assignedEngineer?.name || 'Future-ready' },
      { key: 'createdAt', header: 'Created', render: (incident) => formatDate(incident.createdAt) },
    ],
    []
  );

  const activeFilters = [serviceStatus, minErrorRate, maxLatency, incidentStatus, incidentSeverity].filter(Boolean).length;

  return (
    <PlatformOnly>
      <ModulePageLayout
        title="System Health"
        subtitle="Platform observability for uptime, service performance, API health, incidents, infrastructure, and real-time monitoring readiness."
        actions={<button type="button" className="btn-secondary" onClick={() => void loadHealth()}><RefreshCcw className="mr-2 h-4 w-4" />Refresh Metrics</button>}
        summary={
          health ? (
            <SummaryCardGrid columns={4}>
              <StatCard title="System Uptime" value={percent(health.systemMetrics.systemUptime)} helper={health.systemMetrics.systemStatus} icon={<ShieldCheck className="h-5 w-5" />} />
              <StatCard title="Active Users" value={health.systemMetrics.activeUsers} helper="Last 15 minutes" icon={<Activity className="h-5 w-5" />} />
              <StatCard title="API Success" value={percent(health.systemMetrics.successRate)} helper={`${health.systemMetrics.totalRequests} requests today`} icon={<Wifi className="h-5 w-5" />} />
              <StatCard title="Error Rate" value={percent(health.systemMetrics.errorRate)} helper={`${health.systemMetrics.requestsPerMinute} RPM`} icon={<AlertTriangle className="h-5 w-5" />} />
              <StatCard title="Avg Response" value={ms(health.systemMetrics.avgResponseTime)} helper="Across platform services" icon={<Gauge className="h-5 w-5" />} />
            </SummaryCardGrid>
          ) : undefined
        }
        toolbar={
          <ModuleToolbar
            onSearch={setSearch}
            searchPlaceholder="Search incidents..."
            filters={
              <FilterPanel title="Monitoring Filters" activeCount={activeFilters} onReset={resetFilters} basicFilters={
                <>
                  <div className="filter-field">
                    <SelectInput label="Service Status" value={serviceStatus} onChange={(e) => setServiceStatus(e.target.value)} options={[{ value: '', label: 'All services' }, { value: 'healthy', label: 'Healthy' }, { value: 'slow', label: 'Slow' }, { value: 'down', label: 'Down' }]} />
                  </div>
                  <div className="filter-field">
                    <SelectInput label="Incident Status" value={incidentStatus} onChange={(e) => { setIncidentStatus(e.target.value); setParams((prev) => ({ ...prev, status: e.target.value || undefined, page: 1 })); }} options={[{ value: '', label: 'All incidents' }, { value: 'open', label: 'Open' }, { value: 'acknowledged', label: 'Acknowledged' }, { value: 'resolved', label: 'Resolved' }]} />
                  </div>
                </>
              }>
                <FormInput label="Min Error Rate" type="number" value={minErrorRate} onChange={(e) => setMinErrorRate(e.target.value)} />
                <FormInput label="Max Latency" type="number" value={maxLatency} onChange={(e) => setMaxLatency(e.target.value)} />
                <SelectInput label="Incident Severity" value={incidentSeverity} onChange={(e) => { setIncidentSeverity(e.target.value); setParams((prev) => ({ ...prev, severity: e.target.value || undefined, page: 1 })); }} options={[{ value: '', label: 'All severities' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} />
              </FilterPanel>
            }
          />
        }
      >
        {loading || !health ? (
          <LoadingState variant="page" />
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white"><Server className="h-6 w-6" /></div>
                  <div>
                    <div className="flex items-center gap-2"><HealthDot status={health.systemMetrics.systemStatus} /><StatusBadge status={health.systemMetrics.systemStatus} /></div>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">Global Platform Status</h2>
                    <p className="text-sm text-slate-500">Generated {formatDate(health.generatedAt)} · WebSocket, streaming logs, and real-time alerting ready for future integration.</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Auto-refresh placeholder: {health.autoRefresh.intervalSeconds}s interval · backend streaming not enabled.
                </div>
              </div>
            </section>

            <SectionPanel title="Health Overview" subtitle="Service-wise status, API health summary, and real-time readiness.">
              <div className="grid gap-4 lg:grid-cols-3">
                {health.serviceMetrics.map((service) => (
                  <div key={service.serviceName} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><HealthDot status={service.status} /><span className="font-semibold capitalize text-slate-950">{service.serviceName}</span></div>
                      <StatusBadge status={service.status} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl bg-slate-50 p-2"><p className="font-bold text-slate-950">{ms(service.latency)}</p><p className="text-slate-500">Latency</p></div>
                      <div className="rounded-xl bg-slate-50 p-2"><p className="font-bold text-slate-950">{percent(service.errorRate)}</p><p className="text-slate-500">Errors</p></div>
                      <div className="rounded-xl bg-slate-50 p-2"><p className="font-bold text-slate-950">{service.throughput}</p><p className="text-slate-500">RPM</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionPanel>

            <div className="grid gap-5 xl:grid-cols-3">
              <TrendAreaChart title="Response Time Trend" data={health.charts.responseTimeTrend} valueFormatter={ms} color="indigo" />
              <TrendAreaChart title="Error Rate Trend" data={health.charts.errorRateTrend} valueFormatter={percent} color="amber" />
              <TrendAreaChart title="Request Volume" data={health.charts.requestVolumeTrend} valueFormatter={(value) => `${value} rpm`} color="emerald" />
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <BarChartWidget title="Service Latency Comparison" data={health.charts.serviceLatency} valueFormatter={ms} />
              <DonutChartWidget title="Status Code Distribution" data={health.charts.statusCodeDistribution} />
            </div>

            <SectionPanel title="Service Monitoring Panel" subtitle="Filtered by status, error threshold, and latency range.">
              <DataTable compact hideToolbar columns={serviceColumns} data={health.serviceMetrics} rowKey={(service) => service.serviceName} emptyTitle="No services match the filters" />
            </SectionPanel>

            <SectionPanel title="API Monitoring Dashboard" subtitle="Endpoint response times, slowest APIs, failed endpoint ranking, and heatmap readiness.">
              <div className="mb-5 grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 xl:col-span-2">
                  <DataTable compact hideToolbar columns={apiColumns} data={health.apiMetrics} rowKey={(api) => `${api.method}-${api.endpoint}`} emptyTitle="No API metrics available" />
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="font-semibold text-slate-950">Slowest APIs</h3>
                    <div className="mt-3 space-y-2">{health.apiSummary.slowestApis.map((api) => <p key={api.endpoint} className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700">{api.endpoint} · {ms(api.responseTime)}</p>)}</div>
                  </div>
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <Clock3 className="mx-auto h-6 w-6 text-slate-400" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">API heatmap placeholder</p>
                    <p className="text-xs text-slate-500">{health.apiSummary.heatmap.note}</p>
                  </div>
                </div>
              </div>
            </SectionPanel>

            <div className="grid gap-5 xl:grid-cols-2">
              <SectionPanel title="Alerts & Incidents" subtitle="Design-ready alert visibility from incident records.">
                <DataTable compact hideToolbar columns={incidentColumns} data={incidents} isLoading={incidentsLoading} error={incidentsError} rowKey={(incident) => incident.id} emptyTitle="No incidents found" emptyDescription="Alert and incident records will appear here as monitoring integrations publish events." pagination={{ page: pagination.page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }} />
              </SectionPanel>
              <SectionPanel title="Database & Background Jobs" subtitle="Infrastructure monitoring placeholders for future collectors.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between"><Database className="h-5 w-5 text-slate-500" /><StatusBadge status={health.infrastructure.database.status} /></div>
                    <p className="text-lg font-bold text-slate-950">Database</p>
                    <p className="mt-2 text-sm text-slate-600">Query latency: {ms(health.infrastructure.database.queryLatency)}</p>
                    <p className="text-sm text-slate-600">Slow queries: {health.infrastructure.database.slowQueries}</p>
                    <p className="text-xs text-slate-500">Connection pool: {health.infrastructure.database.connectionPool}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between"><Activity className="h-5 w-5 text-slate-500" /><StatusBadge status={health.infrastructure.backgroundJobs.status} /></div>
                    <p className="text-lg font-bold text-slate-950">Background Jobs</p>
                    <p className="mt-2 text-sm text-slate-600">Queued: {health.infrastructure.backgroundJobs.queued}</p>
                    <p className="text-sm text-slate-600">Succeeded: {health.infrastructure.backgroundJobs.succeeded}</p>
                    <p className="text-sm text-slate-600">Failed: {health.infrastructure.backgroundJobs.failed}</p>
                  </div>
                </div>
              </SectionPanel>
            </div>
          </div>
        )}
      </ModulePageLayout>
    </PlatformOnly>
  );
}
