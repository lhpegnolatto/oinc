"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { WalletIconKey } from "@oinc/api/wallet-appearance";
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
import type { TransactionDto } from "../api";
import { useUpdateTransactionMutation } from "../hooks/use-update-transaction-mutation";
import {
  type TransactionFormValues,
  transactionFormSchema,
} from "../schemas/transaction-form.schema";
import { CategoryPicker } from "./category-picker";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";

export function EditTransactionSheet({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: TransactionDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: wallets } = useWalletsQuery();
  const mutation = useUpdateTransactionMutation();
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    values: {
      type: transaction.type,
      amount: transaction.amount,
      categoryId: transaction.categoryId,
      walletId: transaction.walletId,
      date: transaction.date,
      note: transaction.note ?? "",
    },
  });

  const type = form.watch("type");

  function onSubmit(values: TransactionFormValues) {
    mutation.mutate(
      {
        id: transaction.id,
        previousWalletId: transaction.walletId,
        ...values,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex h-full flex-col gap-4"
        >
          <SheetHeader>
            <SheetTitle>Edit transaction</SheetTitle>
            <SheetDescription>
              Update its details, or remove it entirely.
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
              <FieldLabel htmlFor="edit-transaction-amount">Amount</FieldLabel>
              <Input
                id="edit-transaction-amount"
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
              <FieldLabel htmlFor="edit-transaction-date">Date</FieldLabel>
              <Input
                id="edit-transaction-date"
                type="date"
                aria-invalid={!!form.formState.errors.date}
                {...form.register("date")}
              />
              <FieldError errors={[form.formState.errors.date]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-transaction-note">Note</FieldLabel>
              <Input
                id="edit-transaction-note"
                placeholder="Optional"
                {...form.register("note")}
              />
            </Field>
          </FieldGroup>
          <SheetFooter className="flex-row items-center justify-between">
            <DeleteTransactionDialog
              transaction={transaction}
              onDeleted={() => onOpenChange(false)}
            />
            <div className="flex gap-2">
              <SheetClose render={<Button type="button" variant="outline" />}>
                Cancel
              </SheetClose>
              <Button type="submit" disabled={mutation.isPending}>
                Save
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
