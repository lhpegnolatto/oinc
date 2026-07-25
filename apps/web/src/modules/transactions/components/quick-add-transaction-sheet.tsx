"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { WalletIconKey } from "@oinc/api/wallet-appearance";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWalletsQuery } from "@/modules/wallets/hooks/use-wallets-query";
import { WALLET_ICON_COMPONENTS } from "@/modules/wallets/lib/wallet-icons";
import { useCreateTransactionMutation } from "../hooks/use-create-transaction-mutation";
import {
  type TransactionFormValues,
  transactionFormSchema,
} from "../schemas/transaction-form.schema";
import { CategoryPicker } from "./category-picker";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultValues(defaultWalletId?: string): TransactionFormValues {
  return {
    type: "expense",
    amount: 0,
    categoryId: "",
    walletId: defaultWalletId ?? "",
    date: todayIsoDate(),
    note: "",
  };
}

// Reachable via both a persistent quick-action button and the global "n"
// shortcut (see QuickAddTransactionTrigger) — opening it never navigates
// away from the current page.
export function QuickAddTransactionSheet({
  open,
  onOpenChange,
  defaultWalletId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWalletId?: string;
}) {
  const { data: wallets } = useWalletsQuery();
  const mutation = useCreateTransactionMutation();
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: defaultValues(defaultWalletId),
  });

  // Re-baseline every time the sheet opens (or the wallet it's scoped to
  // changes) so a previous submission never leaks into the next one.
  useEffect(() => {
    if (open) {
      form.reset(defaultValues(defaultWalletId));
    }
  }, [open, defaultWalletId, form.reset]);

  const type = form.watch("type");

  function onSubmit(values: TransactionFormValues) {
    mutation.mutate(values, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex h-full flex-col gap-4"
        >
          <SheetHeader>
            <SheetTitle>Add transaction</SheetTitle>
            <SheetDescription>
              Log money moving in or out of a wallet.
            </SheetDescription>
          </SheetHeader>
          <FieldGroup className="flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel>Type</FieldLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "expense" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    form.setValue("type", "expense", { shouldValidate: true });
                    form.setValue("categoryId", "", { shouldValidate: true });
                  }}
                >
                  Expense
                </Button>
                <Button
                  type="button"
                  variant={type === "income" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    form.setValue("type", "income", { shouldValidate: true });
                    form.setValue("categoryId", "", { shouldValidate: true });
                  }}
                >
                  Income
                </Button>
              </div>
            </Field>
            <Field data-invalid={!!form.formState.errors.amount}>
              <FieldLabel htmlFor="quick-add-amount">Amount</FieldLabel>
              <Input
                id="quick-add-amount"
                type="number"
                step="0.01"
                aria-invalid={!!form.formState.errors.amount}
                {...form.register("amount", { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.amount]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.categoryId}>
              <FieldLabel>Category</FieldLabel>
              <CategoryPicker
                type={type}
                value={form.watch("categoryId")}
                onChange={(categoryId) =>
                  form.setValue("categoryId", categoryId, {
                    shouldValidate: true,
                  })
                }
              />
              <FieldError errors={[form.formState.errors.categoryId]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.walletId}>
              <FieldLabel>Wallet</FieldLabel>
              <Select
                value={form.watch("walletId") || null}
                onValueChange={(next) =>
                  form.setValue("walletId", next ?? "", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a wallet">
                    {(selected: string | null) =>
                      (wallets ?? []).find((wallet) => wallet.id === selected)
                        ?.name
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(wallets ?? []).map((wallet) => {
                    const Icon =
                      WALLET_ICON_COMPONENTS[wallet.icon as WalletIconKey];
                    return (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        <span
                          className="flex size-5 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: wallet.color }}
                        >
                          <Icon className="size-3 text-white" />
                        </span>
                        {wallet.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FieldError errors={[form.formState.errors.walletId]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.date}>
              <FieldLabel htmlFor="quick-add-date">Date</FieldLabel>
              <Input
                id="quick-add-date"
                type="date"
                aria-invalid={!!form.formState.errors.date}
                {...form.register("date")}
              />
              <FieldError errors={[form.formState.errors.date]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="quick-add-note">Note</FieldLabel>
              <Input
                id="quick-add-note"
                placeholder="Optional"
                {...form.register("note")}
              />
            </Field>
          </FieldGroup>
          <SheetFooter>
            <SheetClose render={<Button type="button" variant="outline" />}>
              Cancel
            </SheetClose>
            <Button type="submit" disabled={mutation.isPending}>
              Add transaction
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
