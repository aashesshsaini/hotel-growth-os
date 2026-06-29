'use client';

import { capitalize } from '@/utils/format';

const getTone = (status: string) => {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  if (['active', 'available', 'confirmed', 'completed', 'paid', 'delivered', 'converted', 'checked_in', 'checked_out', 'professional', 'enterprise', 'resolved', 'closed', 'low', 'healthy'].includes(normalized)) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (['pending', 'new', 'draft', 'scheduled', 'in_progress', 'partially_paid', 'contacted', 'interested', 'trial', 'starter', 'growth', 'medium', 'open', 'reopened', 'degraded', 'slow', 'acknowledged'].includes(normalized)) {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
  if (['cancelled', 'failed', 'lost', 'refunded', 'inactive', 'blocked', 'urgent', 'no_show', 'blacklisted', 'expired', 'suspended', 'outage', 'down', 'critical'].includes(normalized)) {
    return 'bg-red-50 text-red-700 ring-red-200';
  }
  if (['running', 'proposal_sent', 'negotiation', 'high', 'technical', 'billing', 'subscription'].includes(normalized)) {
    return 'bg-blue-50 text-blue-700 ring-blue-200';
  }
  return 'bg-slate-100 text-slate-700 ring-slate-200';
};

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getTone(status)}`}>
      {capitalize(status.replace(/_/g, ' '))}
    </span>
  );
}
