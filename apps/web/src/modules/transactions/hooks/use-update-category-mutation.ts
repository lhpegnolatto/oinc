"use client";

import type { CategoryIconKey } from "@oinc/api/category-appearance";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCategoryRequest } from "../api";
import { categoriesQueryKey } from "./use-categories-query";

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      name: string;
      color: string;
      icon: CategoryIconKey;
    }) => updateCategoryRequest(input.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });
}
