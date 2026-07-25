"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCategoryRequest } from "../api";
import { categoriesQueryKey } from "./use-categories-query";

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategoryRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });
}
