"use client";

import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { CategoryDto } from "../api";
import { useDeleteCategoryMutation } from "../hooks/use-delete-category-mutation";

// A CategoryInUseError response (409, code CATEGORY_IN_USE — thrown by
// apps/api's deleteCategory command when a transaction still references
// this category) surfaces as an inline message rather than a cascade or
// reassignment UX, per design.md's non-goals.
function categoryInUseMessage(error: unknown) {
  const code =
    error && typeof error === "object" && "error" in error
      ? (error as { error?: { code?: string } }).error?.code
      : undefined;
  if (code !== "CATEGORY_IN_USE") return null;
  return "This category is still used by at least one transaction. Recategorize it before deleting.";
}

// Mirrors DeleteTransactionDialog's confirmation pattern.
export function DeleteCategoryDialog({ category }: { category: CategoryDto }) {
  const [open, setOpen] = useState(false);
  const mutation = useDeleteCategoryMutation();
  const inlineError = categoryInUseMessage(mutation.error);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) mutation.reset();
      }}
    >
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2Icon />
        <span className="sr-only">Delete {category.name}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{category.name}"?</AlertDialogTitle>
          <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        {inlineError && (
          <p role="alert" className="text-sm text-destructive">
            {inlineError}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(category.id, { onSuccess: () => setOpen(false) })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
