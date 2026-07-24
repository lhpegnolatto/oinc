"use client";

import { Trash2Icon } from "lucide-react";
import { useState } from "react";
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
import { useDeleteWalletMutation } from "../hooks/use-delete-wallet-mutation";

export function DeleteWalletDialog({
  wallet,
}: {
  wallet: { id: string; name: string };
}) {
  const [open, setOpen] = useState(false);
  const mutation = useDeleteWalletMutation();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2Icon />
        <span className="sr-only">Delete {wallet.name}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{wallet.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the wallet and its balance. This can't be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(wallet.id, { onSuccess: () => setOpen(false) })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
