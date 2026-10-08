"use client";

import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/** Bouton « ⋮ » compact (utilisé comme déclencheur de menu ou d'édition). */
export function IconButton({
  label = t.common.actions,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label?: string }) {
  return (
    <Button variant="ghost" size="icon-sm" aria-label={label} title={label} {...props}>
      {children ?? <MoreVertical />}
    </Button>
  );
}
