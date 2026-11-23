
import { z } from "zod";

export const createBookingSchema = z.object({
  equipmentSlug: z.string().min(1, "Equipment is required."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  phone: z.string().trim().min(7, "Please provide a valid phone number.").max(20),
  deliveryAddress: z.string().trim().min(8, "Please provide a complete delivery address.").max(500),
  notes: z.string().trim().max(1000).optional().default(""),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
