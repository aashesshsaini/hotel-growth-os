'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, CalendarClock, DoorOpen, Globe2, Mail, Phone, ShieldCheck, Users, WalletCards } from 'lucide-react';
import { LoadingState, ModulePageLayout, StatCard, SummaryCardGrid } from '@/components/layout';
import { PlatformOnly } from '@/components/PlatformOnly';
import { StatusBadge } from '@/components/StatusBadge';
import { getPlatformHotel, type PlatformHotelDetails } from '@/services/platform.service';
import { formatDate } from '@/utils/format';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value || '—'}</div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function HotelDetailsPage() {
  const params = useParams<{ id: string }>();
  const [hotel, setHotel] = useState<PlatformHotelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlatformHotel(params.id)
      .then(setHotel)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load hotel'))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <PlatformOnly>
      <ModulePageLayout
        title={hotel?.name || 'Hotel Details'}
        subtitle="Tenant profile, owner access, subscription, operations summary, audit, and future-ready platform data."
        actions={<Link href="/hotels" className="btn-secondary"><ArrowLeft className="mr-2 h-4 w-4" />Back to Hotels</Link>}
      >
        {loading ? (
          <LoadingState variant="page" />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : hotel ? (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-xl font-bold">
                      {hotel.logo ? <img src={hotel.logo} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : hotel.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">SaaS Tenant</p>
                      <h1 className="mt-1 text-3xl font-bold">{hotel.name}</h1>
                      <p className="mt-1 text-sm text-indigo-100">{hotel.city}, {hotel.country} · {hotel.timezone} · {hotel.currency}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={hotel.plan} />
                    <StatusBadge status={hotel.billingType} />
                    <StatusBadge status={hotel.status} />
                  </div>
                </div>
              </div>
            </section>

            <SummaryCardGrid columns={4}>
              <StatCard title="Active Staff" value={hotel.totalStaff} helper="Active platform users/staff" icon={<Users className="h-5 w-5" />} />
              <StatCard title="Rooms" value={hotel.totalRooms} helper={`${hotel.currentOccupancy}% occupancy ready`} icon={<DoorOpen className="h-5 w-5" />} />
              <StatCard title="Health Score" value={`${hotel.healthScore}%`} helper="Future-ready tenant score" icon={<ShieldCheck className="h-5 w-5" />} />
              <StatCard title="Renewal" value={hotel.renewalDate ? formatDate(hotel.renewalDate) : '—'} helper={hotel.subscriptionStatus} icon={<CalendarClock className="h-5 w-5" />} />
            </SummaryCardGrid>

            <div className="grid gap-5 xl:grid-cols-3">
              <Section title="Overview" subtitle="Core tenant identity">
                <div className="grid gap-3">
                  <InfoRow label="Hotel Name" value={hotel.name} />
                  <InfoRow label="Slug" value={hotel.slug} />
                  <InfoRow label="Created" value={hotel.createdAt ? formatDate(hotel.createdAt) : '—'} />
                  <InfoRow label="Last Login" value={hotel.lastLoginAt ? formatDate(hotel.lastLoginAt) : '—'} />
                </div>
              </Section>

              <Section title="Owner" subtitle="Primary tenant owner">
                <div className="grid gap-3">
                  <InfoRow label="Owner Name" value={hotel.owner} />
                  <InfoRow label="Email" value={<span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{hotel.ownerEmail || '—'}</span>} />
                  <InfoRow label="Phone" value={<span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{hotel.ownerPhone || '—'}</span>} />
                </div>
              </Section>

              <Section title="Subscription" subtitle="Plan and lifecycle">
                <div className="grid gap-3">
                  <InfoRow label="Plan" value={<StatusBadge status={hotel.plan} />} />
                  <InfoRow label="Billing Type" value={<StatusBadge status={hotel.billingType} />} />
                  <InfoRow label="Status" value={<StatusBadge status={hotel.subscriptionStatus} />} />
                  <InfoRow label="Renewal Date" value={hotel.renewalDate ? formatDate(hotel.renewalDate) : '—'} />
                </div>
              </Section>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Section title="Business Info" subtitle="Future-ready grouping metadata">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Brand" value={hotel.businessInfo.brandName || hotel.name} />
                  <InfoRow label="Marketplace" value={hotel.businessInfo.marketplaceEnabled ? 'Enabled' : 'Disabled'} />
                  <InfoRow label="White Label" value={hotel.businessInfo.whiteLabelDomain || '—'} />
                  <InfoRow label="Amenities" value={hotel.businessInfo.amenities.length} />
                </div>
              </Section>

              <Section title="Contact" subtitle="Hotel business contact">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Email" value={hotel.email} />
                  <InfoRow label="Phone" value={hotel.phone} />
                  <InfoRow label="City" value={hotel.city} />
                  <InfoRow label="Country" value={<span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-slate-400" />{hotel.country}</span>} />
                </div>
              </Section>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Section title="Users" subtitle="Latest platform-visible tenant users">
                <div className="space-y-3">
                  {hotel.users.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No users found.</p>
                  ) : (
                    hotel.users.map((user) => (
                      <div key={user._id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email} · {user.role}</p>
                        </div>
                        <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                      </div>
                    ))
                  )}
                </div>
              </Section>

              <Section title="Rooms Summary" subtitle="Operational scale without hotel workflow changes">
                <div className="grid gap-3 sm:grid-cols-2">
                  {hotel.roomsSummary.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 sm:col-span-2">No rooms found.</p>
                  ) : (
                    hotel.roomsSummary.map((item) => <InfoRow key={item._id} label={item._id || 'unknown'} value={item.count} />)
                  )}
                </div>
              </Section>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Section title="Activity Timeline" subtitle="Recent platform and tenant audit events">
                <div className="space-y-3">
                  {hotel.activityTimeline.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No activity yet.</p>
                  ) : (
                    hotel.activityTimeline.map((item) => (
                      <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">{item.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-500">{item.actor} · {formatDate(item.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </Section>

              <Section title="Integrations" subtitle="Platform integration readiness">
                <div className="grid gap-3 sm:grid-cols-2">
                  {hotel.integrations.map((integration) => (
                    <InfoRow key={integration.name} label={integration.name} value={<StatusBadge status={integration.status} />} />
                  ))}
                </div>
              </Section>
            </div>

            <Section title="Future Ready Placeholders" subtitle="Reserved for deeper tenant intelligence without changing hotel portal modules">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {Object.keys(hotel.futureReady).map((key) => (
                  <div key={key} className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                    <Building2 className="mx-auto h-5 w-5 text-indigo-600" />
                    <p className="mt-2 text-sm font-semibold capitalize text-slate-900">{key}</p>
                    <p className="text-xs text-slate-500">Future ready</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        ) : null}
      </ModulePageLayout>
    </PlatformOnly>
  );
}
