import type { Category } from "../domain/category";

export function toCategoryResponse(category: Category) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    color: category.color,
    icon: category.icon,
    system: category.userId === null,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export type CategoryResponse = ReturnType<typeof toCategoryResponse>;
