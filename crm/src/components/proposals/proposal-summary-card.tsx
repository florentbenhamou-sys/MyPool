import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeRange, type ProposalSummary, type Totals } from "@/domain/pricing";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";

function Amount({
  value,
  currency,
  strong,
}: {
  value: { toFixed(n: number): string };
  currency: string;
  strong?: boolean;
}) {
  return (
    <span className={`money ${strong ? "font-semibold" : ""}`}>
      {formatMoney(value.toFixed(2), currency)}
    </span>
  );
}

function TotalsLine({ totals, currency }: { totals: Totals; currency: string }) {
  return (
    <dl className="grid grid-cols-3 gap-3">
      {[
        [t.pricing.annual, totals.annualTotal],
        [t.pricing.oneShot, totals.oneShotTotal],
        [t.pricing.firstYear, totals.firstYearTotal],
      ].map(([label, value]) => (
        <div key={String(label)} className="min-w-0">
          <dt className="text-muted-foreground text-xs uppercase">{String(label)}</dt>
          <dd className="truncate text-base font-semibold md:text-lg">
            <Amount value={value as Totals["annualTotal"]} currency={currency} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Synthèse de la proposition. Les scénarios (et combinaisons) sont présentés comme des
 * ALTERNATIVES ; le total n'est donné qu'en l'absence d'ambiguïté, sinon une fourchette.
 */
export function ProposalSummaryCard({
  summary,
  currency,
}: {
  summary: ProposalSummary;
  currency: string;
}) {
  const total = summary.total;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t.proposal.proposalSummary}</CardTitle>
          <CardDescription>
            {summary.productCount}{" "}
            {(summary.productCount > 1 ? t.proposal.products : t.proposal.product).toLowerCase()} ·{" "}
            {summary.scenarioCount}{" "}
            {(summary.scenarioCount > 1 ? t.proposal.scenarios : t.proposal.scenario).toLowerCase()}{" "}
            — {t.proposal.alternativesWarning}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary.products.map((product) => (
          <div key={product.productId} className="rounded-md border">
            <p className="bg-muted/40 border-b px-3 py-2 text-sm font-semibold">{product.name}</p>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs">
                <tr className="[&_th]:px-3 [&_th]:py-1.5 [&_th]:font-medium">
                  <th className="text-left">{t.proposal.scenario}</th>
                  <th className="hidden text-right sm:table-cell">{t.pricing.annual}</th>
                  <th className="hidden text-right sm:table-cell">{t.pricing.oneShot}</th>
                  <th className="text-right">{t.pricing.firstYear}</th>
                </tr>
              </thead>
              <tbody>
                {product.scenarios.map((s) => {
                  const chosen = s.selectedCombination;
                  // Scénario à plusieurs combinaisons non tranché : on affiche la fourchette, pas la somme des lignes.
                  const range = !chosen && s.hasAlternatives ? computeRange(s.combinations) : null;
                  const single = chosen ?? {
                    annualTotal: s.summary.annualRecurringTotal,
                    oneShotTotal: s.summary.oneShotTotal,
                    firstYearTotal: s.summary.firstYearTotal,
                  };
                  const cell = (key: keyof Totals, strong?: boolean) =>
                    range ? (
                      <>
                        <Amount value={range.min[key]} currency={currency} strong={strong} />
                        <span className="text-muted-foreground block text-xs">
                          → <Amount value={range.max[key]} currency={currency} />
                        </span>
                      </>
                    ) : (
                      <Amount value={single[key]} currency={currency} strong={strong} />
                    );
                  return (
                    <tr key={s.scenarioId} className="border-t align-top [&_td]:px-3 [&_td]:py-2">
                      <td>
                        <span className="font-medium">{s.name}</span>
                        {chosen && (
                          <Badge variant="success" className="ml-2">
                            {t.proposal.retained}
                          </Badge>
                        )}
                        {range && (
                          <span className="text-muted-foreground block text-xs">
                            {s.combinations.length} {t.pricing.combinations.toLowerCase()}
                          </span>
                        )}
                      </td>
                      <td className="hidden text-right sm:table-cell">{cell("annualTotal")}</td>
                      <td className="hidden text-right sm:table-cell">{cell("oneShotTotal")}</td>
                      <td className="text-right">{cell("firstYearTotal", true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {total.kind === "SINGLE" && (
          <div className="bg-primary/5 rounded-md p-3">
            <p className="mb-2 text-sm font-medium">{t.proposal.singleTotal}</p>
            <TotalsLine totals={total.totals} currency={currency} />
            {total.contractTotal && (
              <p className="text-muted-foreground mt-2 text-sm">
                {t.proposal.contractTotal} :{" "}
                <Amount value={total.contractTotal} currency={currency} strong />
              </p>
            )}
          </div>
        )}
        {total.kind === "RANGE" && (
          <div className="bg-warning/10 rounded-md p-3">
            <p className="mb-2 text-sm font-medium">{t.proposal.rangeLabel}</p>
            <p className="text-sm">
              {t.pricing.firstYear} :{" "}
              <Amount value={total.range.min.firstYearTotal} currency={currency} strong /> –{" "}
              <Amount value={total.range.max.firstYearTotal} currency={currency} strong />
            </p>
            <p className="text-muted-foreground text-sm">
              {t.pricing.annual} :{" "}
              <Amount value={total.range.min.annualTotal} currency={currency} /> –{" "}
              <Amount value={total.range.max.annualTotal} currency={currency} />
            </p>
            {total.contractRange && (
              <p className="text-muted-foreground text-sm">
                {t.proposal.contractTotal} :{" "}
                <Amount value={total.contractRange.min} currency={currency} /> –{" "}
                <Amount value={total.contractRange.max} currency={currency} />
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
