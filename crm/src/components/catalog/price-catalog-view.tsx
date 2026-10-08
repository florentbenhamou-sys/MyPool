"use client";

import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { IconButton } from "@/components/shared/row-menu";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";
import { setPriceItemActiveAction } from "@/server/actions/catalog";
import { ActiveToggle } from "./active-toggle";
import { PriceItemDialog, type PriceItemView, type PriceKind } from "./price-item-dialog";

export function PriceCatalogView({
  kind,
  items,
  defaultCurrency,
}: {
  kind: PriceKind;
  items: PriceItemView[];
  defaultCurrency: string;
}) {
  const suffix = kind === "subscription" ? ` ${t.pricing.perYear}` : "";
  const edit = (item: PriceItemView) => (
    <PriceItemDialog
      kind={kind}
      item={item}
      defaultCurrency={defaultCurrency}
      trigger={
        <IconButton label={t.common.edit}>
          <Pencil />
        </IconButton>
      }
    />
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{t.catalog.deactivateHint}</p>
        <PriceItemDialog
          kind={kind}
          defaultCurrency={defaultCurrency}
          trigger={
            <Button>
              <Plus /> {t.common.add}
            </Button>
          }
        />
      </div>
      {items.length === 0 ? (
        <EmptyState>{t.common.emptyList}</EmptyState>
      ) : (
        <Card className="divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 md:flex-nowrap"
            >
              <div className="min-w-0 flex-1 basis-full md:basis-auto">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <span className="font-mono text-sm">{item.code}</span>
                  {!item.active && <Badge variant="outline">{t.common.inactive}</Badge>}
                  {item.usageCount > 0 && (
                    <Badge variant="secondary">
                      {item.usageCount} × {t.proposal.plural.toLowerCase()}
                    </Badge>
                  )}
                </p>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
              <p className="money font-medium">
                {formatMoney(item.listPrice, item.currency)}
                <span className="text-muted-foreground text-xs">{suffix}</span>
              </p>
              <div className="ml-auto flex items-center">
                <ActiveToggle
                  active={item.active}
                  onToggle={(next) => setPriceItemActiveAction(kind, item.id, next)}
                />
                {edit(item)}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
