import { z } from "zod";

export const createEquipmentSchema = z.object({
  name: z.string().trim().min(3, "Equipment name must be at least 3 characters."),
  category: z.string().trim().min(1, "Category is required."),
  description: z.string().trim().min(10, "Description must be at least 10 characters."),
  dailyRate: z.coerce.number().positive("Daily rate must be greater than 0."),
  location: z.string().trim().min(2, "Location is required."),
  imageUrl: z.string().trim().url("Please provide a valid image URL."),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
