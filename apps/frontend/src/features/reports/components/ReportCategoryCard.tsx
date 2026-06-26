import type { LucideIcon } from 'lucide-react';
import type { ReportCategorySummary } from '@/types';
import { CATEGORY_ICONS, CATEGORY_TONES } from '../constants';

const toneClasses = {
  indigo: 'from-indigo-500 to-blue-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-600',
  violet: 'from-violet-500 to-purple-600',
  rose: 'from-rose-500 to-red-600',
  sky: 'from-sky-500 to-cyan-600',
};

interface ReportCategoryCardProps {
  category: ReportCategorySummary;
  active?: boolean;
  onSelect: (id: string) => void;
}

export function ReportCategoryCard({ category, active, onSelect }: ReportCategoryCardProps) {
  const Icon = CATEGORY_ICONS[category.id];
  const tone = CATEGORY_TONES[category.id];

  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      className={`rounded-3xl border p-5 text-left transition shadow-sm ${
        active
          ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200'
          : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{category.metricLabel}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{category.metric}</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{category.title}</p>
          <p className="mt-1 text-xs text-slate-500">{category.description}</p>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br ${toneClasses[tone]} p-3 text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {category.recordCount} records in range
      </p>
    </button>
  );
}

interface QuickReportButtonProps {
  label: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

export function QuickReportButton({ label, description, icon: Icon, onClick }: QuickReportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
    >
      <div className="rounded-xl bg-white p-2 text-indigo-600 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </button>
  );
}
