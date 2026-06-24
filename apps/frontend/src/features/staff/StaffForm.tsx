'use client';

import { FormInput, SelectInput, TextArea } from '@/components/FormInput';
import { STAFF_ROLES, STAFF_STATUSES, SHIFT_TYPES, GENDERS } from './constants';
import type { StaffFormData } from '@/types';

interface StaffFormProps {
  form: StaffFormData;
  errors: Record<string, string>;
  isEdit?: boolean;
  onChange: (field: keyof StaffFormData, value: string | number | undefined) => void;
}

export function StaffForm({ form, errors, isEdit = false, onChange }: StaffFormProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {errors.form && (
        <div className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>
      )}

      <FormInput
        label="Full Name"
        value={form.fullName}
        onChange={(e) => onChange('fullName', e.target.value)}
        error={errors.fullName}
        required
      />
      <FormInput
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => onChange('email', e.target.value)}
        error={errors.email}
        required
        disabled={isEdit}
      />
      <FormInput
        label="Phone"
        value={form.phone}
        onChange={(e) => onChange('phone', e.target.value)}
        error={errors.phone}
        required
      />
      <FormInput
        label="Alternate Phone"
        value={form.alternatePhone || ''}
        onChange={(e) => onChange('alternatePhone', e.target.value)}
      />
      <SelectInput
        label="Role"
        value={form.role}
        onChange={(e) => onChange('role', e.target.value)}
        options={STAFF_ROLES}
        error={errors.role}
      />
      <SelectInput
        label="Status"
        value={form.status || 'active'}
        onChange={(e) => onChange('status', e.target.value)}
        options={STAFF_STATUSES}
      />
      <FormInput
        label="Department"
        value={form.department || ''}
        onChange={(e) => onChange('department', e.target.value)}
      />
      <FormInput
        label="Designation"
        value={form.designation || ''}
        onChange={(e) => onChange('designation', e.target.value)}
      />
      <SelectInput
        label="Gender"
        value={form.gender || ''}
        onChange={(e) => onChange('gender', e.target.value)}
        options={[{ value: '', label: 'Select gender' }, ...GENDERS]}
      />
      <FormInput
        label="Joining Date"
        type="date"
        value={form.joiningDate || ''}
        onChange={(e) => onChange('joiningDate', e.target.value)}
      />
      <SelectInput
        label="Shift Type"
        value={form.shiftType || ''}
        onChange={(e) => onChange('shiftType', e.target.value)}
        options={SHIFT_TYPES}
      />
      <FormInput
        label="Shift Start"
        type="time"
        value={form.shiftStartTime || ''}
        onChange={(e) => onChange('shiftStartTime', e.target.value)}
      />
      <FormInput
        label="Shift End"
        type="time"
        value={form.shiftEndTime || ''}
        onChange={(e) => onChange('shiftEndTime', e.target.value)}
      />
      <FormInput
        label="Salary (INR)"
        type="number"
        value={form.salary?.toString() || ''}
        onChange={(e) => onChange('salary', e.target.value ? Number(e.target.value) : undefined)}
      />
      <FormInput
        label="Emergency Contact Name"
        value={form.emergencyContactName || ''}
        onChange={(e) => onChange('emergencyContactName', e.target.value)}
      />
      <FormInput
        label="Emergency Contact Phone"
        value={form.emergencyContactPhone || ''}
        onChange={(e) => onChange('emergencyContactPhone', e.target.value)}
      />
      <div className="sm:col-span-2">
        <FormInput
          label="Address"
          value={form.address || ''}
          onChange={(e) => onChange('address', e.target.value)}
        />
      </div>
      {!isEdit && (
        <div className="sm:col-span-2">
          <FormInput
            label="Password"
            type="password"
            value={form.password || ''}
            onChange={(e) => onChange('password', e.target.value)}
            error={errors.password}
            required
          />
        </div>
      )}
    </div>
  );
}
