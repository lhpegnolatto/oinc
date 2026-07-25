"use client";

import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";

// Every key is nullable (no default) — an absent key means "no filter
// applied", which maps directly to an omitted param on the API request in
// api.ts. Synced to the URL so a filtered /transactions view is
// shareable/bookmarkable/back-button-safe (design.md decision 3).
export function useTransactionsFilters() {
  return useQueryStates({
    wallet: parseAsString,
    category: parseAsString,
    type: parseAsStringEnum<"income" | "expense">(["income", "expense"]),
    dateFrom: parseAsString,
    dateTo: parseAsString,
    q: parseAsString,
  });
}
