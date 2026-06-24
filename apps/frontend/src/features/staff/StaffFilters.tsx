'use client';

import { RotateCcw } from 'lucide-react';
import { SelectInput } from '@/components/FormInput';
import { STAFF_ROLES, STAFF_STATUSES, SHIFT_TYPES } from './constants';

interface StaffFiltersProps {
  role: string;
  department: string;
  status: string;
  shiftType: string;
  joiningDateFrom: string;
  joiningDateTo: string;
  departments: string[];
  onRoleChange: (v: string) => void;
  onDepartmentChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onShiftChange: (v: string) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onReset: () => void;
}

export function StaffFilters({
  role,
  department,
  status,
  shiftType,
  joiningDateFrom,
  joiningDateTo,
  departments,
  onRoleChange,
  onDepartmentChange,
  onStatusChange,
  onShiftChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: StaffFiltersProps) {
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <SelectInput
          label="Role"
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          options={[{ value: '', label: 'All roles' }, ...STAFF_ROLES]}
          className="!w-40"
        />
        <SelectInput
          label="Department"
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
          options={[
            { value: '', label: 'All departments' },
            ...departments.map((d) => ({ value: d, label: d })),
          ]}
          className="!w-44"
        />
        <SelectInput
          label="Status"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          options={[{ value: '', label: 'All statuses' }, ...STAFF_STATUSES]}
          className="!w-36"
        />
        <SelectInput
          label="Shift"
          value={shiftType}
          onChange={(e) => onShiftChange(e.target.value)}
          options={[{ value: '', label: 'All shifts' }, ...SHIFT_TYPES]}
          className="!w-36"
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Joined From</label>
          <input
            type="date"
            value={joiningDateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="input-field !w-36"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Joined To</label>
          <input
            type="date"
            value={joiningDateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="input-field !w-36"
          />
        </div>
        <button type="button" onClick={onReset} className="btn-secondary !py-2">
          <RotateCcw className="mr-1.5 inline h-4 w-4" />
          Reset
        </button>
      </div>
    </div>
  );
}
