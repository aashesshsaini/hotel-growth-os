import type { CalendarEvent } from '@/types';
import { AlertTriangle } from 'lucide-react';

export function ConflictAlert({ events }: { events: CalendarEvent[] }) {
  const conflicts = events.filter((event) => event.hasConflict);
  if (conflicts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div>
          <p className="text-sm font-semibold text-rose-800">
            {conflicts.length} booking conflict{conflicts.length > 1 ? 's' : ''} detected
          </p>
          <p className="mt-1 text-sm text-rose-700">
            {conflicts.slice(0, 3).map((event) => `${event.bookingNumber} (${event.guestName})`).join(' · ')}
            {conflicts.length > 3 ? ` · +${conflicts.length - 3} more` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
