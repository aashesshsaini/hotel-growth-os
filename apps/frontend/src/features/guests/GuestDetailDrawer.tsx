'use client';

import { Modal } from '@/components/Modal';
import type { Guest, GuestHistory } from '@/types';
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
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{getGuestDisplayName(guest)}</h3>
              <p className="text-sm text-slate-500">{guest.phone}{guest.email ? ` · ${guest.email}` : ''}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GuestBadges guest={guest} />
              <GuestStatusBadge guest={guest} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {guest.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {guest.notes && (
            <div>
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
