'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BedDouble,
  Download,
  IndianRupee,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { DataTable, type Column } from '@/components/DataTable';
import { FormInput, SelectInput } from '@/components/FormInput';
import { LoadingState, ModulePageLayout, ModuleToolbar, StatCard, SummaryCardGrid } from '@/components/layout';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/hooks/useAuth';
import { BarChartWidget } from '@/features/analytics/components/BarChartWidget';
import { DonutChartWidget } from '@/features/analytics/components/DonutChartWidget';
import { KpiCard } from '@/features/analytics/components/KpiCard';
import { SectionPanel } from '@/features/analytics/components/SectionPanel';
import { TrendAreaChart } from '@/features/analytics/components/TrendAreaChart';
import { ANALYTICS_PERIODS, ANALYTICS_TABS, EXPORT_TYPES, type AnalyticsTabId } from '@/features/analytics/constants';
import { exportAnalytics, getAnalyticsOverview } from '@/services/analytics.service';
import { getPlatformAnalytics, getPlatformPlans, type PlatformAnalyticsResponse, type PlatformPlan } from '@/services/platform.service';
import type { AnalyticsOverview } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

const emptyOverview: AnalyticsOverview = {
  generatedAt: '',
  dateRange: { from: '', to: '', period: 'monthly' },
  executiveSummary: {
    totalRevenue: 0, revpar: 0, adr: 0, occupancyRate: 0, totalBookings: 0, averageBookingValue: 0,
    averageStayNights: 0, cancellationRate: 0, noShowRate: 0, collectionRate: 0, outstandingAmount: 0,
    averageRating: 0, reputationScore: 0, leadConversionRate: 0, repeatGuestRate: 0, campaignEngagementRate: 0,
    whatsappDeliveryRate: 0, followUpCompletionRate: 0,
  },
  revenue: { trend: [], byMethod: {}, byBookingSource: {} },
  bookings: { trend: [], byStatus: {}, bySource: {}, byType: {} },
  occupancy: { trend: [], currentRate: 0, totalRooms: 0, occupiedRooms: 0, byRoomType: [] },
  guests: { trend: [], totalGuests: 0, newGuests: 0, repeatGuestRate: 0, averageLifetimeValue: 0, bySource: {} },
  leads: { funnel: {}, conversionRate: 0, bySource: {}, hotLeads: 0 },
  campaigns: { totalCampaigns: 0, activeCampaigns: 0, totalSent: 0, engagementRate: 0, revenueGenerated: 0, bookingsGenerated: 0, byChannel: {}, byType: {} },
  payments: { totalCollected: 0, pendingAmount: 0, refundedAmount: 0, collectionRate: 0, trend: [], byMethod: {} },
  reviews: { averageRating: 0, reputationScore: 0, totalReviews: 0, negativeReviews: 0, trend: [], ratingDistribution: {}, bySource: {} },
  whatsapp: { totalMessages: 0, deliveryRate: 0, readRate: 0, replyRate: 0, incomingMessages: 0, outgoingMessages: 0, trend: [] },
  operations: { housekeeping: { totalTasks: 0, completedTasks: 0, completionRate: 0, dirtyRooms: 0 }, maintenance: { openIssues: 0, urgentIssues: 0, downtimeRooms: 0, avgResolutionHours: 0 } },
  staff: { totalStaff: 0, onDuty: 0, onLeave: 0, followUpsDue: 0, overdueFollowUps: 0 },
};

function downloadCsv(filename: string, data: string) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function PlatformAnalyticsDashboard() {
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planId, setPlanId] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minRevenue, setMinRevenue] = useState('');
  const [maxRevenue, setMaxRevenue] = useState('');

  const loadPlatformAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [planResult, analyticsResult] = await Promise.all([
        getPlatformPlans({ limit: 100 }),
        getPlatformAnalytics({
          planId: planId || undefined,
          country: country || undefined,
          status: status || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          minRevenue: minRevenue || undefined,
          maxRevenue: maxRevenue || undefined,
        }),
      ]);
      setPlans(planResult.data);
      setAnalytics(analyticsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platform analytics');
    } finally {
      setLoading(false);
    }
  }, [country, fromDate, maxRevenue, minRevenue, planId, status, toDate]);

  useEffect(() => { void loadPlatformAnalytics(); }, [loadPlatformAnalytics]);

  const hotelColumns = useMemo<Column<PlatformAnalyticsResponse['hotelPerformance'][number]>[]>(
    () => [
      { key: 'hotelName', header: 'Hotel', render: (hotel) => <div className="font-semibold text-slate-950">{hotel.hotelName}</div> },
      { key: 'planName', header: 'Plan', render: (hotel) => hotel.planName },
      { key: 'subscriptionStatus', header: 'Status', render: (hotel) => <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{hotel.subscriptionStatus}</span> },
      { key: 'rooms', header: 'Rooms', render: (hotel) => `${hotel.activeRooms}/${hotel.totalRooms}` },
      { key: 'occupancyRate', header: 'Occupancy', render: (hotel) => `${hotel.occupancyRate}%` },
      { key: 'staffCount', header: 'Staff / Users', render: (hotel) => `${hotel.staffCount} staff · ${hotel.activeUsers} users` },
      { key: 'lastLogin', header: 'Last Login', render: (hotel) => hotel.lastLogin ? formatDate(hotel.lastLogin) : '—' },
      { key: 'engagementScore', header: 'Engagement', render: (hotel) => `${hotel.engagementScore}%` },
    ],
    []
  );

  const clearFilters = () => {
    setPlanId('');
    setCountry('');
    setStatus('');
    setFromDate('');
    setToDate('');
    setMinRevenue('');
    setMaxRevenue('');
  };

  if (loading) {
    return <LoadingState variant="page" />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!analytics) return null;

  const metrics = analytics.metrics;

  return (
    <ModulePageLayout
      title="Platform Analytics"
      subtitle="Revenue, subscriptions, hotel performance, platform usage, growth, retention, and operational intelligence."
      actions={<button type="button" className="btn-secondary" onClick={() => void loadPlatformAnalytics()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</button>}
      toolbar={
        <ModuleToolbar
          actions={<button type="button" className="btn-secondary !px-3 !py-2" onClick={clearFilters}>Clear Filters</button>}
          filters={
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <SelectInput label="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)} options={[{ value: '', label: 'All plans' }, ...plans.map((plan) => ({ value: plan.id, label: plan.name }))]} />
              <SelectInput label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: '', label: 'All statuses' }, { value: 'trial', label: 'Trial' }, { value: 'active', label: 'Active' }, { value: 'paid', label: 'Paid' }, { value: 'suspended', label: 'Suspended' }, { value: 'inactive', label: 'Inactive' }]} />
              <FormInput label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
              <FormInput label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <FormInput label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <FormInput label="Min Revenue" type="number" value={minRevenue} onChange={(e) => setMinRevenue(e.target.value)} />
              <FormInput label="Max Revenue" type="number" value={maxRevenue} onChange={(e) => setMaxRevenue(e.target.value)} />
            </div>
          }
        />
      }
    >
      <div className="space-y-6">
        <SummaryCardGrid columns={4}>
          <StatCard title="Hotels" value={metrics.totalHotels} helper={`${metrics.activeHotels} active · ${metrics.suspendedHotels} suspended`} icon={<BarChart3 className="h-5 w-5" />} />
          <StatCard title="MRR" value={formatCurrency(metrics.mrr)} helper={`ARR ${formatCurrency(metrics.arr)}`} icon={<IndianRupee className="h-5 w-5" />} />
          <StatCard title="Churn / Retention" value={`${metrics.churnRate}% / ${metrics.retentionRate}%`} helper="Retention model is future-ready" icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard title="Invoices" value={metrics.totalInvoicesGenerated} helper={`${metrics.totalPaidInvoices} paid · ${metrics.overdueInvoices} overdue`} icon={<Wallet className="h-5 w-5" />} />
        </SummaryCardGrid>

        <div className="grid gap-4 xl:grid-cols-2">
          <TrendAreaChart title="Revenue Trend" data={analytics.revenue.revenueTrend} valueFormatter={formatCurrency} color="emerald" />
          <TrendAreaChart title="Growth Curve" data={analytics.revenue.growthCurve} valueFormatter={formatCurrency} color="violet" />
          <TrendAreaChart title="MRR Chart" data={analytics.revenue.mrrTrend} valueFormatter={formatCurrency} color="indigo" />
          <TrendAreaChart title="ARR Chart" data={analytics.revenue.arrTrend} valueFormatter={formatCurrency} color="amber" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <DonutChartWidget title="Revenue by Plan" data={analytics.revenue.byPlan} />
          <BarChartWidget title="Revenue by Hotel" data={analytics.revenue.byHotel} valueFormatter={formatCurrency} />
          <BarChartWidget title="Revenue by Country / Region" data={analytics.revenue.byCountry} valueFormatter={formatCurrency} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <DonutChartWidget title="Plan Distribution" data={analytics.subscriptions.planDistribution} />
          <DonutChartWidget title="Trial vs Paid" data={analytics.subscriptions.trialVsPaid} />
          <BarChartWidget title="Usage Heatmap Placeholder" data={analytics.usage.moduleUsageHeatmap} />
        </div>

        <SummaryCardGrid columns={4}>
          <StatCard title="Trial Conversion" value={`${analytics.subscriptions.trialConversionRate}%`} helper={`${analytics.segments.trialUsers} trial · ${analytics.segments.paidUsers} paid`} />
          <StatCard title="Upgrade / Downgrade" value={`${analytics.subscriptions.upgradeRate}% / ${analytics.subscriptions.downgradeRate}%`} helper="Future-ready subscription event model" />
          <StatCard title="High Value Hotels" value={analytics.segments.highValueHotels} helper="Engagement score >= 85" />
          <StatCard title="At-Risk Hotels" value={analytics.segments.atRiskHotels} helper="Low engagement or suspended" />
        </SummaryCardGrid>

        <DataTable
          compact
          hideToolbar
          columns={hotelColumns}
          data={analytics.hotelPerformance}
          rowKey={(hotel) => hotel.hotelId}
          emptyTitle="No hotel performance data"
          emptyDescription="Hotel performance rows will appear once tenants are available."
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Global Activity Timeline</h2>
          <div className="mt-4 space-y-3">
            {analytics.activityTimeline.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No platform activity yet.</p>
            ) : (
              analytics.activityTimeline.map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.action.replace(/_/g, ' ')}</p>
                    <span className="text-xs text-slate-500">{formatDate(item.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.actor} · {item.entity}{item.entityAffected ? ` · ${item.entityAffected}` : ''}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </ModulePageLayout>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<AnalyticsTabId>('overview');
  const [period, setPeriod] = useState('monthly');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exportType, setExportType] = useState('overview');
  const [data, setData] = useState<AnalyticsOverview>(emptyOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(() => ({
    period,
    fromDate: period === 'custom' && fromDate ? fromDate : undefined,
    toDate: period === 'custom' && toDate ? toDate : undefined,
  }), [period, fromDate, toDate]);

  const loadData = useCallback(async () => {
    if (user?.role === 'super_admin') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setData(await getAnalyticsOverview(queryParams));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setData(emptyOverview);
    } finally {
      setIsLoading(false);
    }
  }, [queryParams, user?.role]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleExport = async () => {
    try {
      const result = await exportAnalytics({ ...queryParams, type: exportType, format: 'csv' });
      downloadCsv(result.filename, result.data);
      showToast('Report exported', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
    }
  };

  if (user?.role === 'super_admin') {
    return <PlatformAnalyticsDashboard />;
  }

  const summary = data.executiveSummary;

  const overviewKpis = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard title="Total Revenue" value={formatCurrency(summary.totalRevenue)} helper={`RevPAR ${formatCurrency(summary.revpar)} · ADR ${formatCurrency(summary.adr)}`} icon={IndianRupee} tone="emerald" />
      <KpiCard title="Occupancy" value={`${summary.occupancyRate}%`} helper={`${data.occupancy.occupiedRooms}/${data.occupancy.totalRooms} rooms occupied`} icon={BedDouble} tone="violet" />
      <KpiCard title="Bookings" value={summary.totalBookings} helper={`${summary.cancellationRate}% cancellation · ${summary.noShowRate}% no-show`} icon={BarChart3} tone="sky" />
      <KpiCard title="Collection Rate" value={`${summary.collectionRate}%`} helper={formatCurrency(summary.outstandingAmount) + ' outstanding'} icon={Wallet} tone="amber" />
      <KpiCard title="Repeat Guests" value={`${summary.repeatGuestRate}%`} helper={`${data.guests.totalGuests} total guests`} icon={Users} tone="violet" />
      <KpiCard title="Lead Conversion" value={`${summary.leadConversionRate}%`} helper={`${data.leads.hotLeads} hot leads`} icon={TrendingUp} tone="rose" />
      <KpiCard title="Reputation" value={`${summary.reputationScore}%`} helper={`${summary.averageRating}/5 average rating`} icon={Star} tone="amber" />
      <KpiCard title="WhatsApp Delivery" value={`${summary.whatsappDeliveryRate}%`} helper={`${data.whatsapp.readRate}% read rate`} icon={MessageCircle} tone="emerald" />
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-900 to-violet-800 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">Business Intelligence</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Analytics & Insights</h1>
            <p className="mt-2 max-w-3xl text-sm text-indigo-100">
              Executive dashboards for revenue, occupancy, guest growth, marketing ROI, payments, reviews, and hotel operations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/reports" className="btn-secondary !border-white/20 !bg-white/10 !text-white hover:!bg-white/20 inline-flex items-center">
              Reports Center<ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <button type="button" className="btn-secondary !border-white/20 !bg-white/10 !text-white hover:!bg-white/20" onClick={() => void loadData()}>
              <RefreshCw className="mr-2 h-4 w-4" />Refresh
            </button>
            <button type="button" className="btn-primary" onClick={() => void handleExport()}>
              <Download className="mr-2 h-4 w-4" />Export CSV
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end">
          <SelectInput label="Period" value={period} onChange={(e) => setPeriod(e.target.value)} options={ANALYTICS_PERIODS.map((item) => ({ value: item.value, label: item.label }))} />
          {period === 'custom' && (
            <>
              <FormInput label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <FormInput label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </>
          )}
          <SelectInput label="Export Report" value={exportType} onChange={(e) => setExportType(e.target.value)} options={EXPORT_TYPES.map((item) => ({ value: item.value, label: item.label }))} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {ANALYTICS_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl bg-slate-100" />)}
        </div>
      ) : tab === 'overview' ? (
        <div className="space-y-6">
          {overviewKpis}
          <div className="grid gap-4 xl:grid-cols-2">
            <TrendAreaChart title="Revenue Trend" data={data.revenue.trend} valueFormatter={formatCurrency} color="emerald" />
            <TrendAreaChart title="Booking Trend" data={data.bookings.trend} color="indigo" />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <DonutChartWidget title="Booking Sources" data={data.bookings.bySource} />
            <DonutChartWidget title="Payment Methods" data={data.revenue.byMethod} />
            <DonutChartWidget title="Lead Funnel" data={data.leads.funnel} />
          </div>
        </div>
      ) : tab === 'revenue' ? (
        <SectionPanel title="Revenue Intelligence" subtitle="Collections, ADR, RevPAR, and payment performance">
          <div className="grid gap-4 xl:grid-cols-2">
            <TrendAreaChart title="Revenue Trend" data={data.revenue.trend} valueFormatter={formatCurrency} color="emerald" />
            <TrendAreaChart title="Payment Collections" data={data.payments.trend} valueFormatter={formatCurrency} color="violet" />
            <BarChartWidget title="Revenue by Payment Method" data={data.revenue.byMethod} valueFormatter={formatCurrency} />
            <BarChartWidget title="Revenue by Booking Source" data={data.revenue.byBookingSource} valueFormatter={formatCurrency} />
          </div>
        </SectionPanel>
      ) : tab === 'bookings' ? (
        <SectionPanel title="Bookings & Occupancy" subtitle="Reservation trends, occupancy, and room-type performance">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Average Stay" value={`${summary.averageStayNights} nights`} icon={BedDouble} tone="sky" />
            <KpiCard title="Average Booking Value" value={formatCurrency(summary.averageBookingValue)} icon={IndianRupee} tone="emerald" />
            <KpiCard title="Occupancy Rate" value={`${summary.occupancyRate}%`} icon={BarChart3} tone="violet" />
            <KpiCard title="Cancellation Rate" value={`${summary.cancellationRate}%`} icon={TrendingUp} tone="rose" />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <TrendAreaChart title="Booking Volume" data={data.bookings.trend} color="indigo" />
            <DonutChartWidget title="Booking Status Mix" data={data.bookings.byStatus} />
            <BarChartWidget title="Booking Types" data={data.bookings.byType} />
            <BarChartWidget title="Room Type Occupancy" data={Object.fromEntries(data.occupancy.byRoomType.map((item) => [item.name, item.rate]))} />
          </div>
        </SectionPanel>
      ) : tab === 'guests' ? (
        <SectionPanel title="Guests & Lead Center" subtitle="Acquisition, repeat behavior, and conversion funnel">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Total Guests" value={data.guests.totalGuests} helper={`${data.guests.newGuests} new this month`} icon={Users} tone="violet" />
            <KpiCard title="Repeat Guest Rate" value={`${data.guests.repeatGuestRate}%`} icon={TrendingUp} tone="emerald" />
            <KpiCard title="Lead Conversion" value={`${data.leads.conversionRate}%`} helper={`${data.leads.hotLeads} hot leads`} icon={BarChart3} tone="violet" />
            <KpiCard title="Avg Lifetime Value" value={formatCurrency(data.guests.averageLifetimeValue)} icon={Wallet} tone="amber" />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <TrendAreaChart title="Guest Acquisition" data={data.guests.trend} color="indigo" />
            <DonutChartWidget title="Guest Sources" data={data.guests.bySource} />
            <DonutChartWidget title="Lead Funnel" data={data.leads.funnel} />
            <BarChartWidget title="Lead Sources" data={data.leads.bySource} />
          </div>
        </SectionPanel>
      ) : tab === 'marketing' ? (
        <SectionPanel title="Marketing & WhatsApp" subtitle="Campaign ROI, engagement, and messaging performance">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Active Campaigns" value={data.campaigns.activeCampaigns} helper={`${data.campaigns.totalCampaigns} total`} icon={Megaphone} tone="violet" />
            <KpiCard title="Campaign Engagement" value={`${data.campaigns.engagementRate}%`} helper={`${data.campaigns.totalSent} messages sent`} icon={TrendingUp} tone="emerald" />
            <KpiCard title="Campaign Revenue" value={formatCurrency(data.campaigns.revenueGenerated)} helper={`${data.campaigns.bookingsGenerated} bookings`} icon={IndianRupee} tone="amber" />
            <KpiCard title="WhatsApp Delivery" value={`${data.whatsapp.deliveryRate}%`} helper={`${data.whatsapp.replyRate}% reply rate`} icon={MessageCircle} tone="sky" />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <TrendAreaChart title="WhatsApp Volume" data={data.whatsapp.trend} color="emerald" />
            <DonutChartWidget title="Campaign Channels" data={data.campaigns.byChannel} />
            <DonutChartWidget title="Campaign Types" data={data.campaigns.byType} />
            <BarChartWidget title="Review Rating Trend" data={Object.fromEntries(data.reviews.trend.map((point) => [point.label, point.value]))} />
          </div>
        </SectionPanel>
      ) : (
        <SectionPanel title="Operations & Staff" subtitle="Housekeeping efficiency, maintenance downtime, and team workload">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="HK Completion" value={`${data.operations.housekeeping.completionRate}%`} helper={`${data.operations.housekeeping.completedTasks}/${data.operations.housekeeping.totalTasks} tasks`} icon={BedDouble} tone="emerald" />
            <KpiCard title="Dirty Rooms" value={data.operations.housekeeping.dirtyRooms} icon={BarChart3} tone="amber" />
            <KpiCard title="Open Maintenance" value={data.operations.maintenance.openIssues} helper={`${data.operations.maintenance.urgentIssues} urgent`} icon={TrendingUp} tone="rose" />
            <KpiCard title="Staff On Duty" value={data.staff.onDuty} helper={`${data.staff.totalStaff} total staff`} icon={Users} tone="violet" />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <BarChartWidget title="Review Rating Distribution" data={data.reviews.ratingDistribution} />
            <BarChartWidget title="Review Sources" data={data.reviews.bySource} />
            <KpiCard title="Follow-ups Due" value={data.staff.followUpsDue} helper={`${data.staff.overdueFollowUps} overdue · ${summary.followUpCompletionRate}% completion`} icon={MessageCircle} tone="sky" />
            <KpiCard title="Maintenance Downtime Rooms" value={data.operations.maintenance.downtimeRooms} icon={BedDouble} tone="rose" />
          </div>
        </SectionPanel>
      )}
    </div>
  );
}
