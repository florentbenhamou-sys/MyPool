/**
 * Types d'entrée / sortie du moteur de calcul.
 * Indépendants de Prisma et de React : ils peuvent être construits depuis la base,
 * depuis un import Excel, depuis un test unitaire, etc.
 */
import type { Decimal } from "./decimal";

/** Une ligne valorisée (souscription, service, option, maintenance...). */
export interface PricedLine {
  id: string;
  code?: string | null;
  label: string;
  listPrice: Decimal;
  /** Remise en pourcentage (0..100). */
  discount: Decimal;
  /** Prix client stocké (état commercial historique). Fait foi pour les totaux. */
  customerPrice: Decimal;
  displayDiscount?: boolean;
}

export interface ServiceLine extends PricedLine {
  options: PricedLine[];
}

export interface ScenarioInput {
  id: string;
  name: string;
  /** ANNUEL */
  subscriptions: PricedLine[];
  /** ONE SHOT (+ leurs options ONE SHOT) */
  services: ServiceLine[];
  /** ONE SHOT */
  maintenances: PricedLine[];
  /** ONE SHOT — options libres */
  additionalOptions: PricedLine[];
  /** Combinaison retenue, si l'utilisateur en a sélectionné une. */
  selectedCombinationKey?: string | null;
}

export interface ProductInput {
  id: string;
  name: string;
  scenarios: ScenarioInput[];
}

export interface ProposalInput {
  id: string;
  /** Durée du contrat en mois (optionnelle). */
  contractDurationMonths?: number | null;
  products: ProductInput[];
}

/** Trois montants qui reviennent partout. */
export interface Totals {
  annualTotal: Decimal;
  oneShotTotal: Decimal;
  /** = annualTotal + oneShotTotal */
  firstYearTotal: Decimal;
}

export interface ScenarioSummary {
  scenarioId: string;
  /** Somme des souscriptions (ANNUEL) */
  annualRecurringTotal: Decimal;
  /** Services + options de services + maintenances + options additionnelles */
  oneShotTotal: Decimal;
  /** Année 1 = annuel + one shot */
  firstYearTotal: Decimal;
  /** Année N (N > 1) = annuel */
  yearNTotal: Decimal;
  subscriptionTotal: Decimal;
  serviceTotal: Decimal;
  serviceOptionTotal: Decimal;
  maintenanceTotal: Decimal;
  additionalOptionTotal: Decimal;
  /** Remise totale (prix catalogue − prix client), toutes lignes confondues */
  discountTotal: Decimal;
}

/** Un « package de services » : un service et ses options. */
export interface ServicePackage {
  service: ServiceLine;
  options: PricedLine[];
}

export interface CombinationSummary extends Totals {
  /** Clé stable (dépend des ids), utilisable pour « retenir » une combinaison. */
  key: string;
  subscription: PricedLine | null;
  services: ServiceLine[];
  serviceOptions: PricedLine[];
  maintenance: PricedLine[];
  additionalOptions: PricedLine[];
}

/**
 * Une valeur possible pour un produit : un scénario, éventuellement précisé
 * par une combinaison. Les alternatives ne s'additionnent JAMAIS entre elles.
 */
export interface Alternative extends Totals {
  scenarioId: string;
  combinationKey: string | null;
}

export interface ScenarioResult {
  scenarioId: string;
  name: string;
  summary: ScenarioSummary;
  combinations: CombinationSummary[];
  /** true si le scénario contient plusieurs combinaisons possibles (alternatives internes). */
  hasAlternatives: boolean;
  /** Combinaison retenue, si sélectionnée et toujours existante. */
  selectedCombination: CombinationSummary | null;
}

export interface Range {
  min: Totals;
  max: Totals;
}

export interface ProductSummary {
  productId: string;
  name: string;
  scenarios: ScenarioResult[];
  alternatives: Alternative[];
  /** Fourchette sur les alternatives (classées par total année 1). null si aucune. */
  range: Range | null;
}

export type ProposalTotal =
  | { kind: "EMPTY" }
  /** Une seule alternative par produit : le total est sans ambiguïté. */
  | { kind: "SINGLE"; totals: Totals; contractTotal: Decimal | null }
  /** Au moins un produit a plusieurs alternatives : on ne peut donner qu'une fourchette. */
  | { kind: "RANGE"; range: Range; contractRange: { min: Decimal; max: Decimal } | null };

export interface ProposalSummary {
  proposalId: string;
  productCount: number;
  scenarioCount: number;
  products: ProductSummary[];
  total: ProposalTotal;
}
