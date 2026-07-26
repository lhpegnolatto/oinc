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
import type { CreditCardPaymentDto } from "../api";
import { useDeleteCreditCardPaymentMutation } from "../hooks/use-delete-credit-card-payment-mutation";

// A payment isn't editable (design.md Non-Goal) — delete and re-record is the
// only correction path, so this dialog is the payment's only action besides
// viewing it.
export function DeletePaymentDialog({
  payment,
}: {
  payment: CreditCardPaymentDto;
}) {
  const mutation = useDeleteCreditCardPaymentMutation();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" />}
      >
        <Trash2Icon />
        <span className="sr-only">Delete payment</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
          <AlertDialogDescription>
            This reverses its effect on both the card's and wallet's balance.
            This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({ id: payment.id, cardId: payment.cardId })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
