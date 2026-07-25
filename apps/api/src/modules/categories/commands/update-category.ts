import { CategoryNotFoundError } from "../domain/category-not-found-error";
import type { CategoriesRepository } from "../repositories/categories-repository";

export async function updateCategory(
  repo: CategoriesRepository,
  input: {
    id: string;
    userId: string;
    name: string;
    color?: string;
    icon?: string;
  },
) {
  const { id, userId, ...changes } = input;
  const updated = await repo.update(id, userId, changes);
  if (!updated) {
    throw new CategoryNotFoundError();
  }
  return updated;
}
