import "server-only";
import {
  calculateProposalSummary,
  combinationLabelParts,
  type ProductSummary,
  type ProposalSummary,
  type ScenarioResult,
} from "@/domain/pricing";
import type { LineView, ScenarioView, ServiceLineView } from "@/components/proposals/types";
import type { ProposalTree } from "./data/proposals";
import { toProposalInput } from "./mappers/pricing";

/** Montant principal à afficher dans les listes : total si non ambigu, sinon fourchette. */
export interface ProposalHeadline {
  kind: "EMPTY" | "SINGLE" | "RANGE";
  firstYear?: string;
  min?: string;
  max?: string;
}

export function proposalHeadline(
  p: Pick<ProposalTree, "id" | "contractDuration" | "products">,
): ProposalHeadline {
  return headlineOf(calculateProposalSummary(toProposalInput(p)));
}

export function headlineOf(summary: ProposalSummary): ProposalHeadline {
  const total = summary.total;
  switch (total.kind) {
    case "EMPTY":
      return { kind: "EMPTY" };
    case "SINGLE":
      return { kind: "SINGLE", firstYear: total.totals.firstYearTotal.toFixed(2) };
    case "RANGE":
      return {
        kind: "RANGE",
        min: total.range.min.firstYearTotal.toFixed(2),
        max: total.range.max.firstYearTotal.toFixed(2),
      };
  }
}

// -----------------------------------------------------------------------------
// Modèles d'affichage de l'éditeur (Decimal → chaînes), calculés côté serveur.
// -----------------------------------------------------------------------------

type TreeScenario = ProposalTree["products"][number]["scenarios"][number];

interface RawLine {
  id: string;
  listPrice: { toFixed(n: number): string };
  discount: { toFixed(n: number): string; toString(): string };
  customerPrice: { toFixed(n: number): string };
  displayDiscount: boolean;
}

function lineView(
  row: RawLine,
  code: string | null,
  description: string,
  fromCatalog: boolean,
): LineView {
  return {
    id: row.id,
    code,
    description,
    listPrice: row.listPrice.toFixed(2),
    discount: row.discount.toString(),
    customerPrice: row.customerPrice.toFixed(2),
    displayDiscount: row.displayDiscount,
    fromCatalog,
  };
}

export function buildScenarioView(scenario: TreeScenario, result: ScenarioResult): ScenarioView {
  const s = result.summary;
  const services: ServiceLineView[] = scenario.services.map((l) => ({
    ...lineView(l, l.codeSnapshot, l.descriptionSnapshot, l.serviceId !== null),
    options: l.options.map((o) => lineView(o, null, o.description, false)),
  }));
  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    subscriptions: scenario.subscriptions.map((l) =>
      lineView(l, l.codeSnapshot, l.descriptionSnapshot, l.subscriptionId !== null),
    ),
    services,
    maintenances: scenario.maintenances.map((l) =>
      lineView(l, l.codeSnapshot, l.descriptionSnapshot, l.maintenanceId !== null),
    ),
    additionalOptions: scenario.additionalOptions.map((o) =>
      lineView(o, null, o.description, false),
    ),
    summary: {
      annual: s.annualRecurringTotal.toFixed(2),
      oneShot: s.oneShotTotal.toFixed(2),
      firstYear: s.firstYearTotal.toFixed(2),
      yearN: s.yearNTotal.toFixed(2),
      subscription: s.subscriptionTotal.toFixed(2),
      service: s.serviceTotal.toFixed(2),
      serviceOption: s.serviceOptionTotal.toFixed(2),
      serviceWithOptions: s.serviceTotal.plus(s.serviceOptionTotal).toFixed(2),
      maintenance: s.maintenanceTotal.toFixed(2),
      additionalOption: s.additionalOptionTotal.toFixed(2),
      discountTotal: s.discountTotal.toFixed(2),
    },
    combinations: result.combinations.map((c) => ({
      key: c.key,
      label: combinationLabelParts(c).join(" + ") || "—",
      annual: c.annualTotal.toFixed(2),
      oneShot: c.oneShotTotal.toFixed(2),
      firstYear: c.firstYearTotal.toFixed(2),
      selected: result.selectedCombination?.key === c.key,
    })),
    hasAlternatives: result.hasAlternatives,
  };
}

export type { ProductSummary };
