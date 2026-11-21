
import { z } from "zod";

export const createBookingSchema = z.object({
  equipmentSlug: z.string().min(1, "Equipment is required."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
