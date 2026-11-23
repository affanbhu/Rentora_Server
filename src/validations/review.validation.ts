import { z } from "zod";

export const createReviewSchema = z.object({
  bookingId: z
    .string()
    .trim()
    .min(1, "Booking ID is required."),

  rating: z.coerce
    .number()
    .int("Rating must be a whole number.")
    .min(1, "Rating must be at least 1.")
    .max(5, "Rating cannot exceed 5."),

  comment: z
    .string()
    .trim()
    .min(10, "Review must be at least 10 characters.")
    .max(1000, "Review cannot exceed 1000 characters."),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
