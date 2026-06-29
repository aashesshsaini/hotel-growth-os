'use client';

import { LoadingSpinner } from '@/components/LoadingSpinner';

interface LoadingStateProps {
  variant?: 'inline' | 'table' | 'cards' | 'page';
  count?: number;
}

export function LoadingState({ variant = 'inline', count = 4 }: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }

  if (variant === 'page') {
    return (
      <div className="space-y-5">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
        <LoadingState variant="cards" count={4} />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-14">
        <LoadingSpinner />
      </div>
    );
  }

  return <LoadingSpinner />;
}
