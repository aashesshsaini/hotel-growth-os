'use client';

import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { RoleBadge } from './RoleBadge';
import { STAFF_PERMISSIONS } from './constants';
import type { Staff } from '@/types';
import { formatDate, formatDateTime } from '@/utils/format';

interface StaffDetailModalProps {
  staff: Staff | null;
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
  onEdit: () => void;
  onPermissions: () => void;
  onStatusChange: () => void;
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export function StaffDetailModal({
  staff,
  isOpen,
  onClose,
  canManage,
  onEdit,
  onPermissions,
  onStatusChange,
}: StaffDetailModalProps) {
  if (!staff) return null;

  const name = staff.fullName || staff.name || '—';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Profile"
      size="xl"
      footer={
        canManage ? (
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onStatusChange}>
              Change Status
            </button>
            <button type="button" className="btn-secondary" onClick={onPermissions}>
              Manage Permissions
            </button>
            <button type="button" className="btn-primary" onClick={onEdit}>
              Edit Staff
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{name}</h3>
            <p className="text-sm text-slate-500">{staff.designation || staff.department || 'Staff Member'}</p>
          </div>
          <div className="flex gap-2">
            <RoleBadge role={staff.role} />
            <StatusBadge status={staff.status || (staff.isActive ? 'active' : 'inactive')} />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Basic Details</h4>
            <dl className="space-y-3">
              <DetailRow label="Email" value={staff.email} />
              <DetailRow label="Phone" value={staff.phone} />
              <DetailRow label="Alternate Phone" value={staff.alternatePhone} />
              <DetailRow label="Gender" value={staff.gender?.replace(/_/g, ' ')} />
              <DetailRow label="Joining Date" value={formatDate(staff.joiningDate)} />
              <DetailRow label="Last Login" value={staff.lastLoginAt ? formatDateTime(staff.lastLoginAt) : 'Never'} />
            </dl>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Job Details</h4>
            <dl className="space-y-3">
              <DetailRow label="Department" value={staff.department} />
              <DetailRow label="Designation" value={staff.designation} />
              {staff.salary !== undefined && <DetailRow label="Salary" value={`₹${staff.salary.toLocaleString('en-IN')}`} />}
            </dl>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Shift Details</h4>
            <dl className="space-y-3">
              <DetailRow label="Shift Type" value={staff.shiftType} />
              <DetailRow label="Shift Hours" value={
                staff.shiftStartTime && staff.shiftEndTime
                  ? `${staff.shiftStartTime} – ${staff.shiftEndTime}`
                  : undefined
              } />
            </dl>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Emergency Contact</h4>
            <dl className="space-y-3">
              <DetailRow label="Name" value={staff.emergencyContactName} />
              <DetailRow label="Phone" value={staff.emergencyContactPhone} />
              <DetailRow label="Address" value={staff.address} />
            </dl>
          </section>
        </div>

        {staff.permissions && staff.permissions.length > 0 && (
          <section>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Permissions</h4>
            <div className="flex flex-wrap gap-2">
              {staff.permissions.map((perm) => (
                <span key={perm} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  {STAFF_PERMISSIONS.find((p) => p.key === perm)?.label || perm}
                </span>
              ))}
            </div>
          </section>
        )}

        {staff.auditLogs && staff.auditLogs.length > 0 && (
          <section>
            <h4 className="mb-3 text-sm font-semibold text-slate-900">Recent Activity</h4>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {staff.auditLogs.map((log) => (
                <li key={log._id} className="px-4 py-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-slate-800">{log.action.replace(/\./g, ' ')}</span>
                    <span className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</span>
                  </div>
                  {log.userId?.name && (
                    <p className="mt-0.5 text-xs text-slate-500">by {log.userId.name}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
