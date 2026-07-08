import crypto from "crypto";
import { FilterQuery, Types } from "mongoose";
import {
  AuditLog,
  Booking,
  Guest,
  GuestReview,
  InternalFeedback,
  Notification,
  Review,
  ReviewCampaign,
  ReviewRequest,
  ReviewSettings,
  ReviewTemplate,
  User,
} from "../../models";
import { IReviewCampaign } from "../../models/ReviewCampaign";
import { IReviewRequest } from "../../models/ReviewRequest";
import { IGuestReview } from "../../models/GuestReview";
import { IInternalFeedback } from "../../models/InternalFeedback";
import { IReviewTemplate } from "../../models/ReviewTemplate";
import { paginate } from "../../utils/pagination";

export const generateReviewRequestToken = () =>
  crypto.randomBytes(24).toString("hex");

export const createReviewGrowthAudit = (payload: {
  hotelId?: string | Types.ObjectId;
  userId?: string | Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string | Types.ObjectId;
  changes?: Record<string, unknown>;
}) =>
  AuditLog.create({
    hotelId: payload.hotelId
      ? new Types.ObjectId(String(payload.hotelId))
      : undefined,
    userId: payload.userId
      ? new Types.ObjectId(String(payload.userId))
      : undefined,
    action: payload.action,
    entity: payload.entity,
    entityId: payload.entityId
      ? new Types.ObjectId(String(payload.entityId))
      : undefined,
    changes: payload.changes,
  });

export const findBookingForReviewGrowth = (
  hotelId: string,
  bookingId: string,
) =>
  Booking.findOne({ _id: bookingId, hotelId, isDeleted: { $ne: true } }).select(
    "hotelId guestId bookingNumber status checkOutDate",
  );

export const findGuestForReviewGrowth = (hotelId: string, guestId: string) =>
  Guest.findOne({ _id: guestId, hotelId, isDeleted: { $ne: true } }).select(
    "hotelId fullName name phone email whatsappConsent emailConsent lastReviewRating",
  );

export const findReviewSettingsRepository = (hotelId: string) =>
  ReviewSettings.findOne({ hotelId, isDeleted: { $ne: true } });

export const findReviewNotificationUsersRepository = async (
  hotelId: string,
) => {
  const settings = await findReviewSettingsRepository(hotelId);
  if (settings?.notificationUserIds?.length) {
    return User.find({
      _id: { $in: settings.notificationUserIds },
      isActive: true,
      isDeleted: { $ne: true },
    }).select("_id name email role");
  }
  return User.find({
    hotelId,
    role: { $in: ["hotel_owner", "hotel_manager"] },
    isActive: true,
    isDeleted: { $ne: true },
  }).select("_id name email role");
};

export const createReviewGrowthNotificationsRepository = async (payload: {
  hotelId: string | Types.ObjectId;
  userIds: Array<string | Types.ObjectId>;
  title: string;
  message: string;
  type?: "info" | "warning" | "success" | "error";
  link?: string;
  metadata?: Record<string, unknown>;
}) => {
  if (!payload.userIds.length) return [];
  return Notification.insertMany(
    payload.userIds.map((userId) => ({
      hotelId: payload.hotelId,
      userId,
      title: payload.title,
      message: payload.message,
      type: payload.type ?? "info",
      link: payload.link,
      metadata: payload.metadata,
    })),
  );
};

export const createReviewCampaignRepository = (
  payload: Record<string, unknown>,
) => ReviewCampaign.create(payload);

export const updateReviewCampaignRepository = async (
  campaign: IReviewCampaign,
) => {
  await campaign.save();
  return campaign;
};

export const incrementReviewCampaignStatRepository = async (
  campaignId: string,
  stat:
    | "queued"
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "reviewed"
    | "failed",
) =>
  ReviewCampaign.findOneAndUpdate(
    { _id: campaignId, isDeleted: { $ne: true } },
    { $inc: { [`stats.${stat}`]: 1 }, updatedAt: new Date() },
    { new: true },
  );

export const findReviewRequestByBookingRepository = (
  hotelId: string,
  bookingId: string,
) => ReviewRequest.findOne({ hotelId, bookingId, isDeleted: { $ne: true } });

export const findActiveReviewCampaignsByTriggerRepository = (
  hotelId: string,
  trigger: string,
) =>
  ReviewCampaign.find({
    hotelId,
    trigger,
    isActive: true,
    isDeleted: { $ne: true },
  }).sort({ createdAt: 1 });

export const findReviewCampaignByIdRepository = (id: string) =>
  ReviewCampaign.findOne({ _id: id, isDeleted: { $ne: true } });

export const findReviewCampaignByNameRepository = (
  hotelId: string,
  name: string,
  excludeId?: string,
) =>
  ReviewCampaign.findOne({
    hotelId,
    name: { $regex: `^${name}$`, $options: "i" },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    isDeleted: { $ne: true },
  });

export const listReviewCampaignsRepository = (
  filter: FilterQuery<IReviewCampaign>,
  options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
) =>
  paginate(
    ReviewCampaign,
    {
      page: options.page,
      limit: options.limit,
      search: options.search,
      searchFields: ["name", "description", "campaignNumber"],
      sortBy: options.sortBy ?? "createdAt",
      sortOrder: options.sortOrder ?? "desc",
    },
    filter,
  );

export const softDeleteReviewCampaignRepository = (
  id: string,
  deletedBy: string,
) =>
  ReviewCampaign.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy },
    { new: true },
  );

export const createReviewRequestRepository = (
  payload: Record<string, unknown>,
) => ReviewRequest.create(payload);

export const updateReviewRequestStatusRepository = (
  id: string,
  payload: Record<string, unknown>,
) =>
  ReviewRequest.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    payload,
    { new: true },
  );

export const findReviewRequestByIdRepository = (id: string) =>
  ReviewRequest.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate("guestId", "fullName name phone email")
    .populate("bookingId", "bookingNumber status checkOutDate")
    .populate("campaignId", "campaignNumber name trigger")
    .populate(
      "internalFeedbackId",
      "status priority feedback rating assignedTo resolutionNotes",
    );

export const findReviewRequestByTokenRepository = (token: string) =>
  ReviewRequest.findOne({ publicToken: token, isDeleted: { $ne: true } })
    .populate("guestId", "fullName name phone email")
    .populate("bookingId", "bookingNumber status checkOutDate")
    .populate("campaignId", "campaignNumber name trigger")
    .populate(
      "internalFeedbackId",
      "status priority feedback rating assignedTo resolutionNotes",
    );

export const listReviewRequestsRepository = (
  filter: FilterQuery<IReviewRequest>,
  options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
) =>
  paginate(
    ReviewRequest,
    {
      page: options.page,
      limit: options.limit,
      search: options.search,
      searchFields: [
        "publicToken",
        "recipientPhone",
        "recipientEmail",
        "failureReason",
      ],
      sortBy: options.sortBy ?? "createdAt",
      sortOrder: options.sortOrder ?? "desc",
    },
    filter,
  );

export const findReviewRequestHistoryRepository = (id: string) =>
  ReviewRequest.findOne({ _id: id, isDeleted: { $ne: true } }).select(
    "timeline status sentAt deliveredAt openedAt clickedAt reviewedAt failedAt expiredAt failureReason",
  );

export const createGuestReviewRepository = (payload: Record<string, unknown>) =>
  GuestReview.create(payload);

export const findGuestReviewByIdRepository = (id: string) =>
  GuestReview.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate("guestId", "fullName name phone email")
    .populate("bookingId", "bookingNumber status checkOutDate")
    .populate("reviewRequestId", "publicToken status channel");

export const listGuestReviewsRepository = (
  filter: FilterQuery<IGuestReview>,
  options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
) =>
  paginate(
    GuestReview,
    {
      page: options.page,
      limit: options.limit,
      search: options.search,
      searchFields: ["title", "comment", "reviewerName", "externalReviewId"],
      sortBy: options.sortBy ?? "reviewedAt",
      sortOrder: options.sortOrder ?? "desc",
    },
    filter,
  );

export const createInternalFeedbackRepository = (
  payload: Record<string, unknown>,
) => InternalFeedback.create(payload);

export const updateInternalFeedbackStatusRepository = (
  id: string,
  payload: Record<string, unknown>,
) =>
  InternalFeedback.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    payload,
    { new: true },
  );

export const findInternalFeedbackByIdRepository = (id: string) =>
  InternalFeedback.findOne({ _id: id, isDeleted: { $ne: true } })
    .populate("guestId", "fullName name phone email")
    .populate("bookingId", "bookingNumber status checkOutDate")
    .populate("assignedTo", "name email role");

export const listInternalFeedbackRepository = (
  filter: FilterQuery<IInternalFeedback>,
  options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
) =>
  paginate(
    InternalFeedback,
    {
      page: options.page,
      limit: options.limit,
      search: options.search,
      searchFields: ["feedback", "resolutionNotes"],
      sortBy: options.sortBy ?? "createdAt",
      sortOrder: options.sortOrder ?? "desc",
    },
    filter,
  );

export const assignInternalFeedbackRepository = (
  id: string,
  assignedTo: string,
  updatedBy: string,
) =>
  InternalFeedback.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    {
      assignedTo,
      status: "IN_PROGRESS",
      updatedBy,
      $push: {
        timeline: {
          action: "review_growth.feedback_assigned",
          message: "Feedback assigned",
          createdAt: new Date(),
          createdBy: updatedBy,
          metadata: { assignedTo },
        },
      },
    },
    { new: true },
  );

export const createReviewTemplateRepository = (
  payload: Record<string, unknown>,
) => ReviewTemplate.create(payload);

export const findReviewTemplateByIdRepository = (id: string) =>
  ReviewTemplate.findOne({ _id: id, isDeleted: { $ne: true } });

export const listReviewTemplatesRepository = (
  filter: FilterQuery<IReviewTemplate>,
  options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
) =>
  paginate(
    ReviewTemplate,
    {
      page: options.page,
      limit: options.limit,
      search: options.search,
      searchFields: ["name", "subject", "body"],
      sortBy: options.sortBy ?? "createdAt",
      sortOrder: options.sortOrder ?? "desc",
    },
    filter,
  );

export const updateReviewTemplateRepository = (
  id: string,
  payload: Record<string, unknown>,
) =>
  ReviewTemplate.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    payload,
    { new: true },
  );

export const softDeleteReviewTemplateRepository = (
  id: string,
  deletedBy: string,
) =>
  ReviewTemplate.findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy },
    { new: true },
  );

export const clearDefaultReviewTemplatesRepository = (
  hotelId: string,
  channel: string,
  platform: string,
) =>
  ReviewTemplate.updateMany(
    { hotelId, channel, platform, isDeleted: { $ne: true } },
    { isDefault: false },
  );

export const upsertReviewSettingsRepository = (
  hotelId: string,
  payload: Record<string, unknown>,
) =>
  ReviewSettings.findOneAndUpdate(
    { hotelId, isDeleted: { $ne: true } },
    { ...payload, hotelId },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

export const createFeedbackCategoryRepository = (
  payload: Record<string, unknown>,
) => (require("../../models").FeedbackCategory as any).create(payload);

export const listFeedbackCategoriesRepository = (hotelId?: string) =>
  (require("../../models").FeedbackCategory as any)
    .find(
      hotelId
        ? { hotelId, isDeleted: { $ne: true } }
        : { isDeleted: { $ne: true } },
    )
    .sort({ name: 1 });

export const updateFeedbackCategoryRepository = (
  id: string,
  payload: Record<string, unknown>,
) =>
  (require("../../models").FeedbackCategory as any).findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    payload,
    { new: true },
  );

export const softDeleteFeedbackCategoryRepository = (
  id: string,
  deletedBy: string,
) =>
  (require("../../models").FeedbackCategory as any).findOneAndUpdate(
    { _id: id, isDeleted: { $ne: true } },
    { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy },
    { new: true },
  );

export const getReviewDashboardRepository = async (
  hotelId: string,
  range: { from: Date; to: Date },
) => {
  const base = {
    hotelId: new Types.ObjectId(hotelId),
    isDeleted: { $ne: true },
  };
  const dateMatch = { createdAt: { $gte: range.from, $lte: range.to } };
  const reviewDateMatch = { reviewedAt: { $gte: range.from, $lte: range.to } };
  const monthStart = new Date(range.to.getFullYear(), range.to.getMonth(), 1);
  const todayStart = new Date(range.to);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(range.to);
  todayEnd.setHours(23, 59, 59, 999);
  const [
    ratingAgg,
    totalReviews,
    reviewsThisMonth,
    requestsSent,
    pendingRequests,
    todaysRequests,
    negativeFeedbackCount,
    ratingDistribution,
    monthlyTrend,
    recentReviews,
    privateRatingsReceived,
    positiveGuests,
    negativeGuests,
    googleRedirected,
    reviewsCompleted,
    needsRecovery,
    privateRatingAgg,
  ] = await Promise.all([
    GuestReview.aggregate([
      { $match: { ...base, ...reviewDateMatch } },
      { $group: { _id: null, averageRating: { $avg: "$rating" } } },
    ]),
    GuestReview.countDocuments({ ...base, ...reviewDateMatch }),
    GuestReview.countDocuments({
      ...base,
      reviewedAt: { $gte: monthStart, $lte: range.to },
    }),
    ReviewRequest.countDocuments({
      ...base,
      status: {
        $in: [
          "SENT",
          "DELIVERED",
          "OPENED",
          "CLICKED",
          "RATED",
          "GOOGLE_REDIRECTED",
          "REVIEWED",
          "NEEDS_RECOVERY",
        ],
      },
      ...dateMatch,
    }),
    ReviewRequest.countDocuments({
      ...base,
      status: { $in: ["PENDING", "QUEUED", "PROCESSING"] },
    }),
    ReviewRequest.countDocuments({
      ...base,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    }),
    InternalFeedback.countDocuments({
      ...base,
      status: { $in: ["OPEN", "IN_PROGRESS"] },
      rating: { $lte: 3 },
      ...dateMatch,
    }),
    GuestReview.aggregate([
      { $match: { ...base, ...reviewDateMatch } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    GuestReview.aggregate([
      { $match: { ...base, ...reviewDateMatch } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$reviewedAt" } },
          count: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    GuestReview.find({ ...base, ...reviewDateMatch })
      .sort({ reviewedAt: -1 })
      .limit(10)
      .populate("guestId", "fullName name")
      .lean(),
    ReviewRequest.countDocuments({
      ...base,
      privateRatingSubmittedAt: { $exists: true },
      ...dateMatch,
    }),
    ReviewRequest.countDocuments({
      ...base,
      satisfactionOutcome: "positive",
      ...dateMatch,
    }),
    ReviewRequest.countDocuments({
      ...base,
      satisfactionOutcome: "negative",
      ...dateMatch,
    }),
    ReviewRequest.countDocuments({
      ...base,
      googleRedirectedAt: { $exists: true },
      ...dateMatch,
    }),
    ReviewRequest.countDocuments({ ...base, status: "REVIEWED", ...dateMatch }),
    ReviewRequest.countDocuments({
      ...base,
      $or: [{ status: "NEEDS_RECOVERY" }, { recoveryStatus: "NEEDS_RECOVERY" }],
      ...dateMatch,
    }),
    ReviewRequest.aggregate([
      { $match: { ...base, privateRating: { $exists: true }, ...dateMatch } },
      { $group: { _id: null, averageRating: { $avg: "$privateRating" } } },
    ]),
  ]);
  // Internal feedback operational metrics
  const [
    totalInternalFeedback,
    openIssues,
    resolvedIssues,
    criticalIssues,
    avgResolutionTimeAgg,
    feedbackByCategory,
    feedbackByRating,
    topComplaintCategories,
    recentFeedback,
  ] = await Promise.all([
    InternalFeedback.countDocuments({ ...base }),
    InternalFeedback.countDocuments({
      ...base,
      status: { $in: ["OPEN", "IN_PROGRESS"] },
    }),
    InternalFeedback.countDocuments({
      ...base,
      status: { $in: ["RESOLVED", "CLOSED"] },
    }),
    InternalFeedback.countDocuments({ ...base, priority: "urgent" }),
    InternalFeedback.aggregate([
      { $match: { ...base, resolvedAt: { $exists: true } } },
      { $project: { diffMs: { $subtract: ["$resolvedAt", "$createdAt"] } } },
      { $group: { _id: null, avgMs: { $avg: "$diffMs" } } },
    ]),
    InternalFeedback.aggregate([
      { $match: { ...base } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    InternalFeedback.aggregate([
      { $match: { ...base, rating: { $exists: true } } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    InternalFeedback.aggregate([
      { $match: { ...base } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    InternalFeedback.find({ ...base })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("guestId", "fullName name")
      .lean(),
  ]);
  return {
    ratingAgg,
    totalReviews,
    reviewsThisMonth,
    requestsSent,
    pendingRequests,
    todaysRequests,
    negativeFeedbackCount,
    totalInternalFeedback,
    openIssues,
    resolvedIssues,
    criticalIssues,
    averageResolutionTimeMs: avgResolutionTimeAgg[0]?.avgMs ?? null,
    feedbackByCategory,
    feedbackByRating,
    ratingDistribution,
    monthlyTrend,
    recentReviews,
    privateRatingsReceived,
    positiveGuests,
    negativeGuests,
    googleRedirected,
    reviewsCompleted,
    needsRecovery,
    averagePrivateRating: privateRatingAgg[0]?.averageRating ?? 0,
  };
};

export const getReviewAnalyticsRepository = async (
  hotelId: string,
  range: { from: Date; to: Date },
  campaignId?: string,
) => {
  const base = {
    hotelId: new Types.ObjectId(hotelId),
    isDeleted: { $ne: true },
  };
  const requestBase = {
    ...base,
    ...(campaignId ? { campaignId: new Types.ObjectId(campaignId) } : {}),
  };

  const [
    monthlyReviews,
    ratingTrend,
    conversion,
    topGuests,
    lowRating,
    campaignPerformance,
    sourceDistribution,
    requestPerformance,
    satisfactionFunnel,
  ] = await Promise.all([
    GuestReview.aggregate([
      { $match: { ...base, reviewedAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$reviewedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    GuestReview.aggregate([
      { $match: { ...base, reviewedAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$reviewedAt" } },
          averageRating: { $avg: "$rating" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ReviewRequest.aggregate([
      {
        $match: {
          ...requestBase,
          createdAt: { $gte: range.from, $lte: range.to },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    GuestReview.aggregate([
      { $match: { ...base, reviewedAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: "$guestId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
      { $sort: { averageRating: -1, totalReviews: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "guests",
          localField: "_id",
          foreignField: "_id",
          as: "guest",
        },
      },
      { $unwind: "$guest" },
      {
        $project: {
          guestId: "$_id",
          guestName: "$guest.fullName",
          averageRating: 1,
          totalReviews: 1,
        },
      },
    ]),
    GuestReview.aggregate([
      {
        $match: {
          ...base,
          rating: { $lte: 3 },
          reviewedAt: { $gte: range.from, $lte: range.to },
        },
      },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
          tags: { $push: "$tags" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ReviewRequest.aggregate([
      { $match: { ...base, createdAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: "$campaignId",
          requests: { $sum: 1 },
          reviewed: {
            $sum: { $cond: [{ $eq: ["$status", "REVIEWED"] }, 1, 0] },
          },
          failed: { $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "reviewcampaigns",
          localField: "_id",
          foreignField: "_id",
          as: "campaign",
        },
      },
      { $unwind: { path: "$campaign", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          campaignId: "$_id",
          campaignName: "$campaign.name",
          requests: 1,
          reviewed: 1,
          failed: 1,
        },
      },
    ]),
    GuestReview.aggregate([
      { $match: { ...base, reviewedAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: "$platform", count: { $sum: 1 } } },
    ]),
    ReviewRequest.aggregate([
      {
        $match: {
          ...requestBase,
          createdAt: { $gte: range.from, $lte: range.to },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    ReviewRequest.aggregate([
      {
        $match: {
          ...requestBase,
          createdAt: { $gte: range.from, $lte: range.to },
        },
      },
      {
        $group: {
          _id: null,
          totalRated: {
            $sum: {
              $cond: [{ $ifNull: ["$privateRatingSubmittedAt", false] }, 1, 0],
            },
          },
          positive: {
            $sum: {
              $cond: [{ $eq: ["$satisfactionOutcome", "positive"] }, 1, 0],
            },
          },
          negative: {
            $sum: {
              $cond: [{ $eq: ["$satisfactionOutcome", "negative"] }, 1, 0],
            },
          },
          googleRedirected: {
            $sum: {
              $cond: [{ $ifNull: ["$googleRedirectedAt", false] }, 1, 0],
            },
          },
          reviewed: {
            $sum: { $cond: [{ $eq: ["$status", "REVIEWED"] }, 1, 0] },
          },
          needsRecovery: {
            $sum: { $cond: [{ $in: ["$status", ["NEEDS_RECOVERY"]] }, 1, 0] },
          },
          avgPrivateRating: { $avg: "$privateRating" },
        },
      },
    ]),
  ]);

  // Internal feedback analytics
  const [
    categoryDistribution,
    priorityDistribution,
    resolutionRateAgg,
    avgResolutionTimeAgg,
    mostCommonComplaint,
    weeklyTrend,
    monthlyTrendFeedback,
  ] = await Promise.all([
    InternalFeedback.aggregate([
      { $match: { ...base, createdAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    InternalFeedback.aggregate([
      { $match: { ...base, createdAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    InternalFeedback.aggregate([
      { $match: { ...base, createdAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $in: ["$status", ["RESOLVED", "CLOSED"]] }, 1, 0],
            },
          },
        },
      },
    ]),
    InternalFeedback.aggregate([
      {
        $match: {
          ...base,
          resolvedAt: { $exists: true, $gte: range.from, $lte: range.to },
        },
      },
      { $project: { diffMs: { $subtract: ["$resolvedAt", "$createdAt"] } } },
      { $group: { _id: null, avgMs: { $avg: "$diffMs" } } },
    ]),
    InternalFeedback.aggregate([
      { $match: { ...base, createdAt: { $gte: range.from, $lte: range.to } } },
      { $group: { _id: "$feedback", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    InternalFeedback.aggregate([
      { $match: { ...base, createdAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    InternalFeedback.aggregate([
      { $match: { ...base, createdAt: { $gte: range.from, $lte: range.to } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    monthlyReviews,
    ratingTrend,
    conversion,
    topGuests,
    lowRating,
    campaignPerformance,
    sourceDistribution,
    requestPerformance,
    satisfactionFunnel,
    categoryDistribution,
    priorityDistribution,
    resolutionRateAgg,
    avgResolutionTimeAgg,
    mostCommonComplaint,
    weeklyTrend,
    monthlyTrendFeedback,
  };
};

export const findReviewExportRowsRepository = (
  filter: Record<string, unknown>,
) =>
  GuestReview.find(filter)
    .sort({ reviewedAt: -1 })
    .populate("guestId", "fullName phone email")
    .populate("bookingId", "bookingNumber")
    .lean();
