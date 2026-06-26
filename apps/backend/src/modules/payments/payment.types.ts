import { IPayment } from '../../models/Payment';

export interface ViewerContext {
  userId: string;
  role: string;
  hotelId?: string;
}

export interface SanitizedPayment extends Record<string, unknown> {
  id: string;
  paymentNumber?: string;
  invoiceNumber?: string;
  hotelId: string;
  bookingId: unknown;
  guestId: unknown;
  amount: number;
  method: string;
  paymentType: string;
  status: string;
  invoiceStatus: string;
  transactionId?: string;
  upiReference?: string;
  bankReference?: string;
  notes?: string;
  internalNotes?: string;
  refundedAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  paidAt?: Date;
  timeline: IPayment['timeline'];
  paymentNotes: IPayment['paymentNotes'];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentStatsResult {
  totalPayments: number;
  totalCollected: number;
  pendingAmount: number;
  refundedAmount: number;
  todayRevenue: number;
  monthlyRevenue: number;
  collectionRate: number;
  outstandingBookings: number;
  outstandingAmount: number;
  statusBreakdown: Record<string, number>;
  methodBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  recentTrend: Array<{ month: string; collected: number; count: number }>;
}

export interface BookingPaymentSummary {
  bookingId: string;
  bookingNumber?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  payments: SanitizedPayment[];
}
