import type {
  CostCategory,
  CostFrequency,
  CostGroup,
  CostMethod,
  CostNature,
  Powertrain,
  VehicleCategory,
} from "../domain";

/* ------------------------------------------------------------------ */
/* Entrées (indépendantes de Prisma)                                   */
/* ------------------------------------------------------------------ */

export interface CostLineInput {
  id?: number;
  label: string;
  category: CostCategory;
  frequency: CostFrequency;
  amount: number;
  isEstimate?: boolean;
}

export interface VehicleInput {
  id: number;
  name: string;
  category: VehicleCategory;
  powertrain: Powertrain;

  fuelEnergyCode?: string | null;
  fuelConsumption?: number | null;
  fuelConsumptionReal?: number | null;
  fuelPriceOverride?: number | null;

  elecConsumption?: number | null;
  elecConsumptionReal?: number | null;
  elecPriceOverride?: number | null;
  electricKmShare?: number | null;

  annualKm: number;

  companyMonthlyFee?: number | null;
  employeeExtraContribution?: number | null;
  employerMonthlyCost?: number | null;
  benefitInKindMonthly?: number | null;
  benefitTaxRate?: number | null;
  taxCostMonthlyOverride?: number | null;
  employerEnergySharePct?: number | null;

  purchasePrice?: number | null;
  downPayment?: number | null;
  financedAmount?: number | null;
  loanMonths?: number | null;
  loanRatePct?: number | null;
  monthlyPayment?: number | null;
  residualValue?: number | null;
  holdingYears?: number | null;

  costLines: CostLineInput[];
}

export interface EnergyPrice {
  code: string;
  label: string;
  unit: string;
  price: number;
}

/** Ajustements "Et si…" : appliqués à la volée, jamais enregistrés sur les données. */
export interface Adjustments {
  /** Prix d'énergie imposés (prioritaires sur tout le reste). */
  energyPrices?: Record<string, number>;
  /** Kilométrage annuel imposé par véhicule (id → km). */
  annualKmByVehicle?: Record<number, number>;
  /** Variation globale du kilométrage, en % (ex : 20 → +20 %). */
  kmChangePct?: number;
  /** Variation de la redevance mensuelle de chaque voiture de fonction (€). */
  companyFeeDelta?: number;
  /** Durée de détention imposée pour les véhicules achetés (années). */
  holdingYears?: number;
  /** Taux appliqué à l'avantage en nature (%). */
  benefitTaxRate?: number;
}

export interface CalcContext {
  prices: Record<string, EnergyPrice>;
  method: CostMethod;
  horizonYears: number;
  /** Taux par défaut appliqué à l'avantage en nature (%). */
  defaultBenefitTaxRate: number;
  scenarioPriceOverrides?: Record<string, number>;
  /** km spécifique au scénario pour ce véhicule */
  scenarioAnnualKm?: Record<number, number | null | undefined>;
  adjustments?: Adjustments;
}

/* ------------------------------------------------------------------ */
/* Résultats                                                           */
/* ------------------------------------------------------------------ */

export type PriceSource = "global" | "véhicule" | "scénario" | "simulation";

export interface ExplainStep {
  label: string;
  value: string;
  /** Formule ou précision (ex : "15 000 km × 6,5 / 100") */
  detail?: string;
}

export interface EnergyPart {
  code: string;
  label: string;
  unit: string;
  km: number;
  /** consommation retenue (unité / 100 km) */
  consumption: number;
  consumptionSource: "réelle" | "constructeur";
  price: number;
  priceSource: PriceSource;
  annualQuantity: number;
  annualCost: number;
  costPerKm: number;
}

export interface EnergyResult {
  parts: EnergyPart[];
  /** Coût énergie total (tous payeurs confondus) */
  annualTotal: number;
  employerSharePct: number;
  employerAnnual: number;
  /** Part réellement supportée par le foyer */
  householdAnnual: number;
  costPerKm: number | null;
}

export interface CostItem {
  key: string;
  label: string;
  group: CostGroup;
  nature: CostNature;
  /** Montant annuel moyen supporté par le foyer sur l'horizon */
  annual: number;
  monthly: number;
  isEstimate: boolean;
  /** Montant indicatif non compté (ex : coût employeur) */
  informative?: boolean;
  explanation: ExplainStep[];
}

export interface FinancingInfo {
  financedAmount: number;
  loanMonths: number;
  ratePct: number | null;
  monthlyPayment: number;
  monthlyPaymentSource: "saisie" | "calculée";
  totalInterest: number | null;
}

export interface OwnershipResult {
  method: CostMethod;
  purchasePrice: number | null;
  residualValue: number | null;
  holdingYears: number;
  depreciationTotal: number | null;
  depreciationAnnual: number | null;
  financing: FinancingInfo | null;
  /** intérêts payés pendant la détention */
  interestDuringHolding: number | null;
  /** Total possession sur l'horizon selon la méthode */
  horizonTotal: number;
  /** Mode trésorerie : apport / prix comptant initial */
  initialOutlay: number;
  /** Mode trésorerie : sorties récurrentes mensuelles (mensualité) */
  recurringMonthly: number;
  /** Mode trésorerie : valeur estimée du véhicule encore détenu en fin d'horizon (non déduite) */
  remainingValueAtHorizon: number | null;
}

export interface VehicleResult {
  vehicleId: number;
  name: string;
  category: VehicleInput["category"];
  powertrain: VehicleInput["powertrain"];
  annualKm: number;
  annualKmSource: "véhicule" | "scénario" | "simulation";
  energy: EnergyResult;
  ownership: OwnershipResult | null;
  items: CostItem[];
  /** Coûts informatifs non comptés (coût employeur, part énergie employeur…) */
  informativeItems: CostItem[];
  totals: Totals;
  /** Total cumulé par année (0..horizon) pour les graphiques */
  cumulativeByYear: number[];
  /** Coût total pour les horizons standard (1,3,5,7,10) + l'horizon choisi */
  horizonTotals: Record<number, number>;
  warnings: string[];
}

export interface Totals {
  monthly: number;
  annual: number;
  horizon: number;
  horizonYears: number;
  perKm: number | null;
  fixedAnnual: number;
  variableAnnual: number;
  energyAnnual: number;
  byGroup: Record<CostGroup, number>;
}

export interface ScenarioInput {
  id: number;
  name: string;
  color?: string;
  vehicleIds: number[];
  annualKmOverrides?: Record<number, number | null | undefined>;
  priceOverrides?: Record<string, number>;
  needsTwoCarsSimultaneously?: boolean;
  adults?: number;
  children?: number;
}

export interface ScenarioResult {
  scenarioId: number;
  name: string;
  color?: string;
  vehicles: VehicleResult[];
  totalKm: number;
  totals: Totals;
  cumulativeByYear: number[];
  horizonTotals: Record<number, number>;
  warnings: string[];
}

export interface ScenarioDiff {
  scenarioId: number;
  name: string;
  /** Économie positive = moins cher que la référence */
  monthlySaving: number;
  annualSaving: number;
  horizonSavings: Record<number, number>;
  /** Variation du coût annuel en % par rapport à la référence (négatif = moins cher) */
  pctChange: number | null;
  summary: string;
}

export interface Comparison {
  baselineId: number;
  results: ScenarioResult[];
  diffs: ScenarioDiff[];
  cheapestId: number | null;
}
