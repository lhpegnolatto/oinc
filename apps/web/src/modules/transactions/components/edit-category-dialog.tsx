"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { CategoryDto } from "../api";
import { useUpdateCategoryMutation } from "../hooks/use-update-category-mutation";
import {
  type EditCategoryFormValues,
  editCategoryFormSchema,
} from "../schemas/category-form.schema";
import { CategoryAppearancePicker } from "./category-appearance-picker";

// Mirrors wallets/components/edit-wallet-dialog.tsx's pattern, reusing
// CategoryAppearancePicker the same way NewCategoryDialog does.
export function EditCategoryDialog({ category }: { category: CategoryDto }) {
  const [open, setOpen] = useState(false);
  const mutation = useUpdateCategoryMutation();
  const form = useForm<EditCategoryFormValues>({
    resolver: zodResolver(editCategoryFormSchema),
    values: {
      name: category.name,
      color: category.color,
      icon: category.icon as EditCategoryFormValues["icon"],
    },
  });

  function onSubmit(values: EditCategoryFormValues) {
    mutation.mutate(
      { id: category.id, ...values },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <PencilIcon />
        <span className="sr-only">Edit {category.name}</span>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              Update its name, color, or icon.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="edit-category-name">Name</FieldLabel>
              <div className="flex items-center gap-2">
                <CategoryAppearancePicker
                  color={form.watch("color")}
                  icon={form.watch("icon")}
                  onColorChange={(color) =>
                    form.setValue("color", color, { shouldValidate: true })
                  }
                  onIconChange={(icon) =>
                    form.setValue("icon", icon, { shouldValidate: true })
                  }
                />
                <Input
                  id="edit-category-name"
                  className="flex-1"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
