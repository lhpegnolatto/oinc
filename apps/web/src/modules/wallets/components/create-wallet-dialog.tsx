"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_WALLET_ICON } from "@oinc/api/wallet-appearance";
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
import { useCreateWalletMutation } from "../hooks/use-create-wallet-mutation";
import { WALLET_COLOR_PRESETS } from "../lib/wallet-color-presets";
import {
  type CreateWalletFormValues,
  createWalletFormSchema,
} from "../schemas/wallet-form.schema";
import { WalletAppearancePicker } from "./wallet-appearance-picker";

export function CreateWalletDialog({
  trigger,
}: {
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useCreateWalletMutation();
  const form = useForm<CreateWalletFormValues>({
    resolver: zodResolver(createWalletFormSchema),
    defaultValues: {
      name: "",
      balance: 0,
      color: WALLET_COLOR_PRESETS[0],
      icon: DEFAULT_WALLET_ICON,
    },
  });

  function onSubmit(values: CreateWalletFormValues) {
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
            <DialogTitle>Create wallet</DialogTitle>
            <DialogDescription>
              Give it a name and a starting balance.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="create-wallet-name">Name</FieldLabel>
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
                  id="create-wallet-name"
                  className="flex-1"
                  placeholder="e.g. Checking"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.balance}>
              <FieldLabel htmlFor="create-wallet-balance">
                Starting balance
              </FieldLabel>
              <Input
                id="create-wallet-balance"
                type="number"
                step="0.01"
                aria-invalid={!!form.formState.errors.balance}
                {...form.register("balance", { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.balance]} />
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
