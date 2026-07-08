export const buildNegativeFeedbackRecoveryMetadata = (
  input: {
    rating: number;
    feedback: string;
    contactRequested?: boolean;
    submitterPhone?: string;
    submitterName?: string;
  },
  context: { hotelName?: string; guestName?: string },
) => {
  const priority = input.rating <= 2 ? "high" : "medium";
  const contactRequested = Boolean(input.contactRequested);
  const whatsappPayload =
    contactRequested && input.submitterPhone
      ? {
          to: input.submitterPhone,
          template: "negative_feedback_recovery",
          variables: {
            guest_name: input.submitterName || context.guestName || "Guest",
            hotel_name: context.hotelName || "Hotel",
            rating: input.rating,
          },
        }
      : undefined;

  return {
    priority,
    contactRequested,
    whatsappPayload,
    summary: {
      rating: input.rating,
      feedback: input.feedback,
      contactRequested,
    },
  };
};
