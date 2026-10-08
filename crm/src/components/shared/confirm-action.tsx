"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionResult } from "@/lib/action-result";
import { t } from "@/lib/i18n";

/**
 * Bouton + boîte de confirmation exécutant une Server Action
 * (suppression, archivage...). Affiche un toast de résultat.
 */
export function ConfirmAction({
  trigger,
  title = t.common.confirmDeleteTitle,
  description = t.common.confirmDeleteText,
  confirmLabel = t.common.delete,
  successMessage = t.common.deleted,
  action,
  redirectTo,
}: {
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  confirmLabel?: string;
  successMessage?: string;
  action: () => Promise<ActionResult<unknown>>;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await action();
                if (!result.ok) {
                  toast.error(result.error);
                  setOpen(false);
                  return;
                }
                toast.success(successMessage);
                setOpen(false);
                if (redirectTo) router.push(redirectTo);
              });
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
