"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";
import { selectCombinationAction } from "@/server/actions/proposals";
import type { CombinationView } from "./types";

function RetainButton({
  scenarioId,
  combination,
  locked,
}: {
  scenarioId: string;
  combination: CombinationView;
  locked: boolean;
}) {
  const [pending, start] = useTransition();
  if (locked)
    return combination.selected ? <Badge variant="success">{t.proposal.retained}</Badge> : null;
  return (
    <Button
      size="sm"
      variant={combination.selected ? "default" : "outline"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await selectCombinationAction(
            scenarioId,
            combination.selected ? null : combination.key,
          );
          if (!r.ok) toast.error(r.error);
        })
      }
    >
      {combination.selected && <Check />}
      {combination.selected ? t.proposal.retained : t.proposal.retain}
    </Button>
  );
}

/**
 * Combinaisons calculées (souscription × package de services). Chaque ligne est une
 * ALTERNATIVE. Tableau sur desktop, cartes sur mobile.
 */
export function CombinationsTable({
  scenarioId,
  combinations,
  currency,
  locked,
}: {
  scenarioId: string;
  combinations: CombinationView[];
  currency: string;
  locked: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.pricing.combinations}</CardTitle>
          <CardDescription>{t.proposal.alternativesWarning}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {combinations.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.pricing.noCombination}</p>
        ) : (
          <>
            <table className="hidden w-full text-sm md:table">
              <thead className="text-muted-foreground border-b text-xs tracking-wide uppercase">
                <tr className="[&_th]:h-9 [&_th]:px-2 [&_th]:font-medium">
                  <th className="text-left">{t.pricing.combination}</th>
                  <th className="text-right">{t.pricing.annual}</th>
                  <th className="text-right">{t.pricing.oneShot}</th>
                  <th className="text-right">{t.pricing.firstYear}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {combinations.map((c) => (
                  <tr
                    key={c.key}
                    className={`border-b last:border-0 [&_td]:px-2 [&_td]:py-2 ${c.selected ? "bg-primary/5" : ""}`}
                  >
                    <td>{c.label}</td>
                    <td className="money text-right">{formatMoney(c.annual, currency)}</td>
                    <td className="money text-right">{formatMoney(c.oneShot, currency)}</td>
                    <td className="money text-right font-semibold">
                      {formatMoney(c.firstYear, currency)}
                    </td>
                    <td className="text-right">
                      <RetainButton scenarioId={scenarioId} combination={c} locked={locked} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="flex flex-col gap-2 md:hidden">
              {combinations.map((c) => (
                <li
                  key={c.key}
                  className={`rounded-lg border p-3 ${c.selected ? "border-primary bg-primary/5" : ""}`}
                >
                  <p className="text-sm font-medium break-words">{c.label}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">{t.pricing.annual}</dt>
                      <dd className="money font-medium">{formatMoney(c.annual, currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t.pricing.oneShot}</dt>
                      <dd className="money font-medium">{formatMoney(c.oneShot, currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t.pricing.firstYear}</dt>
                      <dd className="money text-primary font-semibold">
                        {formatMoney(c.firstYear, currency)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-2">
                    <RetainButton scenarioId={scenarioId} combination={c} locked={locked} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
