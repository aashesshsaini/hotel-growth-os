'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createBookings, deleteBookings, getBookings, updateBookings } from '@/services/bookings.service';

const statusOptions = [{ value: 'pending', label: 'Pending' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'checked_in', label: 'Checked In' }, { value: 'checked_out', label: 'Checked Out' }, { value: 'cancelled', label: 'Cancelled' }];

export default function Page() {
  return (
    <ModuleCrudPage
      title="Bookings"
      subtitle="Manage reservations while calendar, room assignment, and status workflows are restored."
      searchPlaceholder="Search bookings..."
      list={getBookings}
      create={createBookings}
      update={updateBookings}
      remove={deleteBookings}
      statusOptions={statusOptions}
      comingSoon={'Calendar, room assignment, availability conversion, and cancellation workflow endpoints are not restored yet.'}
      fields={[ { key: 'guestId', label: 'Guest ID', required: true }, { key: 'checkInDate', label: 'Check In', type: 'date', required: true }, { key: 'checkOutDate', label: 'Check Out', type: 'date', required: true }, { key: 'adults', label: 'Adults', type: 'number', required: true }, { key: 'children', label: 'Children', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'pending', label: 'Pending' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'checked_in', label: 'Checked In' }, { value: 'checked_out', label: 'Checked Out' }, { value: 'cancelled', label: 'Cancelled' }] }, { key: 'paymentStatus', label: 'Payment Status', type: 'select', options: [{ value: 'unpaid', label: 'Unpaid' }, { value: 'partially_paid', label: 'Partially Paid' }, { value: 'paid', label: 'Paid' }, { value: 'refunded', label: 'Refunded' }] }, { key: 'totalAmount', label: 'Total Amount', type: 'currency', required: true }, { key: 'paidAmount', label: 'Paid Amount', type: 'currency' }, { key: 'specialRequests', label: 'Special Requests', type: 'textarea' } ]}
      columns={[ { key: 'bookingNumber', header: 'Booking' }, { key: 'status', header: 'Status', type: 'status' }, { key: 'paymentStatus', header: 'Payment', type: 'status' }, { key: 'checkInDate', header: 'Check-in', type: 'date' }, { key: 'totalAmount', header: 'Total', type: 'currency' } ]}
    />
  );
}
