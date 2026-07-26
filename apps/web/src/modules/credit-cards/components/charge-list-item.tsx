"use client";

import type { CategoryIconKey } from "@oinc/api/category-appearance";
import { useState } from "react";
import { formatCurrency } from "@/lib/format-currency";
import { useCategoriesQuery } from "@/modules/transactions/hooks/use-categories-query";
import { CATEGORY_ICON_COMPONENTS } from "@/modules/transactions/lib/category-icons";
import type { CardChargeDto } from "../api";
import { EditChargeSheet } from "./edit-charge-sheet";

export function ChargeListItem({ charge }: { charge: CardChargeDto }) {
  const [open, setOpen] = useState(false);
  const { data: categories } = useCategoriesQuery();
  const category = categories?.find((c) => c.id === charge.categoryId);
  const Icon = category
    ? CATEGORY_ICON_COMPONENTS[category.icon as CategoryIconKey]
    : undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted"
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: category?.color ?? "#71717a" }}
        >
          {Icon && <Icon className="size-4 text-white" />}
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-medium">
            {category?.name ?? "Uncategorized"}
          </span>
          <span className="text-xs text-muted-foreground">
            {charge.date}
            {charge.note ? ` · ${charge.note}` : ""}
            {charge.status === "pending" ? " · Pending" : ""}
            {charge.installmentCount
              ? ` · ${charge.installmentNumber}/${charge.installmentCount}`
              : ""}
          </span>
        </div>
        <span className="font-medium">-{formatCurrency(charge.amount)}</span>
      </button>
      <EditChargeSheet charge={charge} open={open} onOpenChange={setOpen} />
    </>
  );
}
