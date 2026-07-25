"use client";

import { TagIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format-currency";
import { useTopCategories } from "../hooks/use-top-categories";

export function TopCategories() {
  const { topCategories, isPending } = useTopCategories();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top categories this month</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : topCategories.length > 0 ? (
          <div className="flex flex-col gap-1">
            {topCategories.map((category) => (
              <div
                key={category.categoryId}
                className="flex items-center justify-between gap-2 rounded-lg p-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <span className="text-sm font-medium">
                  {formatCurrency(category.total)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TagIcon />
              </EmptyMedia>
              <EmptyTitle>No expenses yet this month</EmptyTitle>
              <EmptyDescription>
                Categories you spend on will show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
