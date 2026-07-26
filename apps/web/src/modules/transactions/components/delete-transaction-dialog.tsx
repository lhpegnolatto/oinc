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
import type { TransactionDto } from "../api";
import { useDeleteTransactionMutation } from "../hooks/use-delete-transaction-mutation";

// Reuses wallets' confirmation-dialog pattern (DeleteWalletDialog) — an
// explicit confirmation step before the delete request is sent.
export function DeleteTransactionDialog({
  transaction,
  onDeleted,
}: {
  transaction: TransactionDto;
  onDeleted: () => void;
}) {
  const mutation = useDeleteTransactionMutation();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button type="button" variant="ghost" size="icon" />}
      >
        <Trash2Icon />
        <span className="sr-only">Delete transaction</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            This reverses its effect on the wallet's balance. This can't be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(
                // TransactionDto's walletId is nullable at the type level
                // only because the destination union also covers credit
                // card charges — this dialog only ever renders for
                // wallet-scoped transactions.
                {
                  id: transaction.id,
                  walletId: transaction.walletId as string,
                },
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
