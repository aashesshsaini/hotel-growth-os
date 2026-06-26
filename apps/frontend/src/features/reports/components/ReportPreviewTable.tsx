import type { CategoryReport } from '@/types';
import { formatCurrency } from '@/utils/format';

interface ReportPreviewTableProps {
  report: CategoryReport;
  isLoading?: boolean;
}

function formatCell(value: unknown, key: string) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('spend') || key.toLowerCase().includes('revenue') || key.toLowerCase().includes('collected'))) {
    return formatCurrency(value);
  }
  return String(value);
}

export function ReportPreviewTable({ report, isLoading }: ReportPreviewTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (report.rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-slate-700">No records found for this report</p>
        <p className="mt-1 text-sm text-slate-500">Try adjusting the date range or choosing another category.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="bg-slate-50">
          <tr>
            {report.columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                  column.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {report.rows.map((row, index) => (
            <tr key={index} className="hover:bg-slate-50/80">
              {report.columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-sm text-slate-700 ${
                    column.align === 'right' ? 'text-right font-medium tabular-nums' : 'text-left'
                  }`}
                >
                  {formatCell(row[column.key], column.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {report.totalRows > report.rows.length && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Showing {report.rows.length} of {report.totalRows} records. Export to download the full report preview dataset.
        </div>
      )}
    </div>
  );
}

export function ReportSummaryStrip({ report }: { report: CategoryReport }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(report.summary).map(([key, value]) => (
        <div key={key} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {typeof value === 'number' && key.toLowerCase().includes('amount')
              ? formatCurrency(value)
              : String(value)}
          </p>
        </div>
      ))}
    </div>
  );
}
