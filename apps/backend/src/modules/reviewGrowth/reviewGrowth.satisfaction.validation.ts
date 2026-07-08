import { z } from "zod";

export const tokenParamSchema = z.object({
  token: z.string().min(16).max(128),
});

export const privateRatingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
});

export const publicFeedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  feedback: z.string().min(3).max(4000),
  category: z
    .enum(["service", "cleanliness", "billing", "staff", "amenities", "other"])
    .optional(),
  submitterName: z.string().max(120).optional(),
  submitterPhone: z.string().max(20).optional(),
  contactRequested: z.boolean().optional(),
});

export type PrivateRatingInput = z.infer<typeof privateRatingSchema>;
export type PublicFeedbackInput = z.infer<typeof publicFeedbackSchema>;
