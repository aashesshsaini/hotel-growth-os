'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { STAFF_PERMISSIONS } from './constants';

interface StaffPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: string[];
  onSave: (permissions: string[]) => Promise<void>;
  isSaving: boolean;
}

export function StaffPermissionsModal({
  isOpen,
  onClose,
  permissions,
  onSave,
  isSaving,
}: StaffPermissionsModalProps) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelected([...permissions]);
    }
  }, [isOpen, permissions]);

  const toggle = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Permissions"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void onSave(selected)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-slate-600">
        Select which modules this staff member can access.
      </p>
      <div className="space-y-2">
        {STAFF_PERMISSIONS.map((perm) => (
          <label
            key={perm.key}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 transition hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={selected.includes(perm.key)}
              onChange={() => toggle(perm.key)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-slate-800">{perm.label}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
