'use client';

import { HK_COLORS, HOUSEKEEPING_STATUSES } from './constants';
import { capitalize } from '@/utils/format';

export const HousekeepingStatusBadge = ({ status }: { status?: string }) => {
  const value = status || 'clean';
  const label = HOUSEKEEPING_STATUSES.find((s) => s.value === value)?.label || capitalize(value);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${HK_COLORS[value] || 'bg-slate-100 text-slate-700'}`}>
      {label}
    </span>
  );
};
