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
import { WalletAppearancePicker } from "@/modules/wallets/components/wallet-appearance-picker";
import type { InvestmentDto } from "../api";
import { useUpdateInvestmentMutation } from "../hooks/use-update-investment-mutation";
import {
  type InvestmentFormValues,
  investmentFormSchema,
} from "../schemas/investment-form.schema";

export function EditInvestmentDialog({
  investment,
}: {
  investment: InvestmentDto;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useUpdateInvestmentMutation();
  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    values: {
      name: investment.name,
      currentValue: investment.currentValue,
      quantity: investment.quantity ?? undefined,
      costBasis: investment.costBasis ?? undefined,
      color: investment.color,
      icon: investment.icon as InvestmentFormValues["icon"],
    },
  });

  function onSubmit(values: InvestmentFormValues) {
    mutation.mutate(
      { id: investment.id, ...values },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <PencilIcon />
        <span className="sr-only">Edit {investment.name}</span>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Edit holding</DialogTitle>
            <DialogDescription>
              Update its value whenever you check your actual position
              elsewhere.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="edit-investment-name">Name</FieldLabel>
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
                  id="edit-investment-name"
                  className="flex-1"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.currentValue}>
              <FieldLabel htmlFor="edit-investment-current-value">
                Current value
              </FieldLabel>
              <Input
                id="edit-investment-current-value"
                type="number"
                step="0.01"
                aria-invalid={!!form.formState.errors.currentValue}
                {...form.register("currentValue", { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.currentValue]} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!form.formState.errors.quantity}>
                <FieldLabel htmlFor="edit-investment-quantity">
                  Quantity
                </FieldLabel>
                <Input
                  id="edit-investment-quantity"
                  type="number"
                  step="any"
                  placeholder="Optional"
                  aria-invalid={!!form.formState.errors.quantity}
                  {...form.register("quantity", {
                    setValueAs: (value) =>
                      value === "" ? undefined : Number(value),
                  })}
                />
                <FieldError errors={[form.formState.errors.quantity]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.costBasis}>
                <FieldLabel htmlFor="edit-investment-cost-basis">
                  Cost basis
                </FieldLabel>
                <Input
                  id="edit-investment-cost-basis"
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  aria-invalid={!!form.formState.errors.costBasis}
                  {...form.register("costBasis", {
                    setValueAs: (value) =>
                      value === "" ? undefined : Number(value),
                  })}
                />
                <FieldError errors={[form.formState.errors.costBasis]} />
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
