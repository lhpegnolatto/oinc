import { CategoryInUseError } from "../domain/category-in-use-error";
import { CategoryNotFoundError } from "../domain/category-not-found-error";
import type { CategoriesRepository } from "../repositories/categories-repository";

export async function deleteCategory(
  repo: CategoriesRepository,
  input: { id: string; userId: string },
) {
  const owned = await repo.findOwnedById(input.id, input.userId);
  if (!owned) {
    throw new CategoryNotFoundError();
  }

  const usageCount = await repo.countTransactionsUsingCategory(input.id);
  if (usageCount > 0) {
    throw new CategoryInUseError();
  }

  await repo.delete(input.id, input.userId);
}
