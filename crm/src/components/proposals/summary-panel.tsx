import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ScenarioSummaryView } from "./types";

/** Les trois montants clés : ANNUEL / ONE SHOT / ANNÉE 1. */
export function KeyAmounts({
  summary,
  currency,
  compact = false,
  stacked = false,
}: {
  summary: Pick<ScenarioSummaryView, "annual" | "oneShot" | "firstYear">;
  currency: string;
  compact?: boolean;
  /** Une ligne par montant (panneau latéral étroit). */
  stacked?: boolean;
}) {
  const items = [
    { label: t.pricing.annual, value: summary.annual },
    { label: t.pricing.oneShot, value: summary.oneShot },
    { label: t.pricing.firstYear, value: summary.firstYear, strong: true },
  ];
  if (stacked) {
    return (
      <dl className="flex flex-col gap-2">
        {items.map((i) => (
          <div key={i.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {i.label}
            </dt>
            <dd className={cn("money text-xl font-semibold", i.strong && "text-primary text-2xl")}>
              {formatMoney(i.value, currency)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <div className={cn("grid grid-cols-3", compact ? "gap-2" : "gap-3")}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <p
            className={cn(
              "text-muted-foreground font-medium tracking-wide uppercase",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            {i.label}
          </p>
          <p
            className={cn(
              "money truncate font-semibold",
              compact ? "text-sm" : "text-lg xl:text-xl",
              i.strong && "text-primary",
            )}
            title={formatMoney(i.value, currency)}
          >
            {formatMoney(i.value, currency)}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Synthèse détaillée d'un scénario (toujours visible sur desktop). */
export function ScenarioSummaryPanel({
  title,
  summary,
  currency,
  hasAlternatives,
}: {
  title: string;
  summary: ScenarioSummaryView;
  currency: string;
  hasAlternatives: boolean;
}) {
  const rows = [
    { label: t.pricing.subscriptions, value: summary.subscription, suffix: t.pricing.perYear },
    { label: t.pricing.services, value: summary.service },
    { label: t.pricing.serviceOptions, value: summary.serviceOption },
    { label: t.pricing.maintenances, value: summary.maintenance },
    { label: t.pricing.additionalOptions, value: summary.additionalOption },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t.proposal.summary} — {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <KeyAmounts summary={summary} currency={currency} stacked />
        <dl className="flex flex-col gap-1.5 border-t pt-3 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="money">
                {formatMoney(r.value, currency)}
                {r.suffix && <span className="text-muted-foreground ml-1 text-xs">{r.suffix}</span>}
              </dd>
            </div>
          ))}
          <div className="mt-1 flex justify-between gap-3 border-t pt-2">
            <dt className="text-muted-foreground">{t.pricing.yearN}</dt>
            <dd className="money font-medium">{formatMoney(summary.yearN, currency)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t.pricing.discountTotal}</dt>
            <dd className="money">{formatMoney(summary.discountTotal, currency)}</dd>
          </div>
        </dl>
        {hasAlternatives && (
          <p className="bg-warning/15 rounded-md p-2 text-xs">{t.proposal.combinationsHint}</p>
        )}
      </CardContent>
    </Card>
  );
}

/** Barre collée en bas de l'écran sur mobile : la synthèse reste visible pendant la saisie. */
export function MobileSummaryBar({
  summary,
  currency,
}: {
  summary: Pick<ScenarioSummaryView, "annual" | "oneShot" | "firstYear">;
  currency: string;
}) {
  return (
    <div className="bg-card/95 fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
      <KeyAmounts summary={summary} currency={currency} compact />
    </div>
  );
}
