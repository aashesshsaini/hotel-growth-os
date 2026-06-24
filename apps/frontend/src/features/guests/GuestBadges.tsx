'use client';

import { capitalize } from '@/utils/format';
import type { Guest } from '@/types';

export const GuestTypeBadge = ({ type }: { type?: string }) => {
  if (!type) return null;
  const colors: Record<string, string> = {
    individual: 'bg-slate-100 text-slate-700',
    family: 'bg-blue-100 text-blue-700',
    corporate: 'bg-indigo-100 text-indigo-700',
    event_guest: 'bg-purple-100 text-purple-700',
    walk_in: 'bg-amber-100 text-amber-700',
    ota_guest: 'bg-orange-100 text-orange-700',
    vip: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] ?? 'bg-slate-100 text-slate-700'}`}>
      {capitalize(type)}
    </span>
  );
};

export const GuestStatusBadge = ({ guest }: { guest: Guest }) => {
  if (guest.isBlacklisted) {
    return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Blacklisted</span>;
  }
  return <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>;
};

export const VipBadge = () => (
  <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">VIP</span>
);

export const RepeatGuestBadge = () => (
  <span className="inline-flex rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">Repeat</span>
);

export const GuestBadges = ({ guest }: { guest: Guest }) => (
  <div className="flex flex-wrap gap-1">
    {guest.isVip && <VipBadge />}
    {guest.isRepeatGuest && <RepeatGuestBadge />}
    <GuestTypeBadge type={guest.guestType} />
  </div>
);
