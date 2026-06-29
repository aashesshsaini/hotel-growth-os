'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
import { FilterPanel } from '@/components/layout';
import { BOOKING_STATUS_OPTIONS, BOOKING_TYPE_OPTIONS, PAYMENT_STATUS_OPTIONS } from './constants';

interface BookingFiltersProps {
  status: string;
  paymentStatus: string;
  bookingType: string;
  checkInFrom: string;
  checkInTo: string;
  onStatusChange: (value: string) => void;
  onPaymentStatusChange: (value: string) => void;
  onBookingTypeChange: (value: string) => void;
  onCheckInFromChange: (value: string) => void;
  onCheckInToChange: (value: string) => void;
  onReset: () => void;
}

export function BookingFilters({
  status,
  paymentStatus,
  bookingType,
  checkInFrom,
  checkInTo,
  onStatusChange,
  onPaymentStatusChange,
  onBookingTypeChange,
  onCheckInFromChange,
  onCheckInToChange,
  onReset,
}: BookingFiltersProps) {
  const activeCount = [status, paymentStatus, bookingType, checkInFrom, checkInTo].filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <FilterPanel
        title="More Filters"
        activeCount={activeCount}
        onReset={onReset}
        basicFilters={
          <>
            <div className="filter-field">
              <SelectInput label="Status" value={status} onChange={(event) => onStatusChange(event.target.value)} options={[{ value: '', label: 'All statuses' }, ...BOOKING_STATUS_OPTIONS]} />
            </div>
            <div className="filter-field">
              <SelectInput label="Payment" value={paymentStatus} onChange={(event) => onPaymentStatusChange(event.target.value)} options={[{ value: '', label: 'All payments' }, ...PAYMENT_STATUS_OPTIONS]} />
            </div>
          </>
        }
      >
        <SelectInput label="Booking Type" value={bookingType} onChange={(event) => onBookingTypeChange(event.target.value)} options={[{ value: '', label: 'All types' }, ...BOOKING_TYPE_OPTIONS]} />
        <FormInput label="Check-in From" type="date" value={checkInFrom} onChange={(event) => onCheckInFromChange(event.target.value)} />
        <FormInput label="Check-in To" type="date" value={checkInTo} onChange={(event) => onCheckInToChange(event.target.value)} />
      </FilterPanel>
    </div>
  );
}
