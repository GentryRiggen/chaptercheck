import { z } from "zod";

export const reviewSchema = z
  .object({
    rating: z.number().min(0).max(3),
    reviewText: z.string().max(2000).optional().or(z.literal("")),
    isReadPrivate: z.boolean(),
    isReviewPrivate: z.boolean(),
  })
  .refine((data) => !(data.isReadPrivate && !data.isReviewPrivate), {
    message: "Review must be private when read status is private",
    path: ["isReviewPrivate"],
  });

export type ReviewFormData = z.infer<typeof reviewSchema>;
