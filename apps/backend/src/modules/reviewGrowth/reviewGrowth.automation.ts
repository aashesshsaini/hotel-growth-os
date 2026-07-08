import { Types } from "mongoose";
import {
  ReviewGrowthCampaignTrigger,
  ReviewRequestStatus,
} from "@hotel-growth-os/shared";
import { config } from "../../config";
import { Hotel, ReviewCampaign, ReviewRequest } from "../../models";
import { IReviewCampaign } from "../../models/ReviewCampaign";
import { IReviewRequest } from "../../models/ReviewRequest";
import { IReviewSettings } from "../../models/ReviewSettings";
import {
  createAutomationJob,
  processAutomationJob,
} from "../automation/automation.service";
import { registerAutomationJobHandler } from "../automation/automation.registry";
import { IAutomationJob } from "../../models/AutomationJob";
import { whatsappProvider } from "../../services/whatsapp.service";
import { logger } from "../../utils/logger";
import {
  createReviewGrowthAudit,
  findGuestForReviewGrowth,
  findReviewRequestByIdRepository,
  findReviewSettingsRepository,
  findReviewTemplateByIdRepository,
  generateReviewRequestToken,
  incrementReviewCampaignStatRepository,
  upsertReviewSettingsRepository,
} from "./reviewGrowth.repository";

export const getReminderEligibility = (status: string) => {
  const eligible = ![
    "REVIEWED",
    "FAILED",
    "EXPIRED",
    "NEEDS_RECOVERY",
  ].includes(status);
  return { eligible, reason: eligible ? undefined : status };
};

export const finalizeReviewRequestSendFailure = async ({
  reviewRequestId,
  reminder,
  error,
  transitionStatus = transitionReviewRequestStatus,
}: {
  reviewRequestId: string;
  reminder: boolean;
  error?: string;
  transitionStatus?: typeof transitionReviewRequestStatus;
}) => {
  await transitionStatus(reviewRequestId, "FAILED", {
    failureReason: error || "WhatsApp delivery failed",
    metadata: { reminder },
  });
  return {
    sent: false,
    reviewRequestId,
    reminder,
    error: error || "WhatsApp delivery failed",
  };
};

export const REVIEW_REQUEST_SEND_JOB = "SEND_REVIEW_REQUEST";
export const REVIEW_REQUEST_REMINDER_JOB = "SEND_REMINDER";
export const REVIEW_REQUEST_ENGAGEMENT_JOB = "REVIEW_REQUEST_ENGAGEMENT";

const ENGAGEMENT_STEPS = ["DELIVERED", "OPENED", "CLICKED"] as const;
const ENGAGEMENT_DELAYS_MS: Record<"DELIVERED" | "OPENED" | "CLICKED", number> =
  {
    DELIVERED: 2000,
    OPENED: 5000,
    CLICKED: 8000,
  };

interface CheckoutTriggerInput {
  bookingId: Types.ObjectId;
  hotelId: Types.ObjectId;
  guestId: Types.ObjectId;
  bookingStatus: "checked_out" | "completed";
  userId?: string;
}

const systemTimeline = (
  action: string,
  message?: string,
  userId?: string,
  metadata?: Record<string, unknown>,
) => ({
  action,
  message,
  createdAt: new Date(),
  ...(userId ? { createdBy: new Types.ObjectId(userId) } : {}),
  metadata,
});

const renderTemplate = (body: string, data: Record<string, string>) =>
  Object.entries(data).reduce(
    (text, [key, value]) =>
      text.replace(new RegExp(`{{\\s*${key}\\s*}}`, "gi"), value),
    body,
  );

const parseTime = (value?: string) => {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours, minutes };
};

export const adjustForBusinessHours = (
  date: Date,
  hotel: {
    settings?: {
      preferences?: {
        businessHours?: {
          openTime?: string;
          closeTime?: string;
          days?: string[];
        };
      };
    };
  } | null,
): Date => {
  const businessHours = hotel?.settings?.preferences?.businessHours;
  if (!businessHours?.openTime || !businessHours?.closeTime) return date;

  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const allowedDays = (businessHours.days ?? dayNames.slice(1, 7)).map((day) =>
    day.toLowerCase(),
  );
  const open = parseTime(businessHours.openTime);
  const close = parseTime(businessHours.closeTime);
  if (!open || !close) return date;

  const candidate = new Date(date);
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const dayName = dayNames[candidate.getDay()];
    if (!allowedDays.includes(dayName)) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(open.hours, open.minutes, 0, 0);
      continue;
    }
    const minutes = candidate.getHours() * 60 + candidate.getMinutes();
    const openMinutes = open.hours * 60 + open.minutes;
    const closeMinutes = close.hours * 60 + close.minutes;
    if (minutes < openMinutes) {
      candidate.setHours(open.hours, open.minutes, 0, 0);
      return candidate;
    }
    if (minutes >= closeMinutes) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(open.hours, open.minutes, 0, 0);
      continue;
    }
    return candidate;
  }
  return date;
};

export const getOrCreateReviewSettings = async (
  hotelId: string,
  userId?: string,
): Promise<IReviewSettings> => {
  const existing = await findReviewSettingsRepository(hotelId);
  if (existing) return existing;
  return upsertReviewSettingsRepository(hotelId, {
    isEnabled: true,
    defaultPlatform: "GOOGLE",
    defaultDelayMinutes: 120,
    reminderDelayMinutes: 1440,
    recoveryDelayMinutes: 2880,
    requestExpiryDays: 14,
    autoSendOnCheckout: true,
    autoSendOnBookingCompleted: true,
    positiveRatingThreshold: 4,
    negativeRatingThreshold: 3,
    channels: { whatsapp: true, sms: false, email: false },
    createdBy: userId,
    updatedBy: userId,
  });
};

const resolveTemplate = async (
  hotelId: string,
  campaign: IReviewCampaign | null,
  channel: "whatsapp" | "sms" | "email",
  platform: string,
) => {
  if (campaign?.templateId) {
    const template = await findReviewTemplateByIdRepository(
      String(campaign.templateId),
    );
    if (template?.isActive) return template;
  }
  const { ReviewTemplate } = await import("../../models");
  return ReviewTemplate.findOne({
    hotelId,
    channel,
    platform,
    isActive: true,
    isDeleted: { $ne: true },
  }).sort({ isDefault: -1, updatedAt: -1 });
};

const resolveActiveCampaign = async (
  hotelId: string,
  trigger: ReviewGrowthCampaignTrigger,
) =>
  ReviewCampaign.findOne({
    hotelId,
    trigger,
    isActive: true,
    isDeleted: { $ne: true },
  }).sort({ createdAt: 1 });

export const transitionReviewRequestStatus = async (
  requestId: string,
  status: ReviewRequestStatus,
  options?: {
    userId?: string;
    message?: string;
    failureReason?: string;
    metadata?: Record<string, unknown>;
    skipAudit?: boolean;
  },
) => {
  const now = new Date();
  const timestamps: Record<string, Date> = {};
  if (status === "QUEUED") timestamps.queuedAt = now;
  if (status === "SENT") timestamps.sentAt = now;
  if (status === "DELIVERED") timestamps.deliveredAt = now;
  if (status === "OPENED") timestamps.openedAt = now;
  if (status === "CLICKED") timestamps.clickedAt = now;
  if (status === "REVIEWED") timestamps.reviewedAt = now;
  if (status === "GOOGLE_REDIRECTED") {
    timestamps.clickedAt = now;
  }
  if (status === "FAILED") timestamps.failedAt = now;
  if (status === "EXPIRED") timestamps.expiredAt = now;

  const request = await ReviewRequest.findOneAndUpdate(
    { _id: requestId, isDeleted: { $ne: true } },
    {
      status,
      ...(options?.failureReason
        ? { failureReason: options.failureReason }
        : {}),
      ...timestamps,
      updatedBy: options?.userId
        ? new Types.ObjectId(options.userId)
        : undefined,
      $push: {
        timeline: systemTimeline(
          `review_growth.request_${status.toLowerCase()}`,
          options?.message ?? `Review request ${status.toLowerCase()}`,
          options?.userId,
          options?.metadata,
        ),
      },
    },
    { new: true },
  );
  if (!request) return null;

  if (!options?.skipAudit) {
    await createReviewGrowthAudit({
      hotelId: request.hotelId,
      userId: options?.userId,
      action:
        status === "SENT"
          ? "review_growth.review_sent"
          : `review_growth.request_${status.toLowerCase()}`,
      entity: "ReviewRequest",
      entityId: request._id,
      changes: { status, failureReason: options?.failureReason },
    });
  }

  if (request.campaignId) {
    const statMap: Partial<
      Record<
        ReviewRequestStatus,
        | "queued"
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "reviewed"
        | "failed"
      >
    > = {
      QUEUED: "queued",
      PROCESSING: "queued",
      SENT: "sent",
      DELIVERED: "delivered",
      OPENED: "opened",
      CLICKED: "clicked",
      REVIEWED: "reviewed",
      FAILED: "failed",
    };
    const statKey = statMap[status];
    if (statKey)
      await incrementReviewCampaignStatRepository(
        String(request.campaignId),
        statKey,
      );
  }

  return request;
};

const scheduleInlineAutomation = async (job: IAutomationJob) => {
  if (process.env.ENABLE_WORKERS === "true") return;
  const delayMs = Math.max(
    0,
    (job.scheduledAt?.getTime() ?? Date.now()) - Date.now(),
  );
  setTimeout(async () => {
    try {
      await processAutomationJob(String(job._id));
    } catch (error) {
      logger.error("Inline review automation job failed", error);
    }
  }, delayMs);
};

const scheduleEngagementSimulation = async (
  request: IReviewRequest,
  startDelayMs = 1500,
) => {
  let delay = startDelayMs;
  for (const step of ENGAGEMENT_STEPS) {
    const job = await createAutomationJob({
      jobType: REVIEW_REQUEST_ENGAGEMENT_JOB,
      payload: { reviewRequestId: String(request._id), step },
      options: {
        hotelId: String(request.hotelId),
        delayMs: delay,
        deduplicationKey: `review-request-engagement-${request._id}-${step}`,
        maxAttempts: 1,
      },
    });
    await scheduleInlineAutomation(job);
    delay += ENGAGEMENT_DELAYS_MS[step];
  }
};

const scheduleReminder = async (
  request: IReviewRequest,
  settings: IReviewSettings,
) => {
  const reminderDelayMs =
    (settings.reminderDelayMinutes ?? settings.defaultDelayMinutes) * 60 * 1000;
  const job = await createAutomationJob({
    jobType: REVIEW_REQUEST_REMINDER_JOB,
    payload: { reviewRequestId: String(request._id), reminder: true },
    options: {
      hotelId: String(request.hotelId),
      delayMs: reminderDelayMs,
      deduplicationKey: `review-request-reminder-${request._id}`,
      maxAttempts: config.automation.defaultRetryCount,
    },
  });
  await scheduleInlineAutomation(job);
};

const scheduleExpiry = async (
  request: IReviewRequest,
  settings: IReviewSettings,
  from: Date,
) => {
  const expiryAt = new Date(
    from.getTime() + settings.requestExpiryDays * 24 * 60 * 60 * 1000,
  );
  const job = await createAutomationJob({
    jobType: REVIEW_REQUEST_ENGAGEMENT_JOB,
    payload: { reviewRequestId: String(request._id), step: "EXPIRED" },
    options: {
      hotelId: String(request.hotelId),
      scheduledAt: expiryAt,
      deduplicationKey: `review-request-expire-${request._id}`,
      maxAttempts: 1,
    },
  });
  await scheduleInlineAutomation(job);
};

const resolveGuestId = (guestId: unknown) => {
  if (!guestId) return "";
  if (typeof guestId === "object" && guestId !== null && "_id" in guestId)
    return String((guestId as { _id: unknown })._id);
  return String(guestId);
};

const buildMessageBody = async (
  request: IReviewRequest,
  settings: IReviewSettings,
  reminder?: boolean,
) => {
  const populatedGuest =
    typeof request.guestId === "object" &&
    request.guestId !== null &&
    "phone" in request.guestId
      ? (request.guestId as {
          fullName?: string;
          name?: string;
          phone?: string;
        })
      : null;
  const [guest, template, hotel] = await Promise.all([
    populatedGuest?.phone
      ? Promise.resolve(populatedGuest)
      : findGuestForReviewGrowth(
          String(request.hotelId),
          resolveGuestId(request.guestId),
        ),
    request.templateId && typeof request.templateId === "object"
      ? Promise.resolve(request.templateId)
      : request.templateId
        ? findReviewTemplateByIdRepository(String(request.templateId))
        : null,
    Hotel.findById(request.hotelId).lean(),
  ]);
  const reviewLink = `${config.frontendUrl}/review/${request.publicToken}`;
  const fallback = reminder
    ? "Hi {{guest_name}}, friendly reminder to share your review: {{review_link}}"
    : "Hi {{guest_name}}, thank you for staying at {{hotel_name}}. How was your stay? Share your private rating: {{review_link}}";
  const body = (template as { body?: string } | null)?.body || fallback;
  return renderTemplate(body, {
    guest_name: guest?.fullName || guest?.name || "Guest",
    hotel_name: hotel?.name || "Hotel",
    review_link: reviewLink,
  });
};

export const processReviewRequestSend = async (
  reviewRequestId: string,
  reminder = false,
) => {
  const request = await findReviewRequestByIdRepository(reviewRequestId);
  if (!request) return { skipped: true, reason: "not_found" };
  if (
    [
      "EXPIRED",
      "REVIEWED",
      "FAILED",
      "RATED",
      "NEEDS_RECOVERY",
      "GOOGLE_REDIRECTED",
    ].includes(request.status)
  ) {
    return { skipped: true, reason: request.status };
  }
  if (reminder) {
    const reminderEligibility = getReminderEligibility(request.status);
    if (!reminderEligibility.eligible)
      return {
        skipped: true,
        reason: reminderEligibility.reason ?? request.status,
      };
    if (!["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(request.status)) {
      return { skipped: true, reason: "not_eligible_for_reminder" };
    }
  }

  const settings = await getOrCreateReviewSettings(String(request.hotelId));
  await transitionReviewRequestStatus(String(request._id), "PROCESSING", {
    message: reminder ? "Sending review reminder" : "Sending review request",
    metadata: { reminder },
  });

  const body = await buildMessageBody(request, settings, reminder);
  const phone = request.recipientPhone?.replace(/\D/g, "").slice(-10);
  if (request.channel === "whatsapp" && phone) {
    const result = reminder
      ? await whatsappProvider.sendReminder({
          phone,
          content: body,
          messageType: "text",
        })
      : await whatsappProvider.sendReviewRequest({
          phone,
          content: body,
          messageType: "text",
        });
    if (!result.success) {
      const retryable = Boolean(
        result.simulated || result.error?.includes("temporarily"),
      );
      if (retryable) {
        await createReviewGrowthAudit({
          hotelId: request.hotelId,
          action: "review_growth.reminder_send_failed",
          entity: "ReviewRequest",
          entityId: request._id,
          changes: { reminder, error: result.error },
        });
        throw new Error(result.error || "WhatsApp delivery failed");
      }
      await finalizeReviewRequestSendFailure({
        reviewRequestId: String(request._id),
        reminder,
        error: result.error || "WhatsApp delivery failed",
      });
      return {
        sent: false,
        reviewRequestId: String(request._id),
        reminder,
        error: result.error || "WhatsApp delivery failed",
      };
    }
    request.metadata = {
      ...(request.metadata ?? {}),
      whatsappMessageId: result.whatsappMessageId,
      simulated: result.simulated,
      reminder,
    };
    await request.save();
  }

  await transitionReviewRequestStatus(String(request._id), "SENT", {
    message: reminder ? "Review reminder sent" : "Review request sent",
    metadata: {
      channel: request.channel,
      simulated: request.metadata?.simulated,
    },
  });

  if (!reminder) {
    try {
      await scheduleEngagementSimulation(request);
      await scheduleReminder(request, settings);
      await scheduleExpiry(request, settings, new Date());
    } catch (error) {
      logger.error("Failed to schedule review request follow-up jobs", error);
    }
  } else {
    await createReviewGrowthAudit({
      hotelId: request.hotelId,
      action: "review_growth.reminder_sent",
      entity: "ReviewRequest",
      entityId: request._id,
      changes: {
        reminder,
        reminderDelayMinutes:
          settings.reminderDelayMinutes ?? settings.defaultDelayMinutes,
      },
    });
  }

  return {
    sent: true,
    reviewRequestId,
    reminder,
    simulated: request.metadata?.simulated ?? !whatsappProvider.isConfigured(),
  };
};

export const processReviewRequestEngagement = async (
  reviewRequestId: string,
  step: string,
) => {
  const request = await findReviewRequestByIdRepository(reviewRequestId);
  if (!request) return { skipped: true, reason: "not_found" };
  if (["REVIEWED", "EXPIRED", "FAILED"].includes(request.status))
    return { skipped: true, reason: request.status };

  if (step === "EXPIRED") {
    if (
      [
        "SENT",
        "DELIVERED",
        "OPENED",
        "CLICKED",
        "QUEUED",
        "PENDING",
        "PROCESSING",
      ].includes(request.status)
    ) {
      await transitionReviewRequestStatus(reviewRequestId, "EXPIRED", {
        message: "Review request expired",
      });
    }
    return { expired: true };
  }

  if (!ENGAGEMENT_STEPS.includes(step as (typeof ENGAGEMENT_STEPS)[number]))
    return { skipped: true, reason: "invalid_step" };
  await transitionReviewRequestStatus(
    reviewRequestId,
    step as ReviewRequestStatus,
    {
      message: `Review request marked ${step.toLowerCase()}`,
      metadata: { simulated: true },
    },
  );
  return { step, reviewRequestId };
};

export const handleBookingCheckoutReviewTrigger = async (
  input: CheckoutTriggerInput,
) => {
  const hotelId = String(input.hotelId);
  const trigger: ReviewGrowthCampaignTrigger =
    input.bookingStatus === "completed" ? "BOOKING_COMPLETED" : "CHECKOUT";
  const settings = await getOrCreateReviewSettings(hotelId, input.userId);

  if (!settings.isEnabled)
    return { skipped: true, reason: "review_growth_disabled" };
  if (trigger === "CHECKOUT" && !settings.autoSendOnCheckout)
    return { skipped: true, reason: "auto_send_checkout_disabled" };
  if (trigger === "BOOKING_COMPLETED" && !settings.autoSendOnBookingCompleted)
    return { skipped: true, reason: "auto_send_completed_disabled" };

  const existing = await ReviewRequest.findOne({
    hotelId: input.hotelId,
    bookingId: input.bookingId,
    isDeleted: { $ne: true },
  });
  if (existing)
    return {
      skipped: true,
      reason: "duplicate",
      reviewRequestId: existing._id,
    };

  const guest = await findGuestForReviewGrowth(hotelId, String(input.guestId));
  if (!guest) return { skipped: true, reason: "guest_not_found" };

  const [campaign, hotel] = await Promise.all([
    resolveActiveCampaign(hotelId, trigger),
    Hotel.findById(input.hotelId).lean(),
  ]);

  const channel = settings.channels?.whatsapp
    ? "whatsapp"
    : settings.channels?.email
      ? "email"
      : settings.channels?.sms
        ? "sms"
        : "whatsapp";

  const delayMinutes = campaign?.delayMinutes ?? settings.defaultDelayMinutes;
  let scheduledAt = adjustForBusinessHours(
    new Date(Date.now() + delayMinutes * 60 * 1000),
    hotel,
  );

  const template = await resolveTemplate(
    hotelId,
    campaign,
    channel,
    settings.defaultPlatform,
  );
  const publicToken = generateReviewRequestToken();

  console.log(guest.phone, "guest.phone.......");

  const request = await ReviewRequest.create({
    hotelId: input.hotelId,
    bookingId: input.bookingId,
    guestId: input.guestId,
    campaignId: campaign?._id,
    templateId: template?._id,
    platform: settings.defaultPlatform,
    channel,
    recipientPhone: "+919053916095",
    recipientEmail: guest.email,
    status: "QUEUED",
    scheduledAt,
    queuedAt: new Date(),
    publicToken,
    reviewUrl: settings.googleReviewUrl,
    metadata: { trigger, bookingStatus: input.bookingStatus },
    timeline: [
      systemTimeline(
        "review_growth.request_created",
        "Review request created after checkout",
        input.userId,
        {
          trigger,
          campaignId: campaign?._id,
          scheduledAt,
        },
      ),
    ],
    createdBy: input.userId ? new Types.ObjectId(input.userId) : undefined,
    updatedBy: input.userId ? new Types.ObjectId(input.userId) : undefined,
  });

  await createReviewGrowthAudit({
    hotelId: input.hotelId,
    userId: input.userId,
    action: "review_growth.request_created",
    entity: "ReviewRequest",
    entityId: request._id,
    changes: {
      bookingId: input.bookingId,
      guestId: input.guestId,
      trigger,
      campaignId: campaign?._id,
    },
  });

  if (campaign) {
    await incrementReviewCampaignStatRepository(String(campaign._id), "queued");
    campaign.timeline.unshift(
      systemTimeline(
        "review_growth.campaign_triggered",
        "Campaign triggered by booking checkout",
        input.userId,
        {
          bookingId: input.bookingId,
          reviewRequestId: request._id,
        },
      ),
    );
    await campaign.save();
  }

  const job = await createAutomationJob({
    jobType: REVIEW_REQUEST_SEND_JOB,
    payload: { reviewRequestId: String(request._id) },
    options: {
      hotelId,
      scheduledAt,
      deduplicationKey: `review-request-send-${request._id}`,
      maxAttempts: config.automation.defaultRetryCount,
      createdBy: input.userId,
    },
  });

  await scheduleInlineAutomation(job);

  return {
    reviewRequestId: request._id,
    campaignId: campaign?._id,
    scheduledAt,
    automationJobId: job._id,
  };
};

let registered = false;
export const registerReviewGrowthAutomationHandlers = () => {
  if (registered) return;
  registered = true;
  registerAutomationJobHandler(REVIEW_REQUEST_SEND_JOB, async ({ payload }) =>
    processReviewRequestSend(
      String(payload?.reviewRequestId),
      Boolean(payload?.reminder),
    ),
  );
  registerAutomationJobHandler(
    REVIEW_REQUEST_REMINDER_JOB,
    async ({ payload }) =>
      processReviewRequestSend(String(payload?.reviewRequestId), true),
  );
  registerAutomationJobHandler(
    REVIEW_REQUEST_ENGAGEMENT_JOB,
    async ({ payload }) =>
      processReviewRequestEngagement(
        String(payload?.reviewRequestId),
        String(payload?.step),
      ),
  );
  logger.info("Review Growth automation handlers registered");
};
