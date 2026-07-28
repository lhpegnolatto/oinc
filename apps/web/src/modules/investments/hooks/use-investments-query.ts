"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchInvestments } from "../api";

export const investmentsQueryKey = ["investments"] as const;

export function useInvestmentsQuery() {
  return useQuery({
    queryKey: investmentsQueryKey,
    queryFn: fetchInvestments,
  });
}
