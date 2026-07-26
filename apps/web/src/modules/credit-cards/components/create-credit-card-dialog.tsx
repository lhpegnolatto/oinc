"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_CREDIT_CARD_ICON } from "@oinc/api/credit-card-appearance";
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
import { WalletAppearancePicker } from "@/modules/wallets/components/wallet-appearance-picker";
import { useCreateCreditCardMutation } from "../hooks/use-create-credit-card-mutation";
import {
  type CreateCreditCardFormValues,
  createCreditCardFormSchema,
} from "../schemas/credit-card-form.schema";

export function CreateCreditCardDialog({
  trigger,
}: {
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useCreateCreditCardMutation();
  const form = useForm<CreateCreditCardFormValues>({
    resolver: zodResolver(createCreditCardFormSchema),
    defaultValues: {
      name: "",
      balance: 0,
      statementCloseDay: 1,
      dueDay: 15,
      color: COLOR_PRESETS[0],
      icon: DEFAULT_CREDIT_CARD_ICON,
    },
  });

  function onSubmit(values: CreateCreditCardFormValues) {
    mutation.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Create credit card</DialogTitle>
            <DialogDescription>
              Give it a name, a starting balance, and its statement dates.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="create-card-name">Name</FieldLabel>
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
                  id="create-card-name"
                  className="flex-1"
                  placeholder="e.g. Rewards Card"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.balance}>
              <FieldLabel htmlFor="create-card-balance">
                Starting balance
              </FieldLabel>
              <Input
                id="create-card-balance"
                type="number"
                step="0.01"
                aria-invalid={!!form.formState.errors.balance}
                {...form.register("balance", { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.balance]} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!form.formState.errors.statementCloseDay}>
                <FieldLabel htmlFor="create-card-statement-close-day">
                  Statement close day
                </FieldLabel>
                <Input
                  id="create-card-statement-close-day"
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
                <FieldLabel htmlFor="create-card-due-day">Due day</FieldLabel>
                <Input
                  id="create-card-due-day"
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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
