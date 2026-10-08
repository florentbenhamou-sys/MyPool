/** Modèles d'affichage (sérialisables) de l'éditeur de proposition. Montants en chaînes. */

export type CatalogKind = "subscription" | "service" | "maintenance";
export type OptionKind = "serviceOption" | "additionalOption";

export interface LineView {
  id: string;
  code: string | null;
  description: string;
  listPrice: string;
  discount: string;
  customerPrice: string;
  displayDiscount: boolean;
  /** Ligne issue du catalogue : code et prix catalogue figés. */
  fromCatalog: boolean;
}

export interface ServiceLineView extends LineView {
  options: LineView[];
}

export interface ScenarioSummaryView {
  annual: string;
  oneShot: string;
  firstYear: string;
  yearN: string;
  subscription: string;
  service: string;
  serviceOption: string;
  /** Services + leurs options */
  serviceWithOptions: string;
  maintenance: string;
  additionalOption: string;
  discountTotal: string;
}

export interface CombinationView {
  key: string;
  label: string;
  annual: string;
  oneShot: string;
  firstYear: string;
  selected: boolean;
}

export interface ScenarioView {
  id: string;
  name: string;
  description: string | null;
  subscriptions: LineView[];
  services: ServiceLineView[];
  maintenances: LineView[];
  additionalOptions: LineView[];
  summary: ScenarioSummaryView;
  combinations: CombinationView[];
  hasAlternatives: boolean;
}

export interface CatalogOption {
  id: string;
  code: string;
  description: string;
  listPrice: string;
  currency: string;
}

export type CatalogOptions = Record<CatalogKind, CatalogOption[]>;
