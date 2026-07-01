/**
 * End-to-end verification for Review Growth checkout lifecycle.
 * Usage: npx ts-node -r tsconfig-paths/register scripts/verify-review-lifecycle.ts
 */
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Booking, Guest, Review, ReviewCampaign, ReviewRequest, ReviewSettings } from '../src/models';
import { handleBookingCheckoutReviewTrigger, registerReviewGrowthAutomationHandlers } from '../src/modules/reviewGrowth/reviewGrowth.automation';
import { processAutomationJob } from '../src/modules/automation/automation.service';
import { AutomationJob } from '../src/models';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  await connectDatabase();
  registerReviewGrowthAutomationHandlers();

  let booking = await Booking.findOne({ isDeleted: { $ne: true }, status: { $in: ['checked_in', 'confirmed'] } }).sort({ updatedAt: -1 });
  if (!booking) {
    booking = await Booking.findOne({ isDeleted: { $ne: true }, status: 'checked_out' }).sort({ updatedAt: -1 });
  }
  if (!booking) {
    console.error('No eligible booking found. Create a confirmed booking first.');
    process.exit(1);
  }

  if (booking.status === 'checked_out') {
    booking.status = 'checked_in';
    booking.checkedOutAt = undefined;
    await booking.save();
  }

  if (booking.status !== 'checked_in') {
    booking.status = 'checked_in';
    booking.checkedInAt = new Date();
    await booking.save();
  }

  const hotelId = String(booking.hotelId);
  await ReviewSettings.findOneAndUpdate(
    { hotelId },
    {
      hotelId: booking.hotelId,
      isEnabled: true,
      autoSendOnCheckout: true,
      autoSendOnBookingCompleted: true,
      defaultDelayMinutes: 0,
      channels: { whatsapp: true, sms: false, email: false },
    },
    { upsert: true, new: true }
  );

  await ReviewCampaign.findOneAndUpdate(
    { hotelId, name: 'Checkout Review E2E', isDeleted: { $ne: true } },
    {
      hotelId: booking.hotelId,
      name: 'Checkout Review E2E',
      trigger: 'CHECKOUT',
      isActive: true,
      delayMinutes: 0,
      stats: { queued: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, reviewed: 0, failed: 0 },
      timeline: [],
    },
    { upsert: true, new: true }
  );

  await ReviewRequest.deleteMany({ bookingId: booking._id });

  booking.status = 'checked_out';
  booking.checkedOutAt = new Date();
  await booking.save();

  const legacyBefore = await Review.countDocuments({ bookingId: booking._id, isDeleted: { $ne: true } });
  const result = await handleBookingCheckoutReviewTrigger({
    bookingId: booking._id,
    hotelId: booking.hotelId,
    guestId: booking.guestId,
    bookingStatus: 'checked_out',
    userId: String(booking.updatedBy ?? booking.createdBy ?? booking._id),
  });

  console.log('Trigger result:', result);

  const request = await ReviewRequest.findOne({ bookingId: booking._id, isDeleted: { $ne: true } });
  if (!request) {
    console.error('FAIL: ReviewRequest was not created');
    process.exit(1);
  }
  console.log('ReviewRequest created:', request._id, request.status);

  const legacyAfter = await Review.countDocuments({ bookingId: booking._id, isDeleted: { $ne: true } });
  if (legacyAfter > legacyBefore) {
    console.error('FAIL: Legacy Review document was created');
    process.exit(1);
  }

  const jobs = await AutomationJob.find({
    'payload.reviewRequestId': String(request._id),
    isDeleted: { $ne: true },
  }).sort({ createdAt: 1 });

  for (const job of jobs) {
    if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(job.status)) continue;
    try {
      await processAutomationJob(String(job._id));
    } catch (error) {
      console.warn('Job processing warning:', job.jobType, error instanceof Error ? error.message : error);
    }
    await sleep(500);
  }

  await sleep(3000);

  for (const job of await AutomationJob.find({ 'payload.reviewRequestId': String(request._id), status: { $nin: ['COMPLETED', 'CANCELLED', 'EXPIRED'] } })) {
    try {
      await processAutomationJob(String(job._id));
    } catch {
      /* retry engagement jobs */
    }
  }

  await sleep(2000);

  const finalRequest = await ReviewRequest.findById(request._id);
  console.log('Final request status:', finalRequest?.status);
  console.log('Timeline actions:', finalRequest?.timeline?.map((item) => item.action).join(' -> '));

  const guest = await Guest.findById(booking.guestId);
  console.log('Guest:', guest?.fullName || guest?.name, guest?.phone);

  if (!finalRequest || !['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(finalRequest.status)) {
    console.error('FAIL: Request did not progress through send lifecycle. Status:', finalRequest?.status);
    process.exit(1);
  }

  console.log('PASS: Review Growth checkout lifecycle verified');
  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDatabase();
  process.exit(1);
});
