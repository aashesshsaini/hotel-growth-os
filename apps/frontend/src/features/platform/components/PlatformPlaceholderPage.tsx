'use client';

import { ArrowRight, Construction } from 'lucide-react';
import { ModulePageLayout, StatCard, SummaryCardGrid } from '@/components/layout';
import { PlatformOnly } from '@/components/PlatformOnly';

interface PlatformPlaceholderPageProps {
  title: string;
  subtitle: string;
  focus: string[];
}

export function PlatformPlaceholderPage({ title, subtitle, focus }: PlatformPlaceholderPageProps) {
  return (
    <PlatformOnly>
      <ModulePageLayout title={title} subtitle={subtitle}>
        <SummaryCardGrid columns={3}>
          <StatCard title="Module Status" value="Future Ready" helper="Navigation and architecture reserved" icon={<Construction className="h-5 w-5" />} accent="bg-indigo-50 text-indigo-700" />
          <StatCard title="Product Surface" value="Platform" helper="Hidden from Hotel Portal navigation" />
          <StatCard title="API Contract" value="Pending" helper="No hotel APIs are reused for this module" />
        </SummaryCardGrid>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Planned Scope</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {focus.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                <ArrowRight className="h-4 w-4 text-indigo-600" />
                {item}
              </div>
            ))}
          </div>
        </section>
      </ModulePageLayout>
    </PlatformOnly>
  );
}
