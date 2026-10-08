"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { t } from "@/lib/i18n";
import { ConfirmAction } from "./confirm-action";

/** Boutons « Modifier » + « Supprimer » (avec confirmation) d'une page de détail. */
export function DetailActions({
  editHref,
  onDelete,
  redirectTo,
}: {
  editHref: string;
  onDelete: () => Promise<ActionResult<unknown>>;
  redirectTo: string;
}) {
  return (
    <>
      <Button asChild variant="outline">
        <Link href={editHref}>
          <Pencil /> {t.common.edit}
        </Link>
      </Button>
      <ConfirmAction
        trigger={
          <Button variant="outline" className="text-destructive">
            <Trash2 /> {t.common.delete}
          </Button>
        }
        action={onDelete}
        redirectTo={redirectTo}
      />
    </>
  );
}
