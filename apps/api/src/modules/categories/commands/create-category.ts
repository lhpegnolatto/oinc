import type { CategoriesRepository } from "../repositories/categories-repository";

export async function createCategory(
  repo: CategoriesRepository,
  input: {
    userId: string;
    name: string;
    type: "income" | "expense";
    color: string;
    icon: string;
  },
) {
  return repo.create({ id: crypto.randomUUID(), ...input });
}
