/**
 * Synthèse d'une proposition.
 *
 * Règle fondamentale : les scénarios d'un produit (et les combinaisons d'un scénario)
 * sont des ALTERNATIVES. On ne les additionne jamais.
 * Les PRODUITS, eux, sont cumulatifs : un total n'est donné sans ambiguïté que si chaque
 * produit n'a qu'une seule alternative. Sinon on donne une fourchette
 * (somme des minima — somme des maxima).
 */
import { ZERO, roundMoney, type Decimal } from "./decimal";
import { calculateProductSummary } from "./product";
import { calculateContractTotal } from "./scenario";
import type { ProposalInput, ProposalSummary, ProposalTotal, Range, Totals } from "./types";
import type { GenerateCombinationsOptions } from "./combinations";

function addTotals(a: Totals, b: Totals): Totals {
  return {
    annualTotal: roundMoney(a.annualTotal.plus(b.annualTotal)),
    oneShotTotal: roundMoney(a.oneShotTotal.plus(b.oneShotTotal)),
    firstYearTotal: roundMoney(a.firstYearTotal.plus(b.firstYearTotal)),
  };
}

const EMPTY_TOTALS: Totals = { annualTotal: ZERO, oneShotTotal: ZERO, firstYearTotal: ZERO };

function contractTotal(t: Totals, months: number | null | undefined): Decimal | null {
  return months ? calculateContractTotal(t.annualTotal, t.oneShotTotal, months) : null;
}

/**
 * Fourchette sur la durée du contrat. Calculée alternative par alternative :
 * l'alternative la moins chère en année 1 n'est pas forcément la moins chère sur 3 ans.
 */
function contractRange(
  products: ProposalSummary["products"],
  months: number | null | undefined,
): { min: Decimal; max: Decimal } | null {
  if (!months) return null;
  let min = ZERO;
  let max = ZERO;
  for (const product of products) {
    const values = product.alternatives.map((a) => contractTotal(a, months) ?? ZERO);
    if (values.length === 0) continue;
    min = min.plus(values.reduce((a, b) => (b.lessThan(a) ? b : a)));
    max = max.plus(values.reduce((a, b) => (b.greaterThan(a) ? b : a)));
  }
  return { min: roundMoney(min), max: roundMoney(max) };
}

export function calculateProposalSummary(
  proposal: ProposalInput,
  options?: GenerateCombinationsOptions,
): ProposalSummary {
  const products = proposal.products.map((p) => calculateProductSummary(p, options));
  const scenarioCount = products.reduce((n, p) => n + p.scenarios.length, 0);
  const ranges = products.map((p) => p.range).filter((r): r is Range => r !== null);

  let total: ProposalTotal;
  if (ranges.length === 0) {
    total = { kind: "EMPTY" };
  } else {
    const isSingle = products.every((p) => p.alternatives.length <= 1);
    const min = ranges.reduce((acc, r) => addTotals(acc, r.min), EMPTY_TOTALS);
    const max = ranges.reduce((acc, r) => addTotals(acc, r.max), EMPTY_TOTALS);
    const months = proposal.contractDurationMonths;
    if (isSingle) {
      total = { kind: "SINGLE", totals: min, contractTotal: contractTotal(min, months) };
    } else {
      total = {
        kind: "RANGE",
        range: { min, max },
        contractRange: contractRange(products, months),
      };
    }
  }

  return {
    proposalId: proposal.id,
    productCount: products.length,
    scenarioCount,
    products,
    total,
  };
}
