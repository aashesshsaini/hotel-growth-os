'use client';

import { FormInput, SelectInput } from '@/components/FormInput';
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
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">Reservation Filters</h3>
          <p className="text-sm text-slate-500">Filter by lifecycle, payment status, booking segment, and stay dates.</p>
        </div>
        <button type="button" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700" onClick={onReset}>
          Reset filters
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SelectInput label="Booking Status" value={status} onChange={(event) => onStatusChange(event.target.value)} options={[{ value: '', label: 'All statuses' }, ...BOOKING_STATUS_OPTIONS]} />
        <SelectInput label="Payment Status" value={paymentStatus} onChange={(event) => onPaymentStatusChange(event.target.value)} options={[{ value: '', label: 'All payments' }, ...PAYMENT_STATUS_OPTIONS]} />
        <SelectInput label="Booking Type" value={bookingType} onChange={(event) => onBookingTypeChange(event.target.value)} options={[{ value: '', label: 'All types' }, ...BOOKING_TYPE_OPTIONS]} />
        <FormInput label="Check-in From" type="date" value={checkInFrom} onChange={(event) => onCheckInFromChange(event.target.value)} />
        <FormInput label="Check-in To" type="date" value={checkInTo} onChange={(event) => onCheckInToChange(event.target.value)} />
      </div>
    </div>
  );
}

