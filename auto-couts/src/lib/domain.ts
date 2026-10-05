/**
 * Référentiels métier (valeurs autorisées + libellés).
 * SQLite ne gérant pas les enums Prisma, c'est ici la source de vérité.
 */

export const VEHICLE_CATEGORIES = ["COMPANY", "NEW", "USED"] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];
export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  COMPANY: "Voiture de fonction",
  NEW: "Voiture neuve",
  USED: "Voiture d'occasion",
};

export const POWERTRAINS = ["GASOLINE", "DIESEL", "HYBRID", "PHEV", "ELECTRIC", "LPG", "OTHER"] as const;
export type Powertrain = (typeof POWERTRAINS)[number];
export const POWERTRAIN_LABELS: Record<Powertrain, string> = {
  GASOLINE: "Essence",
  DIESEL: "Diesel",
  HYBRID: "Hybride",
  PHEV: "Hybride rechargeable",
  ELECTRIC: "Électrique",
  LPG: "GPL",
  OTHER: "Autre",
};

/** Code de l'énergie électrique (utilisée par ELECTRIC et PHEV). */
export const ELECTRICITY = "ELECTRICITY";

/** Énergie "carburant" proposée par défaut selon la motorisation. */
export const DEFAULT_FUEL_BY_POWERTRAIN: Record<Powertrain, string | null> = {
  GASOLINE: "GASOLINE",
  DIESEL: "DIESEL",
  HYBRID: "GASOLINE",
  PHEV: "GASOLINE",
  ELECTRIC: null,
  LPG: "LPG",
  OTHER: null,
};

/** Quelles consommations sont utilisées selon la motorisation. */
export function powertrainUses(p: Powertrain): { fuel: boolean; electric: boolean } {
  switch (p) {
    case "ELECTRIC":
      return { fuel: false, electric: true };
    case "PHEV":
      return { fuel: true, electric: true };
    default:
      return { fuel: true, electric: false };
  }
}

export const COST_CATEGORIES = [
  "LEASING",
  "INSURANCE",
  "PARKING",
  "OTHER_FIXED",
  "MAINTENANCE",
  "TIRES",
  "REPAIRS",
  "TOLLS",
  "WASHING",
  "OTHER_VARIABLE",
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

export const COST_FREQUENCIES = ["MONTHLY", "ANNUAL", "PER_KM"] as const;
export type CostFrequency = (typeof COST_FREQUENCIES)[number];
export const FREQUENCY_LABELS: Record<CostFrequency, string> = {
  MONTHLY: "€/mois",
  ANNUAL: "€/an",
  PER_KM: "€/km",
};

export type CostNature = "FIXED" | "VARIABLE";

/** Regroupements utilisés pour les graphiques de répartition. */
export const COST_GROUPS = ["FINANCING", "ENERGY", "INSURANCE", "MAINTENANCE", "TIRES", "TAX", "OTHER"] as const;
export type CostGroup = (typeof COST_GROUPS)[number];
export const GROUP_LABELS: Record<CostGroup, string> = {
  FINANCING: "Financement / redevance",
  ENERGY: "Énergie",
  INSURANCE: "Assurance",
  MAINTENANCE: "Entretien / réparations",
  TIRES: "Pneus",
  TAX: "Fiscalité (AEN)",
  OTHER: "Autres",
};

export const COST_CATEGORY_META: Record<
  CostCategory,
  { label: string; nature: CostNature; group: CostGroup; defaultFrequency: CostFrequency }
> = {
  LEASING: { label: "Leasing / LOA / LLD", nature: "FIXED", group: "FINANCING", defaultFrequency: "MONTHLY" },
  INSURANCE: { label: "Assurance", nature: "FIXED", group: "INSURANCE", defaultFrequency: "MONTHLY" },
  PARKING: { label: "Parking", nature: "FIXED", group: "OTHER", defaultFrequency: "MONTHLY" },
  OTHER_FIXED: { label: "Autre coût fixe", nature: "FIXED", group: "OTHER", defaultFrequency: "MONTHLY" },
  MAINTENANCE: { label: "Entretien", nature: "VARIABLE", group: "MAINTENANCE", defaultFrequency: "ANNUAL" },
  TIRES: { label: "Pneus", nature: "VARIABLE", group: "TIRES", defaultFrequency: "ANNUAL" },
  REPAIRS: { label: "Réparations", nature: "VARIABLE", group: "MAINTENANCE", defaultFrequency: "ANNUAL" },
  TOLLS: { label: "Péages", nature: "VARIABLE", group: "OTHER", defaultFrequency: "ANNUAL" },
  WASHING: { label: "Lavage", nature: "VARIABLE", group: "OTHER", defaultFrequency: "ANNUAL" },
  OTHER_VARIABLE: { label: "Autre dépense variable", nature: "VARIABLE", group: "OTHER", defaultFrequency: "ANNUAL" },
};

export const COST_METHODS = ["ECONOMIC", "CASH"] as const;
export type CostMethod = (typeof COST_METHODS)[number];
export const METHOD_LABELS: Record<CostMethod, string> = {
  ECONOMIC: "Coût économique",
  CASH: "Trésorerie",
};
export const METHOD_DESCRIPTIONS: Record<CostMethod, string> = {
  ECONOMIC:
    "Achat : décote (prix − revente) répartie sur la durée de détention + intérêts du crédit. Mensualités non comptées (elles remboursent le prix, déjà compté via la décote).",
  CASH:
    "Achat : sorties d'argent réelles sur l'horizon (apport ou prix comptant, mensualités, solde du crédit) moins les reventes intervenant dans l'horizon.",
};

export const STANDARD_HORIZONS = [1, 3, 5, 7, 10] as const;
