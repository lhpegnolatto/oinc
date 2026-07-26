"use client";

import { Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { CardChargeDto } from "../api";
import { useCardChargesQuery } from "../hooks/use-card-charges-query";
import { useDeleteCardChargeMutation } from "../hooks/use-delete-card-charge-mutation";
import { useDeleteRemainingInstallmentsMutation } from "../hooks/use-delete-remaining-installments-mutation";

// Reuses transactions' confirmation-dialog pattern (DeleteTransactionDialog)
// — an explicit confirmation step before the delete request is sent. Offers
// a second "delete remaining installments" option when this charge belongs
// to a plan with at least one later installment still outstanding (design.md
// Decision 6).
export function DeleteChargeDialog({
  charge,
  onDeleted,
}: {
  charge: CardChargeDto;
  onDeleted: () => void;
}) {
  const mutation = useDeleteCardChargeMutation();
  const deleteRemaining = useDeleteRemainingInstallmentsMutation();
  const { data: siblingCharges } = useCardChargesQuery(charge.cardId ?? "");

  const hasRemainingInstallments =
    !!charge.installmentPlanId &&
    (siblingCharges ?? []).some(
      (sibling) =>
        sibling.id !== charge.id &&
        sibling.installmentPlanId === charge.installmentPlanId &&
        sibling.date >= charge.date,
    );

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button type="button" variant="ghost" size="icon" />}
      >
        <Trash2Icon />
        <span className="sr-only">Delete charge</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this charge?</AlertDialogTitle>
          <AlertDialogDescription>
            This reverses its effect on the card's balance. This can't be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {hasRemainingInstallments && (
            <AlertDialogAction
              variant="destructive"
              disabled={deleteRemaining.isPending}
              onClick={() =>
                deleteRemaining.mutate(
                  { id: charge.id, cardId: charge.cardId ?? "" },
                  { onSuccess: onDeleted },
                )
              }
            >
              Delete this and remaining installments
            </AlertDialogAction>
          )}
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(
                { id: charge.id, cardId: charge.cardId ?? "" },
                { onSuccess: onDeleted },
              )
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
