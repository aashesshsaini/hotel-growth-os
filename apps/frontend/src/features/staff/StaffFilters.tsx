'use client';

import { SelectInput } from '@/components/FormInput';
import { FilterPanel } from '@/components/layout';
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
  const activeCount = [role, department, status, shiftType, joiningDateFrom, joiningDateTo].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <FilterPanel
        title="More Filters"
        activeCount={activeCount}
        onReset={onReset}
        basicFilters={
          <>
            <div className="filter-field">
              <SelectInput
                label="Role"
                value={role}
                onChange={(e) => onRoleChange(e.target.value)}
                options={[{ value: '', label: 'All roles' }, ...STAFF_ROLES]}
              />
            </div>
            <div className="filter-field">
              <SelectInput
                label="Status"
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                options={[{ value: '', label: 'All statuses' }, ...STAFF_STATUSES]}
              />
            </div>
          </>
        }
      >
        <SelectInput
          label="Department"
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
          options={[
            { value: '', label: 'All departments' },
            ...departments.map((d) => ({ value: d, label: d })),
          ]}
        />
        <SelectInput
          label="Shift"
          value={shiftType}
          onChange={(e) => onShiftChange(e.target.value)}
          options={[{ value: '', label: 'All shifts' }, ...SHIFT_TYPES]}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Joined From</label>
          <input
            type="date"
            value={joiningDateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Joined To</label>
          <input
            type="date"
            value={joiningDateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="input-field"
          />
        </div>
      </FilterPanel>
    </div>
  );
}
