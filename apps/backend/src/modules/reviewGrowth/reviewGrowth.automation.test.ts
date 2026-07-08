import assert from "node:assert/strict";
import test from "node:test";
import {
  finalizeReviewRequestSendFailure,
  getReminderEligibility,
} from "./reviewGrowth.automation";

test("reminder eligibility blocks terminal and recovery states", () => {
  assert.equal(getReminderEligibility("REVIEWED").eligible, false);
  assert.equal(getReminderEligibility("FAILED").eligible, false);
  assert.equal(getReminderEligibility("EXPIRED").eligible, false);
  assert.equal(getReminderEligibility("NEEDS_RECOVERY").eligible, false);
  assert.equal(getReminderEligibility("SENT").eligible, true);
  assert.equal(getReminderEligibility("CLICKED").eligible, true);
});

test("send failures transition the request to failed without throwing", async () => {
  let transitionedTo: string | undefined;
  const result = await finalizeReviewRequestSendFailure({
    reviewRequestId: "req_123",
    reminder: true,
    error: "Authentication Error",
    transitionStatus: async (id, status) => {
      transitionedTo = `${id}:${status}`;
      return { _id: id, status } as never;
    },
  });

  assert.equal(result.sent, false);
  assert.equal(result.reviewRequestId, "req_123");
  assert.equal(result.reminder, true);
  assert.equal(transitionedTo, "req_123:FAILED");
});
