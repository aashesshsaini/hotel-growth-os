'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  CalendarClock,
  Download,
  FileBarChart2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { FormInput, SelectInput } from '@/components/FormInput';
import { PageHeader } from '@/components/PageHeader';
import { useToast } from '@/components/Toast';
import { QuickReportButton, ReportCategoryCard } from '@/features/reports/components/ReportCategoryCard';
import { ReportPreviewTable, ReportSummaryStrip } from '@/features/reports/components/ReportPreviewTable';
import {
  CATEGORY_ICONS,
  EXPORT_FORMATS,
  EXPORT_HISTORY_STORAGE_KEY,
  QUICK_REPORTS,
  REPORT_PERIODS,
  SAVED_REPORTS_STORAGE_KEY,
  type ExportHistoryItem,
  type SavedReportItem,
} from '@/features/reports/constants';
import {
  exportCategoryReport,
  getCategoryReport,
  getReportsSummary,
} from '@/services/reports.service';
import type { CategoryReport, ReportCategory, ReportsSummary } from '@/types';
import { formatCurrency, formatDateTime } from '@/utils/format';

const emptySummary: ReportsSummary = {
  generatedAt: '',
  dateRange: { from: '', to: '', period: 'this_month' },
  categories: [],
};

const emptyReport: CategoryReport = {
  category: 'bookings',
  title: 'Report Preview',
  description: '',
  generatedAt: '',
  dateRange: { from: '', to: '', period: 'this_month' },
  summary: {},
  columns: [],
  rows: [],
  totalRows: 0,
};

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function downloadExport(result: { filename: string; contentType: string; data: string }) {
  const blob = new Blob([result.data], { type: result.contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  if (result.contentType === 'text/html') {
    link.target = '_blank';
  }
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState('this_month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('revenue');
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [summary, setSummary] = useState<ReportsSummary>(emptySummary);
  const [report, setReport] = useState<CategoryReport>(emptyReport);
  const [savedReports, setSavedReports] = useState<SavedReportItem[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(
    () => ({
      period,
      fromDate: period === 'custom' && fromDate ? fromDate : undefined,
      toDate: period === 'custom' && toDate ? toDate : undefined,
      search: search.trim() || undefined,
    }),
    [period, fromDate, toDate, search]
  );

  useEffect(() => {
    setSavedReports(readStorage(SAVED_REPORTS_STORAGE_KEY, []));
    setExportHistory(readStorage(EXPORT_HISTORY_STORAGE_KEY, []));
  }, []);

  const loadSummary = useCallback(async () => {
    setIsSummaryLoading(true);
    setError(null);
    try {
      setSummary(await getReportsSummary(queryParams));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report summary');
      setSummary(emptySummary);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [queryParams]);

  const loadReport = useCallback(async () => {
    setIsReportLoading(true);
    try {
      setReport(await getCategoryReport(selectedCategory, queryParams));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report preview');
      setReport({ ...emptyReport, category: selectedCategory });
    } finally {
      setIsReportLoading(false);
    }
  }, [selectedCategory, queryParams]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportCategoryReport(selectedCategory, { ...queryParams, format: exportFormat });
      downloadExport(result);
      const nextHistory: ExportHistoryItem[] = [
        {
          id: crypto.randomUUID(),
          category: selectedCategory,
          format: exportFormat,
          filename: result.filename,
          exportedAt: new Date().toISOString(),
        },
        ...exportHistory.slice(0, 9),
      ];
      setExportHistory(nextHistory);
      writeStorage(EXPORT_HISTORY_STORAGE_KEY, nextHistory);
      showToast('Report exported successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveReport = () => {
    const label = summary.categories.find((item) => item.id === selectedCategory)?.title || report.title;
    const item: SavedReportItem = {
      id: crypto.randomUUID(),
      category: selectedCategory,
      label,
      period,
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...savedReports.filter((saved) => saved.category !== selectedCategory || saved.period !== period)].slice(0, 8);
    setSavedReports(next);
    writeStorage(SAVED_REPORTS_STORAGE_KEY, next);
    showToast('Report view saved', 'success');
  };

  const applySavedReport = (item: SavedReportItem) => {
    setSelectedCategory(item.category);
    setPeriod(item.period);
  };

  const selectedMetric = summary.categories.find((item) => item.id === selectedCategory);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-900 to-violet-800 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">Reports Center</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Enterprise Business Reporting</h1>
            <p className="mt-3 max-w-2xl text-sm text-indigo-100 sm:text-base">
              Consolidated hotel performance reports across bookings, revenue, operations, marketing, and staff — with export-ready previews.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/analytics"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              View Analytics
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                void loadSummary();
                void loadReport();
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <PageHeader
        title="Report Filters"
        subtitle="Choose a period, search within the preview, and export in your preferred format."
      />

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end">
        <SelectInput label="Period" value={period} onChange={(event) => setPeriod(event.target.value)} options={REPORT_PERIODS} />
        {period === 'custom' && (
          <>
            <FormInput label="From" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <FormInput label="To" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </>
        )}
        <FormInput
          label="Search preview"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search rows..."
        />
        <SelectInput label="Export format" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as 'csv' | 'excel' | 'pdf')} options={EXPORT_FORMATS} />
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isExporting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export Report'}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Report Categories</h2>
          <p className="text-sm text-slate-500">
            {summary.generatedAt ? `Updated ${formatDateTime(summary.generatedAt)}` : 'Loading summary...'}
          </p>
        </div>
        {isSummaryLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : summary.categories.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <FileBarChart2 className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No report categories available</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summary.categories.map((category) => (
              <ReportCategoryCard
                key={category.id}
                category={{
                  ...category,
                  metric:
                    category.id === 'revenue' || category.id === 'payments'
                      ? formatCurrency(Number(category.metric))
                      : category.metric,
                }}
                active={selectedCategory === category.id}
                onSelect={(id) => setSelectedCategory(id as ReportCategory)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Quick Reports</h2>
              <p className="text-sm text-slate-500">One-click shortcuts for the most requested hotel reports.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUICK_REPORTS.map((item) => (
              <QuickReportButton
                key={item.category}
                label={item.label}
                description={item.description}
                icon={CATEGORY_ICONS[item.category]}
                onClick={() => setSelectedCategory(item.category)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Saved Reports</h2>
              <p className="text-sm text-slate-500">Pin frequently used report views on this device.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveReport}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Bookmark className="h-4 w-4" />
              Save current
            </button>
          </div>
          {savedReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No saved reports yet.
            </div>
          ) : (
            <div className="space-y-2">
              {savedReports.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applySavedReport(item)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{REPORT_PERIODS.find((p) => p.value === item.period)?.label || item.period}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{report.title || selectedMetric?.title || 'Report Preview'}</h2>
            <p className="text-sm text-slate-500">{report.description || selectedMetric?.description}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {report.dateRange.from && report.dateRange.to
              ? `${new Date(report.dateRange.from).toLocaleDateString()} - ${new Date(report.dateRange.to).toLocaleDateString()}`
              : 'Date range pending'}
          </div>
        </div>

        {!isReportLoading && report.summary && Object.keys(report.summary).length > 0 && (
          <div className="mb-5">
            <ReportSummaryStrip report={report} />
          </div>
        )}

        <ReportPreviewTable report={report} isLoading={isReportLoading} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Download className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Recent Exports</h2>
          </div>
          {exportHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Export a report to build your download history.
            </div>
          ) : (
            <div className="space-y-2">
              {exportHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.filename}</p>
                    <p className="text-xs text-slate-500">
                      {item.category} · {item.format.toUpperCase()} · {formatDateTime(item.exportedAt)}
                    </p>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setExportHistory([]);
                  writeStorage(EXPORT_HISTORY_STORAGE_KEY, []);
                }}
                className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear history
              </button>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/60 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Scheduled Reports</h2>
          </div>
          <p className="text-sm text-slate-600">
            Automated email delivery and recurring report schedules are planned for a future release. The export engine is already modular for scheduled jobs.
          </p>
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-500">
            Placeholder: daily revenue digest, weekly occupancy summary, monthly owner pack.
          </div>
        </section>
      </div>
    </div>
  );
}
