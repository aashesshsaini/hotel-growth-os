export const PAYMENT_RECORD_STATUSES = [
  'pending',
  'partially_paid',
  'paid',
  'failed',
  'refunded',
  'cancelled',
] as const;

export const PAYMENT_METHODS = [
  'cash',
  'upi',
  'card',
  'net_banking',
  'wallet',
  'razorpay',
  'bank_transfer',
  'other',
] as const;

export const PAYMENT_TYPES = ['advance', 'partial', 'full', 'refund', 'adjustment'] as const;

export const INVOICE_STATUSES = ['draft', 'issued', 'sent', 'paid', 'void'] as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  completed: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  net_banking: 'Net Banking',
  wallet: 'Wallet',
  razorpay: 'Razorpay',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  advance: 'Advance',
  partial: 'Partial',
  full: 'Full Payment',
  refund: 'Refund',
  adjustment: 'Adjustment',
};

export const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}));

export const PAYMENT_STATUS_OPTIONS = PAYMENT_RECORD_STATUSES.map((value) => ({
  value,
  label: PAYMENT_STATUS_LABELS[value],
}));

export const PAYMENT_TYPE_OPTIONS = PAYMENT_TYPES.map((value) => ({
  value,
  label: PAYMENT_TYPE_LABELS[value],
}));
