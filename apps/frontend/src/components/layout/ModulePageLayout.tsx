'use client';

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';

interface ModulePageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  summary?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}

export function ModulePageLayout({
  title,
  subtitle,
  actions,
  summary,
  toolbar,
  children,
}: ModulePageLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {summary}
      {toolbar}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
