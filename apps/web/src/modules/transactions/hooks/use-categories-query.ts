"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "../api";

export const categoriesQueryKey = ["categories"] as const;

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
  });
}
