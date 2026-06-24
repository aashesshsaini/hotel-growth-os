'use client';

import { MAINT_COLORS, MAINTENANCE_STATUSES } from './constants';
import { capitalize } from '@/utils/format';

export const MaintenanceStatusBadge = ({ status }: { status?: string }) => {
  const value = status || 'none';
  const label = MAINTENANCE_STATUSES.find((s) => s.value === value)?.label || capitalize(value);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${MAINT_COLORS[value] || 'bg-slate-100 text-slate-700'}`}>
      {label}
    </span>
  );
};
