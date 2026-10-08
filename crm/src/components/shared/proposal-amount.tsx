import { formatMoney } from "@/lib/format";
import type { ProposalHeadline } from "@/server/proposal-view";

/** Montant année 1 d'une proposition — fourchette si les alternatives divergent. */
export function ProposalAmount({
  headline,
  currency,
}: {
  headline: ProposalHeadline;
  currency: string;
}) {
  if (headline.kind === "EMPTY") return <span className="text-muted-foreground">—</span>;
  if (headline.kind === "SINGLE")
    return <span className="money">{formatMoney(headline.firstYear!, currency)}</span>;
  return (
    <span className="money" title="Fourchette selon les scénarios / combinaisons">
      {formatMoney(headline.min!, currency)} – {formatMoney(headline.max!, currency)}
    </span>
  );
}
