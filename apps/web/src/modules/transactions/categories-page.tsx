"use client";

import type { CategoryIconKey } from "@oinc/api/category-appearance";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryDto } from "./api";
import { DeleteCategoryDialog } from "./components/delete-category-dialog";
import { EditCategoryDialog } from "./components/edit-category-dialog";
import { useCategoriesQuery } from "./hooks/use-categories-query";
import { CATEGORY_ICON_COMPONENTS } from "./lib/category-icons";

function CategoryRow({
  category,
  editable,
}: {
  category: CategoryDto;
  editable: boolean;
}) {
  const Icon = CATEGORY_ICON_COMPONENTS[category.icon as CategoryIconKey];

  return (
    <div className="flex items-center gap-3 rounded-lg p-2">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: category.color }}
      >
        <Icon className="size-4 text-white" />
      </div>
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium">{category.name}</span>
        <span className="text-xs text-muted-foreground capitalize">
          {category.type}
        </span>
      </div>
      {editable && (
        <div className="flex items-center gap-1">
          <EditCategoryDialog category={category} />
          <DeleteCategoryDialog category={category} />
        </div>
      )}
    </div>
  );
}

// System categories (category.system, userId === null) render read-only —
// no edit/delete affordance — matching the API rule that only a user's own
// custom categories can be mutated (design.md).
export function CategoriesPage() {
  const { data: categories, isPending } = useCategoriesQuery();

  if (isPending) {
    return <Skeleton className="h-24 w-full" />;
  }

  const customCategories = (categories ?? []).filter((c) => !c.system);
  const systemCategories = (categories ?? []).filter((c) => c.system);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Categories</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Your categories
        </h2>
        {customCategories.length > 0 ? (
          <div className="flex flex-col gap-1">
            {customCategories.map((category) => (
              <CategoryRow key={category.id} category={category} editable />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You haven't created any custom categories yet — create one from the
            quick-add transaction sheet.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          System categories
        </h2>
        <div className="flex flex-col gap-1">
          {systemCategories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              editable={false}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
