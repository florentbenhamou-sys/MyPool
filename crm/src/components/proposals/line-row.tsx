"use client";

import { Pencil, Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { IconButton } from "@/components/shared/row-menu";
import { formatMoney, formatPercent } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { LineView } from "./types";

/**
 * Ligne valorisée. Mobile : libellé puis montants sur une 2e ligne.
 * Desktop : colonnes alignées (prix catalogue, remise, prix client).
 */
export function LineRow({
  line,
  currency,
  editDialog,
  onDelete,
  locked,
  nested = false,
  suffix,
}: {
  line: LineView;
  currency: string;
  editDialog: (trigger: React.ReactNode) => React.ReactNode;
  onDelete: () => Promise<ActionResult<unknown>>;
  locked: boolean;
  nested?: boolean;
  suffix?: string;
}) {
  const hasDiscount = Number(line.discount) > 0;
  return (
    <div
      className={cn(
        "flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:gap-3",
        nested && "pl-4 sm:pl-6",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm break-words", nested ? "text-muted-foreground" : "font-medium")}>
          {nested && "↳ "}
          {line.code && (
            <span className="text-muted-foreground mr-2 font-mono text-xs">{line.code}</span>
          )}
          {line.description}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="flex items-baseline gap-3 text-sm">
          {hasDiscount && (
            <>
              <span className="money text-muted-foreground text-xs line-through">
                {formatMoney(line.listPrice, currency)}
              </span>
              <span
                className="text-muted-foreground text-xs"
                title={line.displayDiscount ? undefined : "Remise masquée au client"}
              >
                −{formatPercent(line.discount)}
              </span>
            </>
          )}
          <span className="money min-w-24 text-right font-semibold">
            {formatMoney(line.customerPrice, currency)}
            {suffix && (
              <span className="text-muted-foreground ml-1 text-xs font-normal">{suffix}</span>
            )}
          </span>
        </div>
        {!locked && (
          <div className="flex shrink-0">
            {editDialog(
              <IconButton label={t.common.edit}>
                <Pencil />
              </IconButton>,
            )}
            <ConfirmAction
              trigger={
                <IconButton label={t.common.delete} className="text-destructive">
                  <Trash2 />
                </IconButton>
              }
              action={onDelete}
            />
          </div>
        )}
      </div>
    </div>
  );
}
