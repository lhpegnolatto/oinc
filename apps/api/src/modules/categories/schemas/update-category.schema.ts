import * as z from "zod";
import {
  categoryColorSchema,
  categoryIconSchema,
} from "../../../shared/validation/category-appearance";

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  color: categoryColorSchema.optional(),
  icon: categoryIconSchema.optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
