"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_INVESTMENT_ICON } from "@oinc/api/investment-appearance";
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
import { useCreateInvestmentMutation } from "../hooks/use-create-investment-mutation";
import {
  type InvestmentFormValues,
  investmentFormSchema,
} from "../schemas/investment-form.schema";

export function CreateInvestmentDialog({
  trigger,
}: {
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useCreateInvestmentMutation();
  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: {
      name: "",
      currentValue: 0,
      quantity: undefined,
      costBasis: undefined,
      color: COLOR_PRESETS[0],
      icon: DEFAULT_INVESTMENT_ICON,
    },
  });

  function onSubmit(values: InvestmentFormValues) {
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
            <DialogTitle>Create holding</DialogTitle>
            <DialogDescription>
              Give it a name and its current value. Quantity and cost basis are
              optional.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="create-investment-name">Name</FieldLabel>
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
                  id="create-investment-name"
                  className="flex-1"
                  placeholder="e.g. S&P 500 ETF"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.currentValue}>
              <FieldLabel htmlFor="create-investment-current-value">
                Current value
              </FieldLabel>
              <Input
                id="create-investment-current-value"
                type="number"
                step="0.01"
                aria-invalid={!!form.formState.errors.currentValue}
                {...form.register("currentValue", { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.currentValue]} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!form.formState.errors.quantity}>
                <FieldLabel htmlFor="create-investment-quantity">
                  Quantity
                </FieldLabel>
                <Input
                  id="create-investment-quantity"
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
                <FieldLabel htmlFor="create-investment-cost-basis">
                  Cost basis
                </FieldLabel>
                <Input
                  id="create-investment-cost-basis"
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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
