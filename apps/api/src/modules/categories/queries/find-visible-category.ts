import { db } from "../../../shared/db/client";
import { CategoriesRepository } from "../repositories/categories-repository";

const repo = new CategoriesRepository(db);

// Cross-module read surface for other modules (e.g. transactions, validating
// a categoryId belongs to the requesting user's visible set) — module
// independence (backend.md) means those modules compose this query, not
// CategoriesRepository directly.
export async function findVisibleCategory(id: string, userId: string) {
  return repo.findVisibleById(id, userId);
}
