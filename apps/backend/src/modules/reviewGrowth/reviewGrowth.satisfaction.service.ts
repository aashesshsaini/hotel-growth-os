import { Types } from "mongoose";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { Hotel, InternalFeedback, ReviewRequest, User } from "../../models";
import {
  createInternalFeedbackRepository,
  createReviewGrowthAudit,
  createReviewGrowthNotificationsRepository,
  findReviewNotificationUsersRepository,
  findReviewRequestByTokenRepository,
} from "./reviewGrowth.repository";
import {
  getOrCreateReviewSettings,
  transitionReviewRequestStatus,
} from "./reviewGrowth.automation";
import {
  PublicFeedbackInput,
  PrivateRatingInput,
} from "./reviewGrowth.satisfaction.validation";
import { buildNegativeFeedbackRecoveryMetadata } from "./reviewGrowth.satisfaction.utils";
import { whatsappProvider } from "../../services/whatsapp.service";

const satisfactionLink = (token: string) =>
  `${process.env.FRONTEND_URL || "http://localhost:3000"}/review/${token}`;

const appendTimeline = async (
  requestId: string,
  action: string,
  message: string,
  metadata?: Record<string, unknown>,
) => {
  await ReviewRequest.findOneAndUpdate(
    { _id: requestId, isDeleted: { $ne: true } },
    {
      $push: { timeline: { action, message, createdAt: new Date(), metadata } },
    },
  );
};

const notifyManagers = async (
  hotelId: string,
  payload: {
    title: string;
    message: string;
    type?: "info" | "warning" | "success" | "error";
    metadata?: Record<string, unknown>;
  },
) => {
  const users = await findReviewNotificationUsersRepository(hotelId);
  if (!users.length) return;
  await createReviewGrowthNotificationsRepository({
    hotelId,
    userIds: users.map((user) => user._id as Types.ObjectId),
    ...payload,
  });
};

export const getPublicSatisfactionPage = async (token: string) => {
  const request = await findReviewRequestByTokenRepository(token);
  if (!request) throw new NotFoundError("Review request not found");
  if (["EXPIRED", "FAILED"].includes(request.status))
    throw new ValidationError("This review request is no longer available");

  const hotel = await Hotel.findById(request.hotelId).lean();
  const guest = request.guestId as unknown as {
    fullName?: string;
    name?: string;
  } | null;
  const settings = await getOrCreateReviewSettings(String(request.hotelId));

  return {
    token,
    hotelName: hotel?.name || "Hotel",
    hotelLogo: hotel?.settings?.logo,
    guestName: guest?.fullName || guest?.name,
    status: request.status,
    privateRating: request.privateRating,
    satisfactionOutcome: request.satisfactionOutcome,
    recoveryStatus: request.recoveryStatus,
    googleReviewUrl: settings.googleReviewUrl || request.reviewUrl,
    alreadyRated: Boolean(request.privateRatingSubmittedAt),
    alreadyReviewed: request.status === "REVIEWED",
    satisfactionUrl: satisfactionLink(token),
  };
};

export const submitPrivateRating = async (
  token: string,
  input: PrivateRatingInput,
) => {
  const request = await findReviewRequestByTokenRepository(token);
  if (!request) throw new NotFoundError("Review request not found");
  if (request.privateRatingSubmittedAt)
    throw new ValidationError("Private rating already submitted");

  const settings = await getOrCreateReviewSettings(String(request.hotelId));
  const threshold = settings.positiveRatingThreshold ?? 4;
  const isPositive = input.rating >= threshold;

  request.privateRating = input.rating;
  request.privateRatingSubmittedAt = new Date();
  request.satisfactionOutcome = isPositive ? "positive" : "negative";
  request.openedAt = request.openedAt ?? new Date();
  await request.save();

  await transitionReviewRequestStatus(String(request._id), "RATED", {
    message: "Private satisfaction rating submitted",
    metadata: {
      rating: input.rating,
      outcome: request.satisfactionOutcome,
      threshold,
    },
    skipAudit: false,
  });

  await createReviewGrowthAudit({
    hotelId: request.hotelId,
    action: "review_growth.private_rating_submitted",
    entity: "ReviewRequest",
    entityId: request._id,
    changes: { rating: input.rating, outcome: request.satisfactionOutcome },
  });

  if (isPositive) {
    await appendTimeline(
      String(request._id),
      "review_growth.positive_guest",
      "Guest rated positively",
      { rating: input.rating },
    );
    await createReviewGrowthAudit({
      hotelId: request.hotelId,
      action: "review_growth.positive_guest",
      entity: "ReviewRequest",
      entityId: request._id,
      changes: { rating: input.rating },
    });
  } else {
    await transitionReviewRequestStatus(String(request._id), "NEEDS_RECOVERY", {
      message: "Guest rated below threshold — recovery required",
      metadata: { rating: input.rating, threshold },
    });
    request.recoveryStatus = "NEEDS_RECOVERY";
    await request.save();
    await appendTimeline(
      String(request._id),
      "review_growth.negative_guest",
      "Guest rated negatively",
      { rating: input.rating },
    );
    await createReviewGrowthAudit({
      hotelId: request.hotelId,
      action: "review_growth.negative_guest",
      entity: "ReviewRequest",
      entityId: request._id,
      changes: { rating: input.rating },
    });
    await notifyManagers(String(request.hotelId), {
      title: "Negative Guest Satisfaction",
      message: `A guest submitted a ${input.rating}-star private rating and needs recovery.`,
      type: "warning",
      metadata: { reviewRequestId: request._id, rating: input.rating },
    });
    // Auto-create internal feedback for negative ratings
    try {
      // Determine priority mapping: 1 -> urgent, 2 -> high, 3 -> medium
      const priority =
        input.rating === 1 ? "urgent" : input.rating === 2 ? "high" : "medium";
      // Only create if not already linked
      if (!request.internalFeedbackId) {
        const feedback = await createInternalFeedbackRepository({
          hotelId: request.hotelId,
          guestId: resolveGuestId(request.guestId),
          bookingId: request.bookingId,
          reviewRequestId: request._id,
          rating: input.rating,
          category: "other",
          feedback: "Auto-generated internal feedback from private rating",
          status: "OPEN",
          priority,
          tags: ["auto_generated", "satisfaction_funnel"],
          timeline: [
            {
              action: "review_growth.feedback_auto_created",
              message:
                "Internal feedback auto-created from negative private rating",
              createdAt: new Date(),
              metadata: { rating: input.rating, reviewRequestId: request._id },
            },
          ],
        });
        request.internalFeedbackId = feedback._id as Types.ObjectId;
        request.recoveryStatus = "NEEDS_RECOVERY";
        await request.save();

        await createReviewGrowthAudit({
          hotelId: request.hotelId,
          action: "review_growth.internal_feedback_auto_created",
          entity: "InternalFeedback",
          entityId: feedback._id,
          changes: {
            reviewRequestId: request._id,
            rating: input.rating,
            priority,
          },
        });

        // Notify hotel owner specifically for critical (urgent) feedback
        if (priority === "urgent") {
          const owner = await User.findOne({
            hotelId: request.hotelId,
            role: "hotel_owner",
            isActive: true,
            isDeleted: { $ne: true },
          }).select("_id");
          if (owner) {
            await createReviewGrowthNotificationsRepository({
              hotelId: request.hotelId,
              userIds: [owner._id],
              title: "Critical Internal Feedback",
              message: `Critical internal feedback auto-generated for a ${input.rating}-star rating.`,
              type: "error",
              metadata: {
                feedbackId: feedback._id,
                reviewRequestId: request._id,
              },
            });
          }
        }
      }
    } catch (err) {
      // swallow errors here to avoid breaking satisfaction flow, but log audit
      await createReviewGrowthAudit({
        hotelId: request.hotelId,
        action: "review_growth.internal_feedback_auto_create_failed",
        entity: "ReviewRequest",
        entityId: request._id,
        changes: { error: String(err) },
      });
    }
  }

  const settingsAfter = await getOrCreateReviewSettings(
    String(request.hotelId),
  );
  return {
    outcome: isPositive ? "positive" : "negative",
    rating: input.rating,
    threshold,
    googleReviewUrl: isPositive
      ? settingsAfter.googleReviewUrl || request.reviewUrl
      : undefined,
    message: isPositive
      ? "Thank you! We're glad you enjoyed your stay."
      : "We're sorry your experience wasn't perfect. Please help us improve.",
  };
};

export const trackGoogleReviewClick = async (token: string) => {
  const request = await findReviewRequestByTokenRepository(token);
  if (!request) throw new NotFoundError("Review request not found");
  if (request.satisfactionOutcome !== "positive")
    throw new ValidationError(
      "Google review is not available for this request",
    );

  const settings = await getOrCreateReviewSettings(String(request.hotelId));
  const googleUrl = settings.googleReviewUrl || request.reviewUrl;
  if (!googleUrl)
    throw new ValidationError("Google review URL is not configured");

  request.googleRedirectedAt = new Date();
  request.clickedAt = request.clickedAt ?? new Date();
  await request.save();

  await transitionReviewRequestStatus(
    String(request._id),
    "GOOGLE_REDIRECTED",
    {
      message: "Guest redirected to Google review",
      metadata: { googleReviewUrl: googleUrl },
    },
  );

  await createReviewGrowthAudit({
    hotelId: request.hotelId,
    action: "review_growth.redirected_to_google",
    entity: "ReviewRequest",
    entityId: request._id,
    changes: {
      googleReviewUrl: googleUrl,
      campaignId: request.campaignId,
      guestId: request.guestId,
    },
  });

  return {
    googleReviewUrl: googleUrl,
    redirectedAt: request.googleRedirectedAt,
  };
};

export const confirmGoogleReviewSubmitted = async (token: string) => {
  const request = await findReviewRequestByTokenRepository(token);
  if (!request) throw new NotFoundError("Review request not found");
  if (request.satisfactionOutcome !== "positive")
    throw new ValidationError(
      "Review confirmation is not available for this request",
    );
  if (request.status === "REVIEWED")
    return { status: "REVIEWED", alreadySubmitted: true };

  request.googleReviewSubmittedAt = new Date();
  request.reviewedAt = new Date();
  await request.save();

  await transitionReviewRequestStatus(String(request._id), "REVIEWED", {
    message: "Guest confirmed Google review submission",
    metadata: { source: "guest_confirmation" },
  });

  await createReviewGrowthAudit({
    hotelId: request.hotelId,
    action: "review_growth.review_completed",
    entity: "ReviewRequest",
    entityId: request._id,
    changes: { campaignId: request.campaignId },
  });

  return { status: "REVIEWED", reviewedAt: request.reviewedAt };
};

export const submitPublicNegativeFeedback = async (
  token: string,
  input: PublicFeedbackInput,
) => {
  const request = await findReviewRequestByTokenRepository(token);
  if (!request) throw new NotFoundError("Review request not found");
  if (
    request.satisfactionOutcome !== "negative" &&
    !request.privateRatingSubmittedAt
  ) {
    await submitPrivateRating(token, { rating: input.rating });
    const refreshed = await findReviewRequestByTokenRepository(token);
    if (!refreshed) throw new NotFoundError("Review request not found");
    Object.assign(request, refreshed.toObject());
  }

  const recoveryMetadata = buildNegativeFeedbackRecoveryMetadata(input, {});

  let feedback;
  if (request.internalFeedbackId) {
    feedback = await InternalFeedback.findOneAndUpdate(
      { _id: request.internalFeedbackId, isDeleted: { $ne: true } },
      {
        $set: {
          rating: input.rating,
          category: input.category ?? "service",
          feedback: input.feedback,
          submitterName: input.submitterName,
          submitterPhone: input.submitterPhone,
          status: "OPEN",
          priority: recoveryMetadata.priority,
        },
        $addToSet: {
          tags: { $each: ["satisfaction_funnel", "needs_recovery"] },
        },
        $push: {
          timeline: {
            action: "review_growth.feedback_submitted",
            message: "Internal feedback updated from satisfaction funnel",
            createdAt: new Date(),
            metadata: {
              reviewRequestId: request._id,
              campaignId: request.campaignId,
              contactRequested: recoveryMetadata.contactRequested,
              whatsappPayload: recoveryMetadata.whatsappPayload,
            },
          },
        },
      },
      { new: true },
    );
    if (!feedback) {
      feedback = await createInternalFeedbackRepository({
        hotelId: request.hotelId,
        guestId: resolveGuestId(request.guestId),
        bookingId: request.bookingId,
        reviewRequestId: request._id,
        rating: input.rating,
        category: input.category ?? "service",
        feedback: input.feedback,
        submitterName: input.submitterName,
        submitterPhone: input.submitterPhone,
        status: "OPEN",
        priority: recoveryMetadata.priority,
        tags: ["satisfaction_funnel", "needs_recovery"],
        timeline: [
          {
            action: "review_growth.feedback_submitted",
            message: "Internal feedback submitted from satisfaction funnel",
            createdAt: new Date(),
            metadata: {
              reviewRequestId: request._id,
              campaignId: request.campaignId,
              contactRequested: recoveryMetadata.contactRequested,
              whatsappPayload: recoveryMetadata.whatsappPayload,
            },
          },
        ],
      });
    }
    request.internalFeedbackId = feedback._id as Types.ObjectId;
  } else {
    feedback = await createInternalFeedbackRepository({
      hotelId: request.hotelId,
      guestId: resolveGuestId(request.guestId),
      bookingId: request.bookingId,
      reviewRequestId: request._id,
      rating: input.rating,
      category: input.category ?? "service",
      feedback: input.feedback,
      submitterName: input.submitterName,
      submitterPhone: input.submitterPhone,
      status: "OPEN",
      priority: recoveryMetadata.priority,
      tags: ["satisfaction_funnel", "needs_recovery"],
      timeline: [
        {
          action: "review_growth.feedback_submitted",
          message: "Internal feedback submitted from satisfaction funnel",
          createdAt: new Date(),
          metadata: {
            reviewRequestId: request._id,
            campaignId: request.campaignId,
            contactRequested: recoveryMetadata.contactRequested,
            whatsappPayload: recoveryMetadata.whatsappPayload,
          },
        },
      ],
    });
    request.internalFeedbackId = feedback._id as Types.ObjectId;
  }

  request.recoveryStatus = "NEEDS_RECOVERY";
  if (request.status !== "NEEDS_RECOVERY") {
    await transitionReviewRequestStatus(String(request._id), "NEEDS_RECOVERY", {
      message: "Internal feedback submitted — needs recovery",
      metadata: {
        feedbackId: feedback._id,
        contactRequested: recoveryMetadata.contactRequested,
      },
    });
  }
  await request.save();

  await createReviewGrowthAudit({
    hotelId: request.hotelId,
    action: "review_growth.internal_feedback_submitted",
    entity: "InternalFeedback",
    entityId: feedback._id,
    changes: {
      reviewRequestId: request._id,
      rating: input.rating,
      contactRequested: recoveryMetadata.contactRequested,
      whatsappPayload: recoveryMetadata.whatsappPayload,
    },
  });

  await notifyManagers(String(request.hotelId), {
    title: "Internal Feedback Submitted",
    message:
      "A guest submitted internal feedback from the satisfaction funnel.",
    type: "warning",
    metadata: {
      feedbackId: feedback._id,
      reviewRequestId: request._id,
      contactRequested: recoveryMetadata.contactRequested,
      whatsappPayload: recoveryMetadata.whatsappPayload,
    },
  });

  if (recoveryMetadata.contactRequested && recoveryMetadata.whatsappPayload) {
    try {
      const templateVariables = recoveryMetadata.whatsappPayload.variables as
        | Record<string, unknown>
        | undefined;
      const guestName = String(templateVariables?.guest_name ?? "Guest");
      const hotelName = String(templateVariables?.hotel_name ?? "Hotel");
      const rating = String(templateVariables?.rating ?? input.rating);
      const alertResult = await whatsappProvider.sendInternalFeedbackAlert({
        phone: String(recoveryMetadata.whatsappPayload.to || ""),
        content: `Hello ${guestName}, we are following up about your stay at ${hotelName}. Your feedback rating was ${rating}. We would appreciate the chance to recover your experience.`,
        messageType: "text",
      });
      if (!alertResult.success) {
        await transitionReviewRequestStatus(String(request._id), "FAILED", {
          failureReason: alertResult.error || "WhatsApp alert delivery failed",
          metadata: {
            source: "internal_feedback_alert",
            contactRequested: recoveryMetadata.contactRequested,
          },
        });
      }
    } catch (error) {
      await transitionReviewRequestStatus(String(request._id), "FAILED", {
        failureReason:
          error instanceof Error
            ? error.message
            : "WhatsApp alert delivery failed",
        metadata: {
          source: "internal_feedback_alert",
          contactRequested: recoveryMetadata.contactRequested,
        },
      });
    }
  }

  return {
    feedbackId: feedback._id,
    status: "NEEDS_RECOVERY",
    recoveryStatus: request.recoveryStatus,
  };
};

const resolveGuestId = (guestId: unknown) => {
  if (typeof guestId === "object" && guestId !== null && "_id" in guestId)
    return (guestId as { _id: Types.ObjectId })._id;
  return guestId as Types.ObjectId;
};
