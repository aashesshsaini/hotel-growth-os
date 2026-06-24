'use client';

import { StatusBadge } from '@/components/StatusBadge';

export const RoomTypeStatusBadge = ({ status }: { status?: string }) => {
  const normalized = status || 'active';
  return <StatusBadge status={normalized} />;
};
