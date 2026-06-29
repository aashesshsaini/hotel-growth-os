'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function PlatformOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== 'super_admin') {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
        <h1 className="mt-4 text-xl font-bold text-red-900">Platform access only</h1>
        <p className="mt-2 text-sm text-red-700">This page belongs to the SaaS Platform Console.</p>
        <Link href="/dashboard" className="btn-primary mt-5">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
