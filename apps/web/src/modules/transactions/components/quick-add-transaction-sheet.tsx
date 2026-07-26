"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CreditCardIconKey } from "@oinc/api/credit-card-appearance";
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
import { useCreateCardChargeMutation } from "@/modules/credit-cards/hooks/use-create-card-charge-mutation";
import { useCreditCardsQuery } from "@/modules/credit-cards/hooks/use-credit-cards-query";
import { CREDIT_CARD_ICON_COMPONENTS } from "@/modules/credit-cards/lib/credit-card-icons";
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

function defaultValues(defaults?: {
  walletId?: string;
  cardId?: string;
}): TransactionFormValues {
  const destination = defaults?.cardId ? "creditCard" : "wallet";
  return {
    destination,
    type: "expense",
    amount: 0,
    categoryId: "",
    walletId: defaults?.walletId ?? "",
    cardId: defaults?.cardId ?? "",
    status: "posted",
    count: 1,
    date: todayIsoDate(),
    note: "",
  };
}

// Reachable via both a visible "Add transaction" button and the global "n"
// shortcut (see QuickAddTransactionProvider) — opening it never navigates
// away from the current page. Handles both destinations (wallet or credit
// card) in one sheet — see design.md Decision 1.
export function QuickAddTransactionSheet({
  open,
  onOpenChange,
  defaultWalletId,
  defaultCardId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWalletId?: string;
  defaultCardId?: string;
}) {
  const { data: wallets } = useWalletsQuery();
  const { data: cards } = useCreditCardsQuery();
  const createTransaction = useCreateTransactionMutation();
  const createCardCharge = useCreateCardChargeMutation();
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: defaultValues({
      walletId: defaultWalletId,
      cardId: defaultCardId,
    }),
  });

  // Re-baseline every time the sheet opens (or what it's scoped to changes)
  // so a previous submission never leaks into the next one.
  useEffect(() => {
    if (open) {
      form.reset(
        defaultValues({ walletId: defaultWalletId, cardId: defaultCardId }),
      );
    }
  }, [open, defaultWalletId, defaultCardId, form.reset]);

  const destination = form.watch("destination");
  const type = form.watch("type");
  const isPending = createTransaction.isPending || createCardCharge.isPending;

  function onSubmit(values: TransactionFormValues) {
    if (values.destination === "wallet") {
      createTransaction.mutate(
        {
          walletId: values.walletId as string,
          type: values.type,
          amount: values.amount,
          categoryId: values.categoryId,
          date: values.date,
          note: values.note,
        },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }

    createCardCharge.mutate(
      {
        cardId: values.cardId as string,
        amount: values.amount,
        categoryId: values.categoryId,
        date: values.date,
        note: values.note,
        status: values.status,
        count: values.count,
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
            <SheetTitle>Add transaction</SheetTitle>
            <SheetDescription>
              Log money moving in or out of a wallet or credit card.
            </SheetDescription>
          </SheetHeader>
          <FieldGroup className="flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel>Destination</FieldLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={destination === "wallet" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    form.setValue("destination", "wallet", {
                      shouldValidate: true,
                    });
                    form.setValue("type", "expense", { shouldValidate: true });
                    form.setValue("categoryId", "", { shouldValidate: true });
                  }}
                >
                  Wallet
                </Button>
                <Button
                  type="button"
                  variant={destination === "creditCard" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    form.setValue("destination", "creditCard", {
                      shouldValidate: true,
                    });
                    form.setValue("type", "expense", { shouldValidate: true });
                    form.setValue("categoryId", "", { shouldValidate: true });
                  }}
                >
                  Credit Card
                </Button>
              </div>
            </Field>
            {destination === "wallet" && (
              <Field>
                <FieldLabel>Type</FieldLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={type === "expense" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      form.setValue("type", "expense", {
                        shouldValidate: true,
                      });
                      form.setValue("categoryId", "", {
                        shouldValidate: true,
                      });
                    }}
                  >
                    Expense
                  </Button>
                  <Button
                    type="button"
                    variant={type === "income" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      form.setValue("type", "income", {
                        shouldValidate: true,
                      });
                      form.setValue("categoryId", "", {
                        shouldValidate: true,
                      });
                    }}
                  >
                    Income
                  </Button>
                </div>
              </Field>
            )}
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
            {destination === "wallet" ? (
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
            ) : (
              <Field data-invalid={!!form.formState.errors.cardId}>
                <FieldLabel>Card</FieldLabel>
                <Select
                  value={form.watch("cardId") || null}
                  onValueChange={(next) =>
                    form.setValue("cardId", next ?? "", {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a card">
                      {(selected: string | null) =>
                        (cards ?? []).find((card) => card.id === selected)?.name
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(cards ?? []).map((card) => {
                      const Icon =
                        CREDIT_CARD_ICON_COMPONENTS[
                          card.icon as CreditCardIconKey
                        ];
                      return (
                        <SelectItem key={card.id} value={card.id}>
                          <span
                            className="flex size-5 shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: card.color }}
                          >
                            <Icon className="size-3 text-white" />
                          </span>
                          {card.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FieldError errors={[form.formState.errors.cardId]} />
              </Field>
            )}
            {destination === "creditCard" && (
              <>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={
                        form.watch("status") === "posted"
                          ? "default"
                          : "outline"
                      }
                      className="flex-1"
                      onClick={() =>
                        form.setValue("status", "posted", {
                          shouldValidate: true,
                        })
                      }
                    >
                      Posted
                    </Button>
                    <Button
                      type="button"
                      variant={
                        form.watch("status") === "pending"
                          ? "default"
                          : "outline"
                      }
                      className="flex-1"
                      onClick={() =>
                        form.setValue("status", "pending", {
                          shouldValidate: true,
                        })
                      }
                    >
                      Pending
                    </Button>
                  </div>
                </Field>
                <Field data-invalid={!!form.formState.errors.count}>
                  <FieldLabel htmlFor="quick-add-count">
                    Installments
                  </FieldLabel>
                  <Input
                    id="quick-add-count"
                    type="number"
                    step="1"
                    min="1"
                    aria-invalid={!!form.formState.errors.count}
                    {...form.register("count", { valueAsNumber: true })}
                  />
                  <FieldError errors={[form.formState.errors.count]} />
                </Field>
              </>
            )}
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
            <Button type="submit" disabled={isPending}>
              Add transaction
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
