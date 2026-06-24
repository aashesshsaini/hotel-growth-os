'use client';

import { FormInput } from '@/components/FormInput';
import type { Guest } from '@/types';
import { getEntityId } from '@/types';
import { getGuestDisplayName } from './constants';

interface MergeGuestModalProps {
  primaryGuest: Guest | null;
  guests: Guest[];
  duplicateId: string;
  onDuplicateChange: (id: string) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const MergeGuestModal = ({
  primaryGuest,
  guests,
  duplicateId,
  onDuplicateChange,
  onConfirm,
  isLoading,
}: MergeGuestModalProps) => (
  <div className="space-y-4">
    <p className="text-sm text-slate-600">
      Merge a duplicate profile into <strong>{primaryGuest ? getGuestDisplayName(primaryGuest) : 'primary guest'}</strong>.
      Bookings, payments, reviews, and campaigns will move to the primary guest.
    </p>
    <FormInput
      label="Duplicate Guest ID"
      list="guest-options"
      value={duplicateId}
      onChange={(e) => onDuplicateChange(e.target.value)}
      placeholder="Select or paste guest ID"
    />
    <datalist id="guest-options">
      {guests
        .filter((g) => primaryGuest && getEntityId(g) !== getEntityId(primaryGuest))
        .map((g) => (
          <option key={getEntityId(g)} value={getEntityId(g)}>
            {getGuestDisplayName(g)} · {g.phone}
          </option>
        ))}
    </datalist>
    <button type="button" className="btn-primary w-full" onClick={onConfirm} disabled={!duplicateId || isLoading}>
      {isLoading ? 'Merging...' : 'Merge Guests'}
    </button>
  </div>
);
