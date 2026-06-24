'use client';

import { ModuleCrudPage } from '@/features/platform/ModuleCrudPage';
import { createPayments, deletePayments, getPayments, updatePayments } from '@/services/payments.service';

const statusOptions = [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }, { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' }];

export default function Page() {
  return (
    <ModuleCrudPage
      title="Payments"
      subtitle="Track guest payments and pending revenue while gateway flows are restored."
      searchPlaceholder="Search payments..."
      list={getPayments}
      create={createPayments}
      update={updatePayments}
      remove={deletePayments}
      statusOptions={statusOptions}
      comingSoon={'Cash/UPI specialized flows, Razorpay order/verify/webhooks, and pending-payment reports are backend gaps.'}
      fields={[ { key: 'bookingId', label: 'Booking ID', required: true }, { key: 'guestId', label: 'Guest ID', required: true }, { key: 'amount', label: 'Amount', type: 'currency', required: true }, { key: 'method', label: 'Method', type: 'select', required: true, options: [{ value: 'cash', label: 'Cash' }, { value: 'upi', label: 'Upi' }, { value: 'razorpay', label: 'Razorpay' }, { value: 'card', label: 'Card' }, { value: 'bank_transfer', label: 'Bank Transfer' }] }, { key: 'status', label: 'Status', type: 'select', options: [{ value: 'pending', label: 'Pending' }, { value: 'completed', label: 'Completed' }, { value: 'failed', label: 'Failed' }, { value: 'refunded', label: 'Refunded' }] }, { key: 'transactionId', label: 'Transaction ID' }, { key: 'paidAt', label: 'Paid At', type: 'date' }, { key: 'notes', label: 'Notes', type: 'textarea' } ]}
      columns={[ { key: 'amount', header: 'Amount', type: 'currency' }, { key: 'method', header: 'Method', type: 'status' }, { key: 'status', header: 'Status', type: 'status' }, { key: 'transactionId', header: 'Txn ID' }, { key: 'paidAt', header: 'Paid', type: 'date' } ]}
    />
  );
}
