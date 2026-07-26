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
import type { CreditCardDto } from "../api";
import { useCreateCreditCardPaymentMutation } from "../hooks/use-create-credit-card-payment-mutation";
import {
  type PayCreditCardFormValues,
  payCreditCardFormSchema,
} from "../schemas/pay-credit-card-form.schema";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function defaultValues(card: CreditCardDto): PayCreditCardFormValues {
  return {
    amount: card.statement.total,
    walletId: "",
    date: todayIsoDate(),
    note: "",
  };
}

// Amount is pre-filled with the closed statement's total but editable
// (design.md Decision 5) — a contextual button + sheet on the card's own
// page, not a global shortcut, since paying down a card is roughly a
// once-per-cycle action rather than a frequent one.
export function PayCreditCardSheet({
  card,
  open,
  onOpenChange,
}: {
  card: CreditCardDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: wallets } = useWalletsQuery();
  const mutation = useCreateCreditCardPaymentMutation();
  const form = useForm<PayCreditCardFormValues>({
    resolver: zodResolver(payCreditCardFormSchema),
    defaultValues: defaultValues(card),
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-baseline when the sheet opens, not on every card refetch or form.reset identity change.
  useEffect(() => {
    if (open) {
      form.reset(defaultValues(card));
    }
  }, [open]);

  function onSubmit(values: PayCreditCardFormValues) {
    mutation.mutate(
      { cardId: card.id, ...values },
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
            <SheetTitle>Pay {card.name}</SheetTitle>
            <SheetDescription>
              Move money from a wallet to reduce what's owed on this card.
            </SheetDescription>
          </SheetHeader>
          <FieldGroup className="flex-1 overflow-y-auto px-4">
            <Field data-invalid={!!form.formState.errors.walletId}>
              <FieldLabel>From wallet</FieldLabel>
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
            <Field data-invalid={!!form.formState.errors.amount}>
              <FieldLabel htmlFor="pay-card-amount">Amount</FieldLabel>
              <Input
                id="pay-card-amount"
                type="number"
                step="0.01"
                aria-invalid={!!form.formState.errors.amount}
                {...form.register("amount", { valueAsNumber: true })}
              />
              <FieldError errors={[form.formState.errors.amount]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.date}>
              <FieldLabel htmlFor="pay-card-date">Date</FieldLabel>
              <Input
                id="pay-card-date"
                type="date"
                aria-invalid={!!form.formState.errors.date}
                {...form.register("date")}
              />
              <FieldError errors={[form.formState.errors.date]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="pay-card-note">Note</FieldLabel>
              <Input
                id="pay-card-note"
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
              Pay card
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
