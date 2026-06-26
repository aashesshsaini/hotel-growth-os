import type { EventPipelineColumn } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { getEventTypeLabel, getStatusLabel, STATUS_COLORS } from './constants';

interface PipelineBoardProps {
  columns: EventPipelineColumn[];
  isLoading?: boolean;
  onSelect: (id: string) => void;
}

export function PipelineBoard({ columns, isLoading, onSelect }: PipelineBoardProps) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-w-[280px] animate-pulse rounded-3xl bg-slate-100 p-4 h-96" />
        ))}
      </div>
    );
  }

  const visibleStages = ['new', 'proposal_sent', 'site_visit_scheduled', 'negotiation', 'confirmed', 'converted'];

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.filter((col) => col.count > 0 || visibleStages.includes(col.status)).map((column) => (
        <div key={column.status} className="min-w-[280px] max-w-[320px] shrink-0 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">{column.label}</h3>
              <p className="text-xs text-slate-500">{column.count} events · {formatCurrency(column.value)}</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{column.count}</span>
          </div>
          <div className="space-y-3 max-h-[520px] overflow-y-auto">
            {column.events.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">No events</p>
            ) : (
              column.events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelect(event.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-rose-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{event.eventName}</p>
                      <p className="text-xs text-slate-500">{event.eventNumber}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${event.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : event.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {event.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{getEventTypeLabel(event.eventType)} · {event.guestCount} guests</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{formatCurrency(event.totalValue)}</span>
                    {event.eventDate && <span>{formatDate(event.eventDate)}</span>}
                  </div>
                  {event.assignedToName && <p className="mt-1 text-xs text-rose-600">{event.assignedToName}</p>}
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_COLORS[status] || STATUS_COLORS.new;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {getStatusLabel(status)}
    </span>
  );
}
