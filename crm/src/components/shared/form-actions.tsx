"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/**
 * Boutons de formulaire. Sur mobile, barre collée en bas de l'écran pour que
 * « Enregistrer » reste toujours accessible au pouce.
 */
export function FormActions({
  pending,
  submitLabel = t.common.save,
  onCancel,
  sticky = true,
}: {
  pending: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  sticky?: boolean;
}) {
  const router = useRouter();
  return (
    <div
      className={
        sticky
          ? "bg-card/95 pb-safe sticky bottom-0 z-20 -mx-4 mt-2 flex gap-2 border-t px-4 py-3 backdrop-blur md:static md:mx-0 md:justify-end md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none"
          : "mt-2 flex gap-2 md:justify-end"
      }
    >
      <Button
        type="button"
        variant="outline"
        className="flex-1 md:flex-none"
        onClick={onCancel ?? (() => router.back())}
      >
        {t.common.cancel}
      </Button>
      <Button type="submit" className="flex-1 md:flex-none" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {pending ? t.common.saving : submitLabel}
      </Button>
    </div>
  );
}
