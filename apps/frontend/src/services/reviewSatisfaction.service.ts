import axios from "axios";
import { API_URL } from "@/lib/constants";

const publicApi = axios.create({ baseURL: API_URL });
const unwrap = <T>(promise: Promise<{ data: unknown }>): Promise<T> =>
  promise.then((res) => {
    const payload = res.data as { success?: boolean; data?: T };
    return payload && typeof payload === "object" && "data" in payload
      ? (payload.data as T)
      : (res.data as T);
  });

export interface PublicSatisfactionPage {
  token: string;
  hotelName: string;
  hotelLogo?: string;
  guestName?: string;
  status: string;
  privateRating?: number;
  satisfactionOutcome?: "positive" | "negative";
  recoveryStatus?: string;
  googleReviewUrl?: string;
  alreadyRated: boolean;
  alreadyReviewed: boolean;
}

export interface PrivateRatingResult {
  outcome: "positive" | "negative";
  rating: number;
  threshold: number;
  googleReviewUrl?: string;
  message: string;
}

export const getPublicSatisfactionPage = (token: string) =>
  unwrap<PublicSatisfactionPage>(
    publicApi.get(`/review-growth/public/${token}`),
  );

export const submitPrivateRating = (token: string, rating: number) =>
  unwrap<PrivateRatingResult>(
    publicApi.post(`/review-growth/public/${token}/rating`, { rating }),
  );

export const trackGoogleReviewClick = (token: string) =>
  unwrap<{ googleReviewUrl: string; redirectedAt: string }>(
    publicApi.post(`/review-growth/public/${token}/google-click`, {}),
  );

export const confirmGoogleReviewSubmitted = (token: string) =>
  unwrap<{ status: string; reviewedAt?: string; alreadySubmitted?: boolean }>(
    publicApi.post(`/review-growth/public/${token}/google-complete`, {}),
  );

export const submitPublicNegativeFeedback = (
  token: string,
  payload: {
    rating: number;
    feedback: string;
    category?: string;
    submitterName?: string;
    submitterPhone?: string;
    contactRequested?: boolean;
  },
) =>
  unwrap<{ feedbackId: string; status: string; recoveryStatus?: string }>(
    publicApi.post(`/review-growth/public/${token}/feedback`, payload),
  );
