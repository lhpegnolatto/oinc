import {
  categoryColorSchema,
  categoryIconSchema,
} from "@oinc/api/category-appearance";
import * as z from "zod";

export const newCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  color: categoryColorSchema,
  icon: categoryIconSchema,
});

export type NewCategoryFormValues = z.infer<typeof newCategoryFormSchema>;

export const editCategoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  color: categoryColorSchema,
  icon: categoryIconSchema,
});

export type EditCategoryFormValues = z.infer<typeof editCategoryFormSchema>;
