/**
 * Sprint 2 satisfaction funnel verification.
 * Usage: npx ts-node scripts/verify-satisfaction-funnel.ts
 */
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { ReviewRequest, ReviewSettings } from '../src/models';
import {
  confirmGoogleReviewSubmitted,
  getPublicSatisfactionPage,
  submitPrivateRating,
  submitPublicNegativeFeedback,
  trackGoogleReviewClick,
} from '../src/modules/reviewGrowth/reviewGrowth.satisfaction.service';
import { getReviewDashboardRepository } from '../src/modules/reviewGrowth/reviewGrowth.repository';

async function getRequestWithToken() {
  const request = await ReviewRequest.findOne({ isDeleted: { $ne: true }, status: { $in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'RATED'] } }).sort({ updatedAt: -1 });
  if (!request) throw new Error('No eligible ReviewRequest found. Complete Sprint 1 checkout/send first.');
  return request;
}

async function resetRequest(requestId: string) {
  await ReviewRequest.findByIdAndUpdate(requestId, {
    $unset: {
      privateRating: '',
      privateRatingSubmittedAt: '',
      satisfactionOutcome: '',
      recoveryStatus: '',
      googleRedirectedAt: '',
      googleReviewSubmittedAt: '',
      reviewedAt: '',
      internalFeedbackId: '',
    },
    $set: {
      status: 'SENT',
      timeline: [{ action: 'review_growth.request_sent', message: 'Reset for funnel test', createdAt: new Date() }],
    },
  });
}

async function main() {
  await connectDatabase();
  const request = await getRequestWithToken();
  const hotelId = String(request.hotelId);
  await ReviewSettings.findOneAndUpdate({ hotelId }, { positiveRatingThreshold: 4, googleReviewUrl: 'https://g.page/demo-hotel/review' }, { upsert: true });

  console.log('\n=== Test Case 1: 5-star positive ===');
  await resetRequest(String(request._id));
  const positive = await submitPrivateRating(request.publicToken, { rating: 5 });
  console.log('Outcome:', positive.outcome);
  if (positive.outcome !== 'positive') throw new Error('Expected positive outcome for 5 stars');

  console.log('\n=== Test Case 2: 2-star negative ===');
  await resetRequest(String(request._id));
  const negative = await submitPrivateRating(request.publicToken, { rating: 2 });
  if (negative.outcome !== 'negative') throw new Error('Expected negative outcome for 2 stars');
  await submitPublicNegativeFeedback(request.publicToken, {
    rating: 2,
    feedback: 'Room service was slow and the bathroom needed attention.',
    category: 'service',
  });
  const negativeRequest = await ReviewRequest.findById(request._id);
  if (negativeRequest?.status !== 'NEEDS_RECOVERY') throw new Error('Expected NEEDS_RECOVERY status');
  console.log('Recovery status:', negativeRequest.recoveryStatus);

  console.log('\n=== Test Case 3: 4-star + Google complete ===');
  await resetRequest(String(request._id));
  await submitPrivateRating(request.publicToken, { rating: 4 });
  await trackGoogleReviewClick(request.publicToken);
  await confirmGoogleReviewSubmitted(request.publicToken);
  const completed = await ReviewRequest.findById(request._id);
  if (completed?.status !== 'REVIEWED') throw new Error('Expected REVIEWED status after confirmation');
  console.log('Final status:', completed.status);

  const page = await getPublicSatisfactionPage(request.publicToken);
  console.log('Public page loads:', page.hotelName);

  const dashboard = await getReviewDashboardRepository(hotelId, { from: new Date(Date.now() - 7 * 86400000), to: new Date() });
  console.log('Dashboard funnel:', {
    privateRatingsReceived: dashboard.privateRatingsReceived,
    positiveGuests: dashboard.positiveGuests,
    negativeGuests: dashboard.negativeGuests,
    googleRedirected: dashboard.googleRedirected,
    reviewsCompleted: dashboard.reviewsCompleted,
    needsRecovery: dashboard.needsRecovery,
  });

  console.log('\nPASS: Sprint 2 satisfaction funnel verified');
  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDatabase();
  process.exit(1);
});
