"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_CATEGORY_ICON } from "@oinc/api/category-appearance";
import { PlusIcon } from "lucide-react";
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
import { COLOR_PRESETS } from "@/lib/color-presets";
import { useCreateCategoryMutation } from "../hooks/use-create-category-mutation";
import {
  type NewCategoryFormValues,
  newCategoryFormSchema,
} from "../schemas/category-form.schema";
import { CategoryAppearancePicker } from "./category-appearance-picker";

// The "new category" affordance inside the quick-add sheet's category
// picker — a small dialog so creating a custom category never requires
// leaving the transaction flow (design.md decision 3 / 6.4).
export function NewCategoryDialog({
  type,
  onCreated,
}: {
  type: "income" | "expense";
  onCreated: (categoryId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useCreateCategoryMutation();
  const form = useForm<NewCategoryFormValues>({
    resolver: zodResolver(newCategoryFormSchema),
    defaultValues: {
      name: "",
      color: COLOR_PRESETS[0],
      icon: DEFAULT_CATEGORY_ICON,
    },
  });

  function onSubmit(values: NewCategoryFormValues) {
    mutation.mutate(
      { ...values, type },
      {
        onSuccess: (created) => {
          setOpen(false);
          form.reset();
          onCreated(created.id);
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger
        render={<Button type="button" variant="outline" size="icon" />}
      >
        <PlusIcon />
        <span className="sr-only">New category</span>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>
              Create a {type} category without leaving this form.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="new-category-name">Name</FieldLabel>
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
                  id="new-category-name"
                  className="flex-1"
                  placeholder="e.g. Groceries"
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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
