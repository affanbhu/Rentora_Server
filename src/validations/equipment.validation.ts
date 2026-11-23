import { z } from "zod";

const baseEquipmentSchema = z.object({
  name: z.string().trim().min(3, "Equipment name must be at least 3 characters."),
  category: z.string().trim().min(1, "Category is required."),
  description: z.string().trim().min(10, "Description must be at least 10 characters."),
  dailyRate: z.coerce.number().positive("Daily rate must be greater than 0."),
  location: z.string().trim().min(2, "Location is required."),
  imageUrl: z.string().trim().url("Please provide a valid image URL."),
});

export const createEquipmentSchema = baseEquipmentSchema.extend({
  rentalType: z.enum(["Daily", "Weekly", "Monthly"]),
  availableQuantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
  condition: z.enum(["New", "Like New", "Good", "Fair"]),
  brand: z.string().trim().min(1, "Brand is required."),
  model: z.string().trim().min(1, "Model is required."),
  terms: z.string().trim().min(5, "Rental terms must be at least 5 characters."),
});

// Keep existing owner/admin edit requests compatible.
export const updateEquipmentSchema = createEquipmentSchema;

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
