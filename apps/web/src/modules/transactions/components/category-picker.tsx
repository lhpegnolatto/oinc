"use client";

import type { CategoryIconKey } from "@oinc/api/category-appearance";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategoriesQuery } from "../hooks/use-categories-query";
import { CATEGORY_ICON_COMPONENTS } from "../lib/category-icons";
import { NewCategoryDialog } from "./new-category-dialog";

// Used inside the quick-add/edit transaction sheets — filtered by the
// currently selected transaction type, with an inline "new category"
// affordance (NewCategoryDialog) so switching context isn't required.
export function CategoryPicker({
  type,
  value,
  onChange,
}: {
  type: "income" | "expense";
  value: string | undefined;
  onChange: (categoryId: string) => void;
}) {
  const { data: categories, isPending } = useCategoriesQuery();
  const options = (categories ?? []).filter(
    (category) => category.type === type,
  );

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value || null}
        onValueChange={(next) => onChange(next ?? "")}
        disabled={isPending}
      >
        <SelectTrigger className="w-full flex-1">
          <SelectValue placeholder="Select a category">
            {(selected: string | null) =>
              options.find((option) => option.id === selected)?.name
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((category) => {
            const Icon =
              CATEGORY_ICON_COMPONENTS[category.icon as CategoryIconKey];
            return (
              <SelectItem key={category.id} value={category.id}>
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: category.color }}
                >
                  <Icon className="size-3 text-white" />
                </span>
                {category.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <NewCategoryDialog type={type} onCreated={onChange} />
    </div>
  );
}
