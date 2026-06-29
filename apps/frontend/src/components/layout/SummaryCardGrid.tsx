'use client';

import type { ReactNode } from 'react';
import { LoadingState } from './LoadingState';

interface SummaryCardGridProps {
  children: ReactNode;
  isLoading?: boolean;
  count?: number;
  columns?: 2 | 3 | 4;
}

export function SummaryCardGrid({ children, isLoading, count = 4, columns = 4 }: SummaryCardGridProps) {
  const columnsClass =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-4';

  if (isLoading) return <LoadingState variant="cards" count={count} />;

  return <div className={`grid gap-4 ${columnsClass}`}>{children}</div>;
}
