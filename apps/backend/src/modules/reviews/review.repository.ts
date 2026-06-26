import crypto from 'crypto';
import { FilterQuery, PipelineStage, Types } from 'mongoose';
import { AuditLog, Guest, Hotel, Review, Task, WhatsAppAutomationRule, WhatsAppMessage } from '../../models';
import { IReview } from '../../models/Review';
import { PaginationOptions, paginate } from '../../utils/pagination';
import { PaginatedResponse } from '@hotel-growth-os/shared';
import { ReviewStatsResult } from './review.types';

const reviewPopulate = [
  { path: 'guestId', select: 'fullName name phone email lastReviewRating' },
  { path: 'bookingId', select: 'bookingNumber checkInDate checkOutDate status roomId' },
  { path: 'assignedTo', select: 'name email' },
  { path: 'repliedBy', select: 'name email' },
  { path: 'timeline.createdBy', select: 'name email' },
  { path: 'notes.createdBy', select: 'name email' },
];

export const findReviewsRepository = async (
  baseFilter: FilterQuery<IReview>,
  options: PaginationOptions
): Promise<PaginatedResponse<IReview>> => {
  const result = await paginate(Review, options, baseFilter);
  await Review.populate(result.data, reviewPopulate);
  return result;
};

export const findReviewByIdRepository = async (id: string) => {
  return Review.findOne({ _id: id, isDeleted: { $ne: true } }).populate(reviewPopulate);
};

export const findReviewByTokenRepository = async (token: string) => {
  return Review.findOne({ publicToken: token, isDeleted: { $ne: true } }).populate([
    { path: 'guestId', select: 'fullName name phone' },
    { path: 'bookingId', select: 'bookingNumber checkInDate checkOutDate' },
    { path: 'hotelId', select: 'name settings' },
  ]);
};

export const findReviewByBookingRepository = async (hotelId: string, bookingId: string) => {
  return Review.findOne({ hotelId, bookingId, isDeleted: { $ne: true } });
};

export const createReviewRepository = async (data: Record<string, unknown>) => Review.create(data);

export const updateReviewRepository = async (review: IReview) => {
  await review.save();
  return review;
};

export const softDeleteReviewRepository = async (id: string, deletedBy: string) => {
  await Review.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy });
};

export const createAuditLogRepository = async (payload: Record<string, unknown>) => AuditLog.create(payload);

export const updateGuestLastReviewRatingRepository = async (guestId: string, hotelId: string, rating: number) => {
  await Guest.findOneAndUpdate({ _id: guestId, hotelId }, { lastReviewRating: rating, updatedAt: new Date() });
};

export const createNegativeReviewTaskRepository = async (review: IReview, assignedTo?: Types.ObjectId) => {
  await Task.create({
    hotelId: review.hotelId,
    title: `Resolve negative review ${review.reviewNumber || ''}`.trim(),
    description: review.feedback || 'Guest left a negative review that needs attention.',
    assignedTo: assignedTo ?? review.assignedTo,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    priority: 'high',
    status: 'pending',
    followUpType: 'review_request',
    relatedTo: { type: 'Review', id: review._id },
    createdBy: review.updatedBy ?? review.createdBy,
    updatedBy: review.updatedBy ?? review.createdBy,
  });
};

export const generatePublicToken = () => crypto.randomBytes(24).toString('hex');

export const getReviewStatsRepository = async (hotelId: string): Promise<ReviewStatsResult> => {
  const baseFilter = { hotelId: new Types.ObjectId(hotelId), isDeleted: { $ne: true } };
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalReviews,
    submittedReviews,
    pendingRequests,
    requestedReviews,
    negativeReviews,
    positiveReviews,
    newReviewsThisMonth,
    ratingAgg,
    ratingDistributionAgg,
    sourceAgg,
    statusAgg,
    googleReviewSentCount,
    repliedCount,
    trendAgg,
  ] = await Promise.all([
    Review.countDocuments(baseFilter),
    Review.countDocuments({ ...baseFilter, status: 'submitted' }),
    Review.countDocuments({ ...baseFilter, status: 'pending_request' }),
    Review.countDocuments({ ...baseFilter, status: 'requested' }),
    Review.countDocuments({ ...baseFilter, isPositive: false, status: { $in: ['submitted', 'escalated'] } }),
    Review.countDocuments({ ...baseFilter, isPositive: true, status: 'submitted' }),
    Review.countDocuments({ ...baseFilter, createdAt: { $gte: monthStart } }),
    Review.aggregate([
      { $match: { ...baseFilter, rating: { $exists: true, $ne: null } } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } },
    ]),
    Review.aggregate([
      { $match: { ...baseFilter, rating: { $exists: true, $ne: null } } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
    Review.aggregate([{ $match: baseFilter }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
    Review.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Review.countDocuments({ ...baseFilter, googleReviewSent: true }),
    Review.countDocuments({ ...baseFilter, managerReply: { $exists: true, $nin: [null, ''] } }),
    Review.aggregate([
      { $match: { ...baseFilter, submittedAt: { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$submittedAt' } },
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
    ] as PipelineStage[]),
  ]);

  const averageRating = Number((ratingAgg[0]?.averageRating ?? 0).toFixed(1));
  const ratingDistribution = ratingDistributionAgg.reduce<Record<string, number>>((acc, item) => {
    acc[String(item._id)] = item.count;
    return acc;
  }, { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });
  const sourceBreakdown = sourceAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});
  const statusBreakdown = statusAgg.reduce<Record<string, number>>((acc, item) => {
    acc[item._id || 'unknown'] = item.count;
    return acc;
  }, {});

  const responseRate = submittedReviews > 0 ? Math.round((repliedCount / submittedReviews) * 100) : 0;
  const positiveRate = submittedReviews > 0 ? positiveReviews / submittedReviews : 0;
  const reputationScore = Math.min(
    100,
    Math.round(averageRating * 18 + positiveRate * 12 + responseRate * 0.1 + (googleReviewSentCount > 0 ? 5 : 0))
  );

  return {
    totalReviews,
    submittedReviews,
    pendingRequests,
    requestedReviews,
    negativeReviews,
    positiveReviews,
    averageRating,
    reputationScore,
    newReviewsThisMonth,
    responseRate,
    googleReviewSentCount,
    ratingDistribution,
    sourceBreakdown,
    statusBreakdown,
    recentTrend: trendAgg.map((item) => ({
      month: String(item._id),
      count: item.count,
      averageRating: Number((item.averageRating ?? 0).toFixed(1)),
    })),
  };
};

export const scheduleReviewRequestWhatsAppRepository = async (review: IReview, guestPhone?: string) => {
  if (!guestPhone) return;
  const hotelId = String(review.hotelId);
  const rules = await WhatsAppAutomationRule.find({
    hotelId,
    trigger: 'review_request',
    isActive: true,
    isDeleted: { $ne: true },
  }).populate('templateId');

  const rule = rules[0];
  if (!rule) return;

  const template = rule.templateId as unknown as { body?: string; name?: string } | null;
  const reviewLink = review.publicToken ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/review/${review.publicToken}` : '';
  const body = (template?.body || 'Thank you for staying with us! Please share your feedback: {{review_link}}')
    .replace(/\{\{review_link\}\}/g, reviewLink)
    .replace(/\{\{guest_name\}\}/g, 'Guest');

  const normalizedPhone = guestPhone.replace(/\D/g, '').slice(-10);
  const message = await WhatsAppMessage.create({
    hotelId: review.hotelId,
    guestId: review.guestId,
    phone: normalizedPhone,
    direction: 'outgoing',
    messageType: 'template',
    body,
    status: 'scheduled',
    scheduledAt: new Date(Date.now() + (rule.delayMinutes ?? 60) * 60 * 1000),
    templateName: template?.name || 'review_request',
    metadata: { reviewId: review._id, trigger: 'review_request' },
    createdBy: review.createdBy,
    updatedBy: review.updatedBy ?? review.createdBy,
  });

  return message;
};

export const createCheckoutReviewRequestRepository = async (booking: {
  _id: Types.ObjectId;
  hotelId: Types.ObjectId;
  guestId: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}) => {
  const existing = await findReviewByBookingRepository(String(booking.hotelId), String(booking._id));
  if (existing) return existing;

  const guest = await Guest.findOne({ _id: booking.guestId, isDeleted: { $ne: true } });
  const publicToken = generatePublicToken();
  const review = await Review.create({
    hotelId: booking.hotelId,
    bookingId: booking._id,
    guestId: booking.guestId,
    status: 'pending_request',
    source: 'internal',
    publicToken,
    isPositive: true,
    sentimentTags: [],
    notes: [],
    timeline: [{
      action: 'review.checkout_request_created',
      message: 'Review request prepared after checkout',
      createdAt: new Date(),
      createdBy: booking.updatedBy ?? booking.createdBy,
    }],
    createdBy: booking.updatedBy ?? booking.createdBy,
    updatedBy: booking.updatedBy ?? booking.createdBy,
  });

  if (guest?.phone) {
    await scheduleReviewRequestWhatsAppRepository(review, guest.phone);
  }

  return review;
};

export const findGuestReviewsRepository = async (guestId: string, hotelId: string) => {
  return Review.find({ guestId, hotelId, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .populate('bookingId', 'bookingNumber checkInDate checkOutDate');
};

export const findHotelGoogleReviewLinkRepository = async (hotelId: string) => {
  const hotel = await Hotel.findById(hotelId).select('settings');
  return hotel?.settings?.googleReviewLink as string | undefined;
};
