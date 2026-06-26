import { FilterQuery, Types } from 'mongoose';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { IReview } from '../../models/Review';
import { Booking } from '../../models';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import {
  AddReviewNoteInput,
  CreateInput,
  EscalateReviewInput,
  ListQuery,
  PublicSubmitInput,
  ReplyReviewInput,
  RequestReviewInput,
  ResolveReviewInput,
  UpdateInput,
} from './reviews.validation';
import {
  createCheckoutReviewRequestRepository,
  createNegativeReviewTaskRepository,
  findReviewByBookingRepository,
  createReviewRepository,
  findGuestReviewsRepository,
  findHotelGoogleReviewLinkRepository,
  findReviewByIdRepository,
  findReviewByTokenRepository,
  findReviewsRepository,
  generatePublicToken,
  getReviewStatsRepository,
  scheduleReviewRequestWhatsAppRepository,
  softDeleteReviewRepository,
  updateGuestLastReviewRatingRepository,
  updateReviewRepository,
} from './review.repository';
import { ReviewStatsResult, SanitizedReview, ViewerContext } from './review.types';

const REVIEW_VIEW_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff', 'sales_staff'];
const REVIEW_MANAGE_ROLES = ['super_admin', 'hotel_owner', 'hotel_manager', 'reception_staff'];

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
  if (!REVIEW_VIEW_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to view reviews');
  }
};

const assertCanManage = (viewer: ViewerContext): void => {
  if (!REVIEW_MANAGE_ROLES.includes(viewer.role)) {
    throw new ForbiddenError('You do not have permission to manage reviews');
  }
};

const sanitizeReview = (review: IReview): SanitizedReview => {
  const doc = review.toObject ? review.toObject() : review;
  return { ...doc, id: doc._id?.toString() };
};

const addTimeline = (
  review: IReview,
  action: string,
  viewer: ViewerContext | { userId?: string },
  message?: string,
  metadata?: Record<string, unknown>
) => {
  review.timeline = review.timeline ?? [];
  review.timeline.unshift({
    action,
    message,
    createdAt: new Date(),
    createdBy: viewer.userId ? new Types.ObjectId(viewer.userId) : undefined,
    metadata,
  });
  review.timeline = review.timeline.slice(0, 50);
};

const deriveSentiment = (rating: number, feedback?: string): { isPositive: boolean; tags: string[] } => {
  const tags: string[] = [];
  if (rating >= 4) tags.push('positive');
  else if (rating === 3) tags.push('neutral');
  else tags.push('negative');

  if (feedback) {
    const lower = feedback.toLowerCase();
    if (/(clean|excellent|great|amazing|wonderful|friendly)/.test(lower)) tags.push('service_praise');
    if (/(dirty|slow|rude|bad|terrible|worst|noise)/.test(lower)) tags.push('service_issue');
  }

  return { isPositive: rating >= 4, tags: [...new Set(tags)] };
};

const buildFilter = (query: ListQuery, hotelId: string): FilterQuery<IReview> => {
  const filter: FilterQuery<IReview> = { hotelId };
  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;
  if (query.requestChannel) filter.requestChannel = query.requestChannel;
  if (query.guestId) filter.guestId = query.guestId;
  if (query.bookingId) filter.bookingId = query.bookingId;
  if (query.assignedTo) filter.assignedTo = query.assignedTo;
  if (query.isPositive !== undefined) filter.isPositive = query.isPositive;
  if (query.ratingMin || query.ratingMax) {
    filter.rating = {};
    if (query.ratingMin) (filter.rating as Record<string, number>).$gte = query.ratingMin;
    if (query.ratingMax) (filter.rating as Record<string, number>).$lte = query.ratingMax;
  }
  if (query.fromDate || query.toDate) {
    filter.createdAt = {};
    if (query.fromDate) (filter.createdAt as Record<string, Date>).$gte = query.fromDate;
    if (query.toDate) (filter.createdAt as Record<string, Date>).$lte = query.toDate;
  }
  return filter;
};

export const stats = async (viewer: ViewerContext): Promise<ReviewStatsResult> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(viewer.hotelId);
  return getReviewStatsRepository(hotelId);
};

export const list = async (query: ListQuery, viewer: ViewerContext): Promise<PaginatedResponse<SanitizedReview>> => {
  assertCanView(viewer);
  const hotelId = resolveHotelId(query.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);
  const filter = buildFilter(query, hotelId);
  const result = await findReviewsRepository(filter, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    searchFields: ['feedback', 'reviewNumber', 'managerReply'],
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder || 'desc',
  });
  return { ...result, data: result.data.map(sanitizeReview) };
};

export const getById = async (id: string, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanView(viewer);
  const doc = await findReviewByIdRepository(id);
  if (!doc) throw new NotFoundError('Review not found');
  assertHotelAccess(viewer, String(doc.hotelId));
  return sanitizeReview(doc);
};

export const create = async (input: CreateInput, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(input.hotelId, viewer.hotelId);
  assertHotelAccess(viewer, hotelId);

  const payload: Record<string, unknown> = {
    ...input,
    hotelId,
    createdBy: viewer.userId,
    updatedBy: viewer.userId,
    notes: [],
    timeline: [],
    sentimentTags: input.sentimentTags ?? [],
  };

  if (input.rating) {
    const sentiment = deriveSentiment(input.rating, input.feedback);
    payload.isPositive = input.isPositive ?? sentiment.isPositive;
    payload.sentimentTags = input.sentimentTags ?? sentiment.tags;
    payload.status = input.status ?? 'submitted';
    payload.submittedAt = input.submittedAt ?? new Date();
  } else {
    payload.status = input.status ?? 'pending_request';
    payload.publicToken = generatePublicToken();
  }

  const doc = await createReviewRepository(payload);
  if (input.rating) {
    await updateGuestLastReviewRatingRepository(String(input.guestId), hotelId, input.rating);
  }
  addTimeline(doc, 'review.created', viewer, 'Review record created');
  await updateReviewRepository(doc);
  return sanitizeReview(doc);
};

export const update = async (id: string, input: UpdateInput, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanManage(viewer);
  const doc = await findReviewByIdRepository(id);
  if (!doc) throw new NotFoundError('Review not found');
  assertHotelAccess(viewer, String(doc.hotelId));

  Object.assign(doc, input, { updatedBy: viewer.userId });
  if (input.rating) {
    const sentiment = deriveSentiment(input.rating, input.feedback ?? doc.feedback);
    doc.isPositive = input.isPositive ?? sentiment.isPositive;
    doc.sentimentTags = input.sentimentTags ?? sentiment.tags;
    if (!doc.submittedAt) doc.submittedAt = new Date();
    if (doc.status === 'pending_request' || doc.status === 'requested') doc.status = 'submitted';
    await updateGuestLastReviewRatingRepository(String(doc.guestId), String(doc.hotelId), input.rating);
  }
  addTimeline(doc, 'review.updated', viewer, 'Review updated');
  await updateReviewRepository(doc);
  return sanitizeReview(doc);
};

export const remove = async (id: string, viewer: ViewerContext): Promise<void> => {
  assertCanManage(viewer);
  const doc = await findReviewByIdRepository(id);
  if (!doc) throw new NotFoundError('Review not found');
  assertHotelAccess(viewer, String(doc.hotelId));
  await softDeleteReviewRepository(id, viewer.userId);
};

export const requestReview = async (input: RequestReviewInput, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanManage(viewer);
  const hotelId = resolveHotelId(viewer.hotelId);
  const booking = await Booking.findOne({ _id: input.bookingId, hotelId, isDeleted: { $ne: true } });
  if (!booking) throw new NotFoundError('Booking not found');

  const existing = await findReviewByBookingRepository(hotelId, input.bookingId);
  if (existing) {
    if (input.sendNow && existing.status === 'pending_request') {
      return sendRequest(String(existing._id), viewer);
    }
    return sanitizeReview(existing);
  }

  const doc = await createCheckoutReviewRequestRepository({
    _id: booking._id,
    hotelId: booking.hotelId,
    guestId: input.guestId ? new Types.ObjectId(input.guestId) : booking.guestId,
    createdBy: new Types.ObjectId(viewer.userId),
    updatedBy: new Types.ObjectId(viewer.userId),
  });

  if (input.sendNow) {
    doc.status = 'requested';
    doc.requestChannel = input.requestChannel;
    doc.requestSentAt = new Date();
    addTimeline(doc, 'review.request_sent', viewer, `Review request sent via ${input.requestChannel}`);
    await updateReviewRepository(doc);
  }

  return sanitizeReview(doc);
};

export const sendRequest = async (id: string, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanManage(viewer);
  const doc = await findReviewByIdRepository(id);
  if (!doc) throw new NotFoundError('Review not found');
  assertHotelAccess(viewer, String(doc.hotelId));

  if (!doc.publicToken) doc.publicToken = generatePublicToken();
  doc.status = 'requested';
  doc.requestSentAt = new Date();
  doc.requestChannel = doc.requestChannel ?? 'whatsapp';
  doc.updatedBy = new Types.ObjectId(viewer.userId);

  const guest = doc.guestId as unknown as { phone?: string };
  if (guest?.phone) await scheduleReviewRequestWhatsAppRepository(doc, guest.phone);

  addTimeline(doc, 'review.request_sent', viewer, 'Review request sent to guest');
  await updateReviewRepository(doc);
  return sanitizeReview(doc);
};

export const reply = async (id: string, input: ReplyReviewInput, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanManage(viewer);
  const doc = await findReviewByIdRepository(id);
  if (!doc) throw new NotFoundError('Review not found');
  assertHotelAccess(viewer, String(doc.hotelId));

  doc.managerReply = input.managerReply;
  doc.repliedAt = new Date();
  doc.repliedBy = new Types.ObjectId(viewer.userId);
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'review.replied', viewer, 'Manager reply posted');
  await updateReviewRepository(doc);
  return sanitizeReview(doc);
};

export const escalate = async (id: string, input: EscalateReviewInput, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanManage(viewer);
  const doc = await findReviewByIdRepository(id);
  if (!doc) throw new NotFoundError('Review not found');
  assertHotelAccess(viewer, String(doc.hotelId));

  doc.status = 'escalated';
  doc.escalatedAt = new Date();
  if (input.assignedTo) doc.assignedTo = new Types.ObjectId(input.assignedTo);
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'review.escalated', viewer, input.note || 'Negative review escalated');
  await createNegativeReviewTaskRepository(doc, doc.assignedTo);
  await updateReviewRepository(doc);
  return sanitizeReview(doc);
};

export const resolveReview = async (id: string, input: ResolveReviewInput, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanManage(viewer);
  const doc = await findReviewByIdRepository(id);
  if (!doc) throw new NotFoundError('Review not found');
  assertHotelAccess(viewer, String(doc.hotelId));

  doc.status = 'resolved';
  doc.resolvedAt = new Date();
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'review.resolved', viewer, input.note || 'Review issue resolved');
  await updateReviewRepository(doc);
  return sanitizeReview(doc);
};

export const notifyManager = async (id: string, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanManage(viewer);
  const doc = await findReviewByIdRepository(id);
  if (!doc) throw new NotFoundError('Review not found');
  assertHotelAccess(viewer, String(doc.hotelId));

  doc.managerNotified = true;
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'review.manager_notified', viewer, 'Manager notified about review');
  await updateReviewRepository(doc);
  return sanitizeReview(doc);
};

export const sendGoogleLink = async (id: string, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanManage(viewer);
  const doc = await findReviewByIdRepository(id);
  if (!doc) throw new NotFoundError('Review not found');
  assertHotelAccess(viewer, String(doc.hotelId));

  const googleLink = await findHotelGoogleReviewLinkRepository(String(doc.hotelId));
  doc.googleReviewSent = true;
  doc.googleReviewLinkSentAt = new Date();
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'review.google_link_sent', viewer, googleLink ? `Google review link shared: ${googleLink}` : 'Google review link marked as sent');
  await updateReviewRepository(doc);
  return sanitizeReview(doc);
};

export const addNote = async (id: string, input: AddReviewNoteInput, viewer: ViewerContext): Promise<SanitizedReview> => {
  assertCanManage(viewer);
  const doc = await findReviewByIdRepository(id);
  if (!doc) throw new NotFoundError('Review not found');
  assertHotelAccess(viewer, String(doc.hotelId));

  doc.notes = doc.notes ?? [];
  doc.notes.unshift({
    text: input.text,
    createdAt: new Date(),
    createdBy: new Types.ObjectId(viewer.userId),
  });
  doc.notes = doc.notes.slice(0, 30);
  doc.updatedBy = new Types.ObjectId(viewer.userId);
  addTimeline(doc, 'review.note_added', viewer, 'Internal note added');
  await updateReviewRepository(doc);
  return sanitizeReview(doc);
};

export const getPublicRequest = async (token: string) => {
  const doc = await findReviewByTokenRepository(token);
  if (!doc) throw new NotFoundError('Review request not found');
  const hotel = doc.hotelId as unknown as { name?: string; settings?: { googleReviewLink?: string } };
  const guest = doc.guestId as unknown as { fullName?: string; name?: string };
  const booking = doc.bookingId as unknown as { bookingNumber?: string; checkInDate?: Date; checkOutDate?: Date };
  return {
    token,
    status: doc.status,
    hotelName: hotel?.name,
    guestName: guest?.fullName || guest?.name,
    bookingNumber: booking?.bookingNumber,
    checkInDate: booking?.checkInDate,
    checkOutDate: booking?.checkOutDate,
    alreadySubmitted: doc.status === 'submitted' || Boolean(doc.rating),
  };
};

export const submitPublic = async (token: string, input: PublicSubmitInput) => {
  const doc = await findReviewByTokenRepository(token);
  if (!doc) throw new NotFoundError('Review request not found');
  if (doc.status === 'submitted' && doc.rating) throw new ValidationError('Review already submitted');

  const sentiment = deriveSentiment(input.rating, input.feedback);
  doc.rating = input.rating;
  doc.feedback = input.feedback;
  doc.staffRating = input.staffRating;
  doc.departmentRatings = input.departmentRatings;
  doc.source = input.source;
  doc.isPositive = sentiment.isPositive;
  doc.sentimentTags = sentiment.tags;
  doc.status = 'submitted';
  doc.submittedAt = new Date();

  addTimeline(doc, 'review.submitted', {}, 'Guest submitted review via public form');
  await updateReviewRepository(doc);
  await updateGuestLastReviewRatingRepository(String(doc.guestId), String(doc.hotelId), input.rating);

  if (!sentiment.isPositive) {
    await createNegativeReviewTaskRepository(doc);
  }

  return { success: true, message: 'Thank you for your feedback!' };
};

export const triggerCheckoutReviewRequest = async (booking: {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  guestId: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}) => {
  try {
    return await createCheckoutReviewRequestRepository(booking);
  } catch {
    return null;
  }
};

export { findGuestReviewsRepository };
