"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CreditCardIconKey } from "@oinc/api/credit-card-appearance";
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
import { CategoryPicker } from "@/modules/transactions/components/category-picker";
import type { CardChargeDto } from "../api";
import { useCreditCardsQuery } from "../hooks/use-credit-cards-query";
import { useUpdateCardChargeMutation } from "../hooks/use-update-card-charge-mutation";
import { CREDIT_CARD_ICON_COMPONENTS } from "../lib/credit-card-icons";
import {
  type CardChargeFormValues,
  cardChargeFormSchema,
} from "../schemas/card-charge-form.schema";
import { DeleteChargeDialog } from "./delete-charge-dialog";

export function EditChargeSheet({
  charge,
  open,
  onOpenChange,
}: {
  charge: CardChargeDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: cards } = useCreditCardsQuery();
  const mutation = useUpdateCardChargeMutation();
  const form = useForm<CardChargeFormValues>({
    resolver: zodResolver(cardChargeFormSchema),
    values: {
      amount: charge.amount,
      categoryId: charge.categoryId,
      cardId: charge.cardId ?? "",
      date: charge.date,
      note: charge.note ?? "",
      status: charge.status ?? "posted",
    },
  });

  function onSubmit(values: CardChargeFormValues) {
    mutation.mutate(
      {
        id: charge.id,
        previousCardId: charge.cardId ?? "",
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
            <SheetTitle>Edit charge</SheetTitle>
            <SheetDescription>
              Update its details, or remove it entirely.
            </SheetDescription>
          </SheetHeader>
          <FieldGroup className="flex-1 overflow-y-auto px-4">
            <Field data-invalid={!!form.formState.errors.amount}>
              <FieldLabel htmlFor="edit-charge-amount">Amount</FieldLabel>
              <Input
                id="edit-charge-amount"
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
                type="expense"
                value={form.watch("categoryId")}
                onChange={(categoryId) =>
                  form.setValue("categoryId", categoryId, {
                    shouldValidate: true,
                  })
                }
              />
              <FieldError errors={[form.formState.errors.categoryId]} />
            </Field>
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
            <Field>
              <FieldLabel>Status</FieldLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={
                    form.watch("status") === "posted" ? "default" : "outline"
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
                    form.watch("status") === "pending" ? "default" : "outline"
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
            <Field data-invalid={!!form.formState.errors.date}>
              <FieldLabel htmlFor="edit-charge-date">Date</FieldLabel>
              <Input
                id="edit-charge-date"
                type="date"
                aria-invalid={!!form.formState.errors.date}
                {...form.register("date")}
              />
              <FieldError errors={[form.formState.errors.date]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-charge-note">Note</FieldLabel>
              <Input
                id="edit-charge-note"
                placeholder="Optional"
                {...form.register("note")}
              />
            </Field>
          </FieldGroup>
          <SheetFooter className="flex-row items-center justify-between">
            <DeleteChargeDialog
              charge={charge}
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
