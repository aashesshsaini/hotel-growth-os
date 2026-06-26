'use client';

import Link from 'next/link';
import { CalendarPlus, Clock, MessageCircle, Phone, Star } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { Guest, GuestHistory } from '@/types';
import { getEntityId } from '@/types';
import { formatCurrency, formatDate, capitalize } from '@/utils/format';
import { GuestBadges, GuestStatusBadge } from './GuestBadges';
import { GuestDocumentManager } from './GuestDocumentManager';
import { GuestHistoryTabs } from './GuestHistoryTabs';
import { getGuestDisplayName } from './constants';

interface GuestDetailDrawerProps {
  guest: Guest | null;
  history: GuestHistory | null;
  isOpen: boolean;
  isLoading: boolean;
  historyLoading: boolean;
  canManage: boolean;
  canCreate: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPreferences: () => void;
  onTags: () => void;
  onMerge: () => void;
  onBlacklist: () => void;
  onUnblock: () => void;
  onDelete: () => void;
  onDocumentUpload: (url: string, documentType: string) => Promise<void>;
  onDocumentRemove: (documentId: string) => Promise<void>;
}

function DetailRow({ label, value }: { label: string; value?: string | number | null | boolean }) {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{display}</dd>
    </div>
  );
}

const whatsappLink = (phone: string) => {
  const normalized = phone.replace(/\D/g, '');
  return normalized ? `https://wa.me/${normalized}` : '#';
};

export const GuestDetailDrawer = ({
  guest,
  history,
  isOpen,
  isLoading,
  historyLoading,
  canManage,
  canCreate,
  onClose,
  onEdit,
  onPreferences,
  onTags,
  onMerge,
  onBlacklist,
  onUnblock,
  onDelete,
  onDocumentUpload,
  onDocumentRemove,
}: GuestDetailDrawerProps) => {
  if (!guest && !isLoading) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guest Profile"
      size="xl"
      footer={
        guest ? (
          <div className="flex flex-wrap justify-end gap-2">
            {canCreate && <button type="button" className="btn-secondary" onClick={onPreferences}>Preferences</button>}
            {canCreate && <button type="button" className="btn-secondary" onClick={onTags}>Tags</button>}
            {canManage && <button type="button" className="btn-secondary" onClick={onMerge}>Merge</button>}
            {canManage && guest.isBlacklisted ? (
              <button type="button" className="btn-secondary" onClick={onUnblock}>Unblock</button>
            ) : canManage ? (
              <button type="button" className="btn-secondary text-red-600" onClick={onBlacklist}>Blacklist</button>
            ) : null}
            {canManage && <button type="button" className="btn-secondary text-red-600" onClick={onDelete}>Delete</button>}
            {canCreate && <button type="button" className="btn-primary" onClick={onEdit}>Edit Guest</button>}
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}</div>
      ) : guest ? (
        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-700 to-purple-700 p-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold ring-1 ring-white/20">
                  {getGuestDisplayName(guest).slice(0, 1).toUpperCase()}
                </div>
                <h3 className="mt-4 text-2xl font-semibold">{getGuestDisplayName(guest)}</h3>
                <p className="mt-1 text-sm text-indigo-100">{guest.phone}{guest.email ? ` · ${guest.email}` : ''}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/10 p-2 ring-1 ring-white/15">
                <GuestBadges guest={guest} />
                <GuestStatusBadge guest={guest} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <a href={`tel:${guest.phone}`} className="rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-semibold ring-1 ring-white/20 hover:bg-white/20">
                <Phone className="mr-2 inline h-4 w-4" />
                Call
              </a>
              <a href={whatsappLink(guest.phone)} target="_blank" rel="noreferrer" className="rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-semibold ring-1 ring-white/20 hover:bg-white/20">
                <MessageCircle className="mr-2 inline h-4 w-4" />
                WhatsApp
              </a>
              <Link href={`/bookings?guestId=${getEntityId(guest)}`} className="rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-semibold ring-1 ring-white/20 hover:bg-white/20">
                <CalendarPlus className="mr-2 inline h-4 w-4" />
                Booking
              </Link>
              <Link href={`/tasks?guestId=${getEntityId(guest)}`} className="rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-semibold ring-1 ring-white/20 hover:bg-white/20">
                <Clock className="mr-2 inline h-4 w-4" />
                Follow-up
              </Link>
              <Link href={`/reviews?guestId=${getEntityId(guest)}`} className="rounded-xl bg-white px-3 py-2 text-center text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                <Star className="mr-2 inline h-4 w-4" />
                Review
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="City" value={guest.city} />
            <DetailRow label="Guest Type" value={guest.guestType ? capitalize(guest.guestType) : undefined} />
            <DetailRow label="Source" value={guest.source ? capitalize(guest.source) : undefined} />
            <DetailRow label="Total Bookings" value={guest.totalBookings} />
            <DetailRow label="Total Spend" value={formatCurrency(guest.totalSpend ?? 0)} />
            <DetailRow label="Last Stay" value={formatDate(guest.lastStayDate ?? guest.lastVisitAt)} />
            <DetailRow label="Food Preference" value={guest.foodPreference ? capitalize(guest.foodPreference) : undefined} />
            <DetailRow label="Room Preference" value={guest.roomPreference} />
            <DetailRow label="Marketing Consent" value={guest.marketingConsent} />
            <DetailRow label="WhatsApp Consent" value={guest.whatsappConsent} />
            <DetailRow label="Email Consent" value={guest.emailConsent} />
          </div>

          {guest.tags && guest.tags.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {guest.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {guest.notes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-1 text-sm font-semibold text-slate-900">Notes</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{guest.notes}</p>
            </div>
          )}

          {canCreate && (
            <GuestDocumentManager
              guest={guest}
              canManage={canCreate}
              onUpload={onDocumentUpload}
              onRemove={onDocumentRemove}
            />
          )}

          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">History</h4>
            <GuestHistoryTabs history={history} isLoading={historyLoading} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
