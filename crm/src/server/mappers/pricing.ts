import "server-only";
import type { Prisma } from "@prisma/client";
import {
  toDecimal,
  type PricedLine,
  type ProductInput,
  type ProposalInput,
} from "@/domain/pricing";
import type { ProposalTree } from "../data/proposals";

/** Conversion Prisma → modèle du moteur de calcul (aucune logique métier ici). */

interface LineRow {
  id: string;
  listPrice: Prisma.Decimal;
  discount: Prisma.Decimal;
  customerPrice: Prisma.Decimal;
  displayDiscount: boolean;
}

function toLine(row: LineRow, code: string | null, label: string): PricedLine {
  return {
    id: row.id,
    code,
    label,
    listPrice: toDecimal(row.listPrice),
    discount: toDecimal(row.discount),
    customerPrice: toDecimal(row.customerPrice),
    displayDiscount: row.displayDiscount,
  };
}

export function toProductInput(pp: ProposalTree["products"][number]): ProductInput {
  return {
    id: pp.id,
    name: pp.displayNameSnapshot,
    scenarios: pp.scenarios.map((s) => ({
      id: s.id,
      name: s.name,
      selectedCombinationKey: s.selectedCombinationKey,
      subscriptions: s.subscriptions.map((l) => toLine(l, l.codeSnapshot, l.descriptionSnapshot)),
      services: s.services.map((l) => ({
        ...toLine(l, l.codeSnapshot, l.descriptionSnapshot),
        options: l.options.map((o) => toLine(o, null, o.description)),
      })),
      maintenances: s.maintenances.map((l) => toLine(l, l.codeSnapshot, l.descriptionSnapshot)),
      additionalOptions: s.additionalOptions.map((o) => toLine(o, null, o.description)),
    })),
  };
}

export function toProposalInput(
  p: Pick<ProposalTree, "id" | "contractDuration" | "products">,
): ProposalInput {
  return {
    id: p.id,
    contractDurationMonths: p.contractDuration,
    products: p.products.map(toProductInput),
  };
}
