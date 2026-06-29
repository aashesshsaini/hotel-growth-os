'use client';

import { StatusBadge } from '@/components/StatusBadge';

export function PlatformStatusPill({ status }: { status: string }) {
  return <StatusBadge status={status.replace(/_/g, ' ')} />;
}
