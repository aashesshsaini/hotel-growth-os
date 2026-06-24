'use client';

import { STATUS_COLORS, ROOM_STATUSES } from './constants';
import { capitalize } from '@/utils/format';

export const RoomStatusBadge = ({ status }: { status?: string }) => {
  const value = status || 'available';
  const label = ROOM_STATUSES.find((s) => s.value === value)?.label || capitalize(value);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[value] || 'bg-slate-100 text-slate-700'}`}>
      {label}
    </span>
  );
};
