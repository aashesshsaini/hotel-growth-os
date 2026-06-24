'use client';

import clsx from 'clsx';
import { capitalize } from '@/utils/format';
import { ROLE_COLORS } from './constants';

export function RoleBadge({ role }: { role: string }) {
  const style = ROLE_COLORS[role] || 'bg-slate-100 text-slate-700';
  return (
    <span className={clsx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', style)}>
      {capitalize(role.replace(/_/g, ' '))}
    </span>
  );
}
