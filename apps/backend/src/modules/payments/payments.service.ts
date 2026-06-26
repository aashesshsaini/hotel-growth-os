import { FilterQuery, Types } from 'mongoose';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { IPayment } from '../../models/Payment';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import {
  AddPaymentNoteInput,
  CreateInput,
  ListQuery,
  RefundInput,
  UpdateInput,
  UpdateStatusInput,
} from './payments.validation';
import {
  buildBookingPaymentSummaryRepository,
  createPaymentRepository,
  findBookingByIdRepository,
  findGuestByIdRepository,
  findPaymentByIdRepository,
  findPaymentsRepository,
  generateInvoiceNumberRepository,
  inferPaymentType,
  isSuccessfulPaymentStatus,
  normalizePaymentStatus,
  recalculateBookingPaidAmountRepository,
  schedulePaymentReminderWhatsAppRepository,
  softDeletePaymentRepository,
  syncGuestPaymentMetricsRepository,
  updatePaymentRepository,
  getPaymentStatsRepository,
} from './payment.repository';
import { PaymentStatsResult, SanitizedPayment, ViewerContext } from './payment.types';

const PAYMENT_VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff', 'accountant'];
const PAYMENT_MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'accountant'];

const resolveHotelId = (hotelId: string | undefined, fallbackHotelId?: string): string => {
  const resolved = hotelId ?? fallbackHotelId;
  if (!resolved) throw new ValidationError('Hotel ID is required');
  return resolved;
};

const assertHotelAccess = (viewer: ViewerContext, hotelId: string): void => {
  if (viewer.role !== 'super_admin' && viewer.hotelId !== hotelId) {
    throw new ForbiddenError('Access denied to this hotel');
  }
};

const assertCanView = (viewer: ViewerContext): void => {
  if (!PAYMENT_VIEW_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to view payments');
  }
};

const assertCanManage = (viewer: ViewerContext): void => {
  if (!PAYMENT_MANAGE_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to manage payments');
  }
};

const sanitizePayment = (payment: IPayment): SanitizedPayment => {
  const doc = payment.toObject ? payment.toObject() : payment;
  return {
    ...doc,
    id: doc._id?.toString(),
    status: normalizePaymentStatus(doc.status),
  };
};

const addTimeline = (
  payment: IPayment,
  action: string,
  viewer: ViewerContext,
  message?: string,
  metadata?: Record<string, unknown>
) => {
  payment.timeline = payment.timeline ?? [];
  payment.timeline.unshift({
    action,
    message,
    createdAt: new Date(),
    createdBy: new Types.ObjectId(viewer.userId),
    metadata,
  });
  payment.timeline = payment.timeline.slice(0, 50);
};

const buildFilter = (query: ListQuery, hotelId: string): FilterQuery<IPayment> => {
  const filter: FilterQuery<IPayment> = { hotelId };
  if (query.status) filter.status = query.status === 'paid' ? { $in: ['paid', 'completed'] } : query.status;
  if (query.method) filter.method = query.method;
  if (query.paymentType) filter.paymentType = query.paymentType;
  if (query.bookingId) filter.bookingId = query.bookingId;
  if (query.guestId) filter.guestId = query.guestId;
  if (query.invoiceStatus) filter.invoiceStatus = query.invoiceStatus;
  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) (filter.createdAt as Record<string, Date>).$gte = query.fromDate;
    if (query.toDate) (filter.createdAt as Record<string, Date>).$lte = query.toDate;
  }
  return filter;
};

const applySuccessfulPaymentSideEffects = async (payment: IPayment, bookingId: string) => {
  const booking = await findBookingByIdRepository(bookingId);
  if (!booking) return;
  await recalculateBookingPaidAmountRepository(booking);
  await syncGuestPaymentMetricsRepository(String(booking.guestId), String(booking.hotelId));
};

export const stats = async (viewer: ViewerContext): Promise<PaymentStatsResult> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer.hotelId);
  return getPaymentStatsRepository(hotelId);
};

export const list = async (query: ListQuery, viewer: ViewerContext): Promise<PaginatedResponse<SanitizedPayment>> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const result = await findPaymentsRepository(buildFilter(query, hotelId), {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['paymentNumber', 'invoiceNumber', 'transactionId', 'upiReference', 'bankReference', 'notes'],
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder || 'desc',
  });
  return { ...result, data: result.data.map(sanitizePayment) };
};

export const getById = async (id: string, viewer: ViewerContext): Promise<SanitizedPayment> => {
  assertCanView(viewer);
  const doc = await findPaymentByIdRepository(id);
  if (!doc) throw new NotFoundError('Payment not found');
  assertHotelAccess(viewer, String(doc.hotelId));
  return sanitizePayment(doc);
};

export const getBookingSummary = async (bookingId: string, viewer: ViewerContext) => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer.hotelId);
  const summary = await buildBookingPaymentSummaryRepository(hotelId, bookingId);
  if (!summary) throw new NotFoundError('Booking not found');
  return summary;
};

export const create = async (input: CreateInput, viewer: ViewerContext): Promise<SanitizedPayment> => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);

  const booking = await findBookingByIdRepository(input.bookingId);
  if (!booking) throw new NotFoundError('Booking not found');
  if (String(booking.hotelId) !== hotelId) throw new ForbiddenError('Booking does not belong to this hotel');

  const guestId = input.guestId ?? String(booking.guestId);
  const status = normalizePaymentStatus(input.status ?? 'paid');
  const dueAmount = Math.max((booking.totalAmount || 0) - (booking.paidAmount || 0), 0);
  const paymentType = input.paymentType ?? inferPaymentType(input.amount, booking);

  if (input.amount <= 0 && paymentType !== 'refund') {
    throw new ValidationError('Payment amount must be greater than zero');
  }

  const invoiceNumber =
    isSuccessfulPaymentStatus(status) ? await generateInvoiceNumberRepository(hotelId) : undefined;

  const doc = await createPaymentRepository({
    ...input,
    hotelId,
    guestId,
    status,
    paymentType,
    invoiceNumber,
    invoiceStatus: isSuccessfulPaymentStatus(status) ? 'issued' : input.invoiceStatus ?? 'draft',
    dueAmountSnapshot: dueAmount,
    paidAt: isSuccessfulPaymentStatus(status) ? input.paidAt ?? new Date() : input.paidAt,
    receivedBy: input.receivedBy ?? viewer.userId,
    timeline: [],
    paymentNotes: [],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });

  addTimeline(doc, 'payment.created', viewer, `Payment of ${input.amount} recorded via ${input.method}`);
  await updatePaymentRepository(doc);

  if (isSuccessfulPaymentStatus(status)) {
    await applySuccessfulPaymentSideEffects(doc, input.bookingId);
  }

  if (input.sendReminder) {
    const guest = await findGuestByIdRepository(guestId, hotelId);
    if (guest?.phone) {
      await schedulePaymentReminderWhatsAppRepository(booking, guest.phone, dueAmount);
    }
  }

  return sanitizePayment(doc);
};

export const update = async (id: string, input: UpdateInput, viewer: ViewerContext): Promise<SanitizedPayment> => {
  assertCanManage(viewer);
  const doc = await findPaymentByIdRepository(id);
  if (!doc) throw new NotFoundError('Payment not found');
  assertHotelAccess(viewer, String(doc.hotelId));

  const previousStatus = doc.status;
  Object.assign(doc, input, { updatedBy: viewer.userId });
  if (input.status) doc.status = normalizePaymentStatus(input.status);
  if (input.status && isSuccessfulPaymentStatus(input.status) && !doc.paidAt) doc.paidAt = new Date();
  if (isSuccessfulPaymentStatus(doc.status) && !doc.invoiceNumber) {
    doc.invoiceNumber = await generateInvoiceNumberRepository(String(doc.hotelId));
    doc.invoiceStatus = 'issued';
  }

  addTimeline(doc, 'payment.updated', viewer, 'Payment updated');
  await updatePaymentRepository(doc);

  if (previousStatus !== doc.status || input.amount !== undefined) {
    await applySuccessfulPaymentSideEffects(doc, String(doc.bookingId));
  }

  return sanitizePayment(doc);
};

export const remove = async (id: string, viewer: ViewerContext): Promise<void> => {
  assertCanManage(viewer);
  const doc = await findPaymentByIdRepository(id);
  if (!doc) throw new NotFoundError('Payment not found');
  assertHotelAccess(viewer, String(doc.hotelId));
  await softDeletePaymentRepository(id, viewer.userId);
  await applySuccessfulPaymentSideEffects(doc, String(doc.bookingId));
};

export const refund = async (id: string, input: RefundInput, viewer: ViewerContext): Promise<SanitizedPayment> => {
  assertCanManage(viewer);
  const doc = await findPaymentByIdRepository(id);
  if (!doc) throw new NotFoundError('Payment not found');
  assertHotelAccess(viewer, String(doc.hotelId));
  if (!isSuccessfulPaymentStatus(doc.status)) {
    throw new ValidationError('Only successful payments can be refunded');
  }

  const refundAmount = input.amount ?? doc.amount;
  if (refundAmount <= 0 || refundAmount > doc.amount) {
    throw new ValidationError('Invalid refund amount');
  }

  doc.status = 'refunded';
  doc.refundedAmount = refundAmount;
  doc.refundReason = input.refundReason;
  doc.refundedAt = new Date();
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'payment.refunded', viewer, input.refundReason);

  const refundRecord = await createPaymentRepository({
    hotelId: doc.hotelId,
    bookingId: doc.bookingId,
    guestId: doc.guestId,
    amount: refundAmount,
    method: input.method ?? doc.method,
    paymentType: 'refund',
    status: 'refunded',
    invoiceStatus: 'void',
    notes: input.notes,
    refundedAmount: refundAmount,
    refundReason: input.refundReason,
    refundedAt: new Date(),
    timeline: [{
      action: 'payment.refund_created',
      message: input.refundReason,
      createdAt: new Date(),
      createdBy: new Types.ObjectId(viewer.userId),
    }],
    paymentNotes: [],
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
  });

  await updatePaymentRepository(doc);
  await applySuccessfulPaymentSideEffects(doc, String(doc.bookingId));
  return sanitizePayment(refundRecord);
};

export const updateStatus = async (id: string, input: UpdateStatusInput, viewer: ViewerContext): Promise<SanitizedPayment> => {
  return update(id, { status: input.status, notes: input.note }, viewer);
};

export const addNote = async (id: string, input: AddPaymentNoteInput, viewer: ViewerContext): Promise<SanitizedPayment> => {
  assertCanManage(viewer);
  const doc = await findPaymentByIdRepository(id);
  if (!doc) throw new NotFoundError('Payment not found');
  assertHotelAccess(viewer, String(doc.hotelId));

  doc.paymentNotes = doc.paymentNotes ?? [];
  doc.paymentNotes.unshift({
    text: input.text,
    createdAt: new Date(),
    createdBy: new Types.ObjectId(viewer.userId),
  });
  doc.paymentNotes = doc.paymentNotes.slice(0, 30);
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'payment.note_added', viewer, 'Internal note added');
  await updatePaymentRepository(doc);
  return sanitizePayment(doc);
};

export const recordBookingPayment = async (
  bookingId: string,
  input: {
    amount: number;
    method: CreateInput['method'];
    status?: string;
    transactionId?: string;
    notes?: string;
  },
  viewer: ViewerContext
) => {
  const hotelId = resolveHotelId(viewer.hotelId);
  const booking = await findBookingByIdRepository(bookingId);
  if (!booking) throw new NotFoundError('Booking not found');
  assertHotelAccess(viewer, String(booking.hotelId));

  const payment = await create(
    {
      bookingId,
      guestId: String(booking.guestId),
      amount: input.amount,
      method: input.method,
      status: normalizePaymentStatus(input.status ?? 'paid'),
      transactionId: input.transactionId,
      notes: input.notes,
    },
    viewer
  );

  return buildBookingPaymentSummaryRepository(hotelId, bookingId);
};

export { findGuestPaymentsRepository } from './payment.repository';
