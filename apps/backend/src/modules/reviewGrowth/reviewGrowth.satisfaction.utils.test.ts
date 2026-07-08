import assert from "node:assert/strict";
import test from "node:test";
import { buildNegativeFeedbackRecoveryMetadata } from "./reviewGrowth.satisfaction.utils";

test("buildNegativeFeedbackRecoveryMetadata includes contact and WhatsApp payload when requested", () => {
  const metadata = buildNegativeFeedbackRecoveryMetadata(
    {
      rating: 2,
      feedback: "Slow service",
      contactRequested: true,
      submitterPhone: "+919999999999",
      submitterName: "Asha",
    },
    { hotelName: "Ocean View", guestName: "Asha" },
  );

  assert.equal(metadata.contactRequested, true);
  assert.equal(metadata.priority, "high");
  assert.deepEqual(metadata.whatsappPayload, {
    to: "+919999999999",
    template: "negative_feedback_recovery",
    variables: {
      guest_name: "Asha",
      hotel_name: "Ocean View",
      rating: 2,
    },
  });
});
