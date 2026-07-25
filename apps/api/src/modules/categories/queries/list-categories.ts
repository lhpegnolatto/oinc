import type { CategoriesRepository } from "../repositories/categories-repository";

export async function listCategories(
  repo: CategoriesRepository,
  userId: string,
) {
  return repo.findAllVisibleToUser(userId);
}
