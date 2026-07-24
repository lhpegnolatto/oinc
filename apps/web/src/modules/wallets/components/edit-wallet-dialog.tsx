"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon } from "lucide-react";
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
import { useUpdateWalletMutation } from "../hooks/use-update-wallet-mutation";
import {
  type EditWalletFormValues,
  editWalletFormSchema,
} from "../schemas/wallet-form.schema";
import { WalletAppearancePicker } from "./wallet-appearance-picker";

export function EditWalletDialog({
  wallet,
}: {
  wallet: { id: string; name: string; color: string; icon: string };
}) {
  const [open, setOpen] = useState(false);
  const mutation = useUpdateWalletMutation();
  const form = useForm<EditWalletFormValues>({
    resolver: zodResolver(editWalletFormSchema),
    values: {
      name: wallet.name,
      color: wallet.color,
      icon: wallet.icon as EditWalletFormValues["icon"],
    },
  });

  function onSubmit(values: EditWalletFormValues) {
    mutation.mutate(
      { id: wallet.id, ...values },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <PencilIcon />
        <span className="sr-only">Rename {wallet.name}</span>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Rename wallet</DialogTitle>
            <DialogDescription>
              Its balance can't be changed here — only the name.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="edit-wallet-name">Name</FieldLabel>
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
                  id="edit-wallet-name"
                  className="flex-1"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </div>
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
