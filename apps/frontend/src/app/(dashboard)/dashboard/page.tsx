'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  CalendarCheck,
  IndianRupee,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { getDashboard, type DashboardResponse } from '@/services/dashboard.service';
import { capitalize, formatCurrency, formatDate } from '@/utils/format';

const emptyDashboard: DashboardResponse = {
  generatedAt: '',
  summary: {
    totalBookings: 0,
    todayBookings: 0,
    totalGuests: 0,
    newGuestsThisMonth: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    occupancyPercentage: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    newEnquiries: 0,
    pendingFollowUps: 0,
    reviewCount: 0,
    averageRating: 0,
    activeCampaigns: 0,
    whatsappAutomationCount: 0,
  },
  bookingOverview: {
    totalBookings: 0,
    todayBookings: 0,
    confirmedBookings: 0,
    checkedInBookings: 0,
    cancelledBookings: 0,
    occupancyPercentage: 0,
  },
  revenueOverview: {
    totalRevenue: 0,
    paymentRevenue: 0,
    bookingPaidRevenue: 0,
    pendingPayments: 0,
  },
  occupancy: {
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    occupancyPercentage: 0,
  },
  guestLeadActivity: {
    totalGuests: 0,
    newGuestsThisMonth: 0,
    newEnquiries: 0,
    pendingFollowUps: 0,
    enquiryStatuses: {},
  },
  reputation: {
    reviewCount: 0,
    averageRating: 0,
  },
  growth: {
    activeCampaigns: 0,
    whatsappAutomationCount: 0,
  },
  recentBookings: [],
  recentEnquiries: [],
};

const statusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (['confirmed', 'completed', 'paid', 'available', 'sent', 'delivered'].includes(normalized)) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (['pending', 'new', 'partially_paid', 'scheduled'].includes(normalized)) {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
  if (['cancelled', 'lost', 'failed', 'refunded'].includes(normalized)) {
    return 'bg-red-50 text-red-700 ring-red-200';
  }
  return 'bg-slate-100 text-slate-700 ring-slate-200';
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(status)}`}>
      {capitalize(status)}
    </span>
  );
}

function KpiCard({
  title,
  value,
  helper,
  icon,
  accent = 'indigo',
}: {
  title: string;
  value: React.ReactNode;
  helper: string;
  icon: React.ReactNode;
  accent?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
}) {
  const accents = {
    indigo: { gradient: 'from-indigo-500 to-indigo-700', icon: 'bg-indigo-50 text-indigo-700' },
    emerald: { gradient: 'from-emerald-500 to-teal-700', icon: 'bg-emerald-50 text-emerald-700' },
    amber: { gradient: 'from-amber-500 to-orange-600', icon: 'bg-amber-50 text-amber-700' },
    rose: { gradient: 'from-rose-500 to-red-700', icon: 'bg-rose-50 text-rose-700' },
    sky: { gradient: 'from-sky-500 to-blue-700', icon: 'bg-sky-50 text-sky-700' },
    purple: { gradient: 'from-purple-500 to-fuchsia-700', icon: 'bg-purple-50 text-purple-700' },
  }[accent];

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
        </div>
        <div className={`rounded-2xl ${accents.icon} p-3`}>{icon}</div>
      </div>
      <div className={`mt-4 h-1 rounded-full bg-gradient-to-r ${accents.gradient} opacity-70`} />
      <p className="mt-3 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function TableEmpty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">Data will appear here as soon as records are created.</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-3xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDashboard();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const dashboard = data || emptyDashboard;
  const summary = dashboard.summary;

  const kpis = useMemo(
    () => [
      {
        title: 'Total Bookings',
        value: summary.totalBookings,
        helper: `${summary.todayBookings} new today`,
        icon: <CalendarCheck className="h-5 w-5" />,
        accent: 'indigo' as const,
      },
      {
        title: 'Total Guests',
        value: summary.totalGuests,
        helper: `${summary.newGuestsThisMonth} new this month`,
        icon: <Users className="h-5 w-5" />,
        accent: 'purple' as const,
      },
      {
        title: 'Occupancy',
        value: `${summary.occupancyPercentage}%`,
        helper: `${summary.occupiedRooms}/${summary.totalRooms} rooms occupied`,
        icon: <BedDouble className="h-5 w-5" />,
        accent: 'emerald' as const,
      },
      {
        title: 'Revenue',
        value: formatCurrency(summary.totalRevenue),
        helper: `${formatCurrency(summary.pendingPayments)} pending`,
        icon: <IndianRupee className="h-5 w-5" />,
        accent: 'amber' as const,
      },
      {
        title: 'New Enquiries',
        value: summary.newEnquiries,
        helper: `${summary.pendingFollowUps} follow-ups pending`,
        icon: <MessageSquare className="h-5 w-5" />,
        accent: 'sky' as const,
      },
      {
        title: 'Reviews',
        value: summary.reviewCount,
        helper: `${summary.averageRating}/5 average rating`,
        icon: <Star className="h-5 w-5" />,
        accent: 'rose' as const,
      },
      {
        title: 'Active Campaigns',
        value: summary.activeCampaigns,
        helper: 'Scheduled or running campaigns',
        icon: <Megaphone className="h-5 w-5" />,
        accent: 'indigo' as const,
      },
      {
        title: 'WhatsApp Automation',
        value: summary.whatsappAutomationCount,
        helper: 'Outgoing automation messages',
        icon: <MessageCircle className="h-5 w-5" />,
        accent: 'emerald' as const,
      },
    ],
    [summary]
  );

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-lg font-semibold text-red-800">Dashboard could not load</p>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button type="button" className="btn-primary mt-5" onClick={() => void loadDashboard()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-slate-950 px-5 py-6 text-white sm:px-6 lg:px-8">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-100">
                Hotel Growth Command Center
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Monitor bookings, revenue, occupancy, guest activity, reviews, and growth automation from one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20" onClick={() => void loadDashboard()}>
                <RefreshCw className="mr-2 inline h-4 w-4" />
                Refresh
              </button>
              <Link href="/bookings" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                Open Bookings
                <ArrowRight className="ml-2 inline h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <KpiCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Booking & Occupancy Overview" subtitle="Reservation volume and room utilization">
          <div className="space-y-3">
            <ProgressBar value={dashboard.occupancy.occupancyPercentage} />
            <MetricRow label="Confirmed Bookings" value={dashboard.bookingOverview.confirmedBookings} />
            <MetricRow label="Checked-in Guests" value={dashboard.bookingOverview.checkedInBookings} />
            <MetricRow label="Cancelled Bookings" value={dashboard.bookingOverview.cancelledBookings} />
            <MetricRow label="Available Rooms" value={dashboard.occupancy.availableRooms} />
          </div>
        </SectionCard>

        <SectionCard title="Revenue Snapshot" subtitle="Collected and pending revenue">
          <div className="space-y-3">
            <MetricRow label="Total Revenue" value={formatCurrency(dashboard.revenueOverview.totalRevenue)} />
            <MetricRow label="Payment Revenue" value={formatCurrency(dashboard.revenueOverview.paymentRevenue)} />
            <MetricRow label="Booking Paid Value" value={formatCurrency(dashboard.revenueOverview.bookingPaidRevenue)} />
            <MetricRow label="Pending Payments" value={formatCurrency(dashboard.revenueOverview.pendingPayments)} />
          </div>
        </SectionCard>

        <SectionCard title="Guest & Lead Activity" subtitle="CRM and lead pipeline health">
          <div className="space-y-3">
            <MetricRow label="Total Guests" value={dashboard.guestLeadActivity.totalGuests} />
            <MetricRow label="New Guests This Month" value={dashboard.guestLeadActivity.newGuestsThisMonth} />
            <MetricRow label="New Enquiries" value={dashboard.guestLeadActivity.newEnquiries} />
            <MetricRow label="Pending Follow-ups" value={dashboard.guestLeadActivity.pendingFollowUps} />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Reviews & Reputation" subtitle="Guest sentiment and Google review readiness">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5">
            <div>
              <p className="text-sm font-medium text-amber-700">Average Rating</p>
              <p className="mt-1 text-4xl font-bold text-slate-950">{dashboard.reputation.averageRating || '—'}</p>
              <p className="mt-1 text-sm text-slate-500">{dashboard.reputation.reviewCount} reviews collected</p>
            </div>
            <Star className="h-14 w-14 text-amber-500" />
          </div>
        </SectionCard>

        <SectionCard title="Quick Actions" subtitle="Jump into high-impact workflows">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { href: '/bookings', label: 'Create Booking', icon: <Plus className="h-4 w-4" /> },
              { href: '/guests', label: 'Add Guest', icon: <Users className="h-4 w-4" /> },
              { href: '/enquiries', label: 'Capture Lead', icon: <MessageSquare className="h-4 w-4" /> },
              { href: '/campaigns', label: 'Plan Campaign', icon: <Megaphone className="h-4 w-4" /> },
              { href: '/payments', label: 'Record Payment', icon: <WalletCards className="h-4 w-4" /> },
              { href: '/whatsapp', label: 'WhatsApp Automation', icon: <MessageCircle className="h-4 w-4" /> },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <span className="flex items-center gap-2">{action.icon}{action.label}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard
          title="Recent Bookings"
          subtitle="Latest reservations coming into the hotel"
          action={<Link href="/bookings" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all</Link>}
        >
          {dashboard.recentBookings.length === 0 ? (
            <TableEmpty label="No recent bookings yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">Booking</th>
                    <th className="px-3 py-2">Guest</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.recentBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                        <div>{booking.bookingNumber}</div>
                        <div className="text-xs font-normal text-slate-500">{formatDate(booking.checkInDate)}</div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">{booking.guestName}</td>
                      <td className="px-3 py-3"><StatusPill status={booking.status} /></td>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">{formatCurrency(booking.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recent Enquiries"
          subtitle="Fresh leads that need quick response"
          action={<Link href="/enquiries" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View all</Link>}
        >
          {dashboard.recentEnquiries.length === 0 ? (
            <TableEmpty label="No recent enquiries yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">Lead</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.recentEnquiries.map((enquiry) => (
                    <tr key={enquiry.id}>
                      <td className="px-3 py-3 text-sm font-semibold text-slate-900">
                        <div>{enquiry.guestName}</div>
                        <div className="text-xs font-normal text-slate-500">{enquiry.phone}</div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">{capitalize(enquiry.source)}</td>
                      <td className="px-3 py-3"><StatusPill status={enquiry.status} /></td>
                      <td className="px-3 py-3 text-sm text-slate-600">{enquiry.followUpDate ? formatDate(enquiry.followUpDate) : 'Not set'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
