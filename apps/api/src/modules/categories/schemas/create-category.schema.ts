import * as z from "zod";
import {
  categoryColorSchema,
  categoryIconSchema,
} from "../../../shared/validation/category-appearance";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["income", "expense"]),
  color: categoryColorSchema,
  icon: categoryIconSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
