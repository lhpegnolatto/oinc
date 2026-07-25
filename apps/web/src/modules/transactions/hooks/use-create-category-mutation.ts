"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCategoryRequest } from "../api";
import { categoriesQueryKey } from "./use-categories-query";

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategoryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });
}
