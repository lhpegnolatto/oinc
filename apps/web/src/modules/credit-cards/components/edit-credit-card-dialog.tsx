"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CreditCardIconKey } from "@oinc/api/credit-card-appearance";
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
import { WalletAppearancePicker } from "@/modules/wallets/components/wallet-appearance-picker";
import { useUpdateCreditCardMutation } from "../hooks/use-update-credit-card-mutation";
import {
  type EditCreditCardFormValues,
  editCreditCardFormSchema,
} from "../schemas/credit-card-form.schema";

export function EditCreditCardDialog({
  card,
}: {
  card: {
    id: string;
    name: string;
    color: string;
    icon: string;
    statementCloseDay: number;
    dueDay: number;
  };
}) {
  const [open, setOpen] = useState(false);
  const mutation = useUpdateCreditCardMutation();
  const form = useForm<EditCreditCardFormValues>({
    resolver: zodResolver(editCreditCardFormSchema),
    values: {
      name: card.name,
      color: card.color,
      icon: card.icon as CreditCardIconKey,
      statementCloseDay: card.statementCloseDay,
      dueDay: card.dueDay,
    },
  });

  function onSubmit(values: EditCreditCardFormValues) {
    mutation.mutate(
      { id: card.id, ...values },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <PencilIcon />
        <span className="sr-only">Edit {card.name}</span>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Edit credit card</DialogTitle>
            <DialogDescription>
              Its balance can't be changed here — only through charges.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="edit-card-name">Name</FieldLabel>
              <div className="flex items-center gap-2">
                <WalletAppearancePicker
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
                  id="edit-card-name"
                  className="flex-1"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!form.formState.errors.statementCloseDay}>
                <FieldLabel htmlFor="edit-card-statement-close-day">
                  Statement close day
                </FieldLabel>
                <Input
                  id="edit-card-statement-close-day"
                  type="number"
                  min={1}
                  max={31}
                  aria-invalid={!!form.formState.errors.statementCloseDay}
                  {...form.register("statementCloseDay", {
                    valueAsNumber: true,
                  })}
                />
                <FieldError
                  errors={[form.formState.errors.statementCloseDay]}
                />
              </Field>
              <Field data-invalid={!!form.formState.errors.dueDay}>
                <FieldLabel htmlFor="edit-card-due-day">Due day</FieldLabel>
                <Input
                  id="edit-card-due-day"
                  type="number"
                  min={1}
                  max={31}
                  aria-invalid={!!form.formState.errors.dueDay}
                  {...form.register("dueDay", { valueAsNumber: true })}
                />
                <FieldError errors={[form.formState.errors.dueDay]} />
              </Field>
            </div>
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
