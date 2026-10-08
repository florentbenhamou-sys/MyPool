"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { t } from "@/lib/i18n";

/** Activer / désactiver un élément de référentiel (jamais de suppression physique). */
export function ActiveToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: (next: boolean) => Promise<ActionResult<unknown>>;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await onToggle(!active);
          if (r.ok) toast.success(t.common.saved);
          else toast.error(r.error);
        })
      }
    >
      {active ? t.common.deactivate : t.common.activate}
    </Button>
  );
}
