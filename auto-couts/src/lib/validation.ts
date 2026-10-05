/** Schémas de validation (formulaires, server actions, import JSON). */
import { z } from "zod";
import { COST_CATEGORIES, COST_FREQUENCIES, COST_METHODS, POWERTRAINS, VEHICLE_CATEGORIES } from "./domain";

const optNum = (schema: z.ZodNumber) => schema.nullable().optional();
const nonNeg = (label: string) => z.number({ error: `${label} : nombre attendu` }).min(0, `${label} doit être ≥ 0`);
const pos = (label: string) => z.number({ error: `${label} : nombre attendu` }).gt(0, `${label} doit être > 0`);
const pct = (label: string) => nonNeg(label).max(100, `${label} doit être ≤ 100 %`);

export const costLineSchema = z.object({
  id: z.number().int().optional(),
  label: z.string().trim().max(100).default(""),
  category: z.enum(COST_CATEGORIES),
  frequency: z.enum(COST_FREQUENCIES),
  amount: nonNeg("Montant"),
  isEstimate: z.boolean().default(false),
});

export const vehicleSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom est obligatoire").max(100),
    brand: z.string().trim().max(60).default(""),
    model: z.string().trim().max(60).default(""),
    version: z.string().trim().max(100).default(""),
    year: optNum(z.number().int().min(1950, "Année invalide").max(2100, "Année invalide")),
    plate: z.string().trim().max(20).default(""),
    photoUrl: z.string().max(3_000_000, "Photo trop volumineuse").default(""),
    notes: z.string().max(2000).default(""),
    category: z.enum(VEHICLE_CATEGORIES),
    powertrain: z.enum(POWERTRAINS),

    fuelEnergyCode: z.string().nullable().optional(),
    fuelConsumption: optNum(pos("Consommation carburant")),
    fuelConsumptionReal: optNum(pos("Consommation réelle")),
    fuelPriceOverride: optNum(nonNeg("Prix carburant")),
    elecConsumption: optNum(pos("Consommation électrique")),
    elecConsumptionReal: optNum(pos("Consommation électrique réelle")),
    elecPriceOverride: optNum(nonNeg("Prix électricité")),
    electricKmShare: optNum(pct("Part de km électriques")),

    currentMileage: optNum(nonNeg("Kilométrage actuel").int()),
    annualKm: nonNeg("Kilométrage annuel").int("Kilométrage annuel : nombre entier"),
    proKm: optNum(nonNeg("Km professionnels").int()),
    persoKm: optNum(nonNeg("Km personnels").int()),

    companyMonthlyFee: optNum(nonNeg("Redevance")),
    employeeExtraContribution: optNum(nonNeg("Participation")),
    employerMonthlyCost: optNum(nonNeg("Coût employeur")),
    benefitInKindMonthly: optNum(nonNeg("Avantage en nature")),
    benefitTaxRate: optNum(pct("Taux AEN")),
    taxCostMonthlyOverride: optNum(nonNeg("Surcoût fiscal")),
    employerEnergySharePct: optNum(pct("Part énergie employeur")),

    purchasePrice: optNum(nonNeg("Prix d'achat")),
    mileageAtPurchase: optNum(nonNeg("Kilométrage à l'achat").int()),
    downPayment: optNum(nonNeg("Apport")),
    financedAmount: optNum(nonNeg("Montant financé")),
    loanMonths: optNum(pos("Durée du crédit").int("Durée du crédit : nombre de mois entier")),
    loanRatePct: optNum(nonNeg("Taux").max(30, "Taux ≤ 30 %")),
    monthlyPayment: optNum(nonNeg("Mensualité")),
    residualValue: optNum(nonNeg("Valeur de revente")),
    holdingYears: optNum(pos("Durée de détention").max(30, "Durée ≤ 30 ans")),

    costLines: z.array(costLineSchema).default([]),
  })
  .superRefine((v, ctx) => {
    const needsFuel = v.powertrain !== "ELECTRIC";
    const needsElec = v.powertrain === "ELECTRIC" || v.powertrain === "PHEV";
    if (needsFuel && !v.fuelEnergyCode) ctx.addIssue({ code: "custom", path: ["fuelEnergyCode"], message: "Choisissez le type d'énergie" });
    if (needsFuel && v.fuelConsumption == null && v.fuelConsumptionReal == null)
      ctx.addIssue({ code: "custom", path: ["fuelConsumption"], message: "Consommation obligatoire (constructeur ou réelle)" });
    if (needsElec && v.elecConsumption == null && v.elecConsumptionReal == null)
      ctx.addIssue({ code: "custom", path: ["elecConsumption"], message: "Consommation électrique obligatoire" });
    if (v.powertrain === "PHEV" && v.electricKmShare == null)
      ctx.addIssue({ code: "custom", path: ["electricKmShare"], message: "Indiquez la part de km en électrique" });
    if (v.purchasePrice != null && v.downPayment != null && v.downPayment > v.purchasePrice)
      ctx.addIssue({ code: "custom", path: ["downPayment"], message: "L'apport dépasse le prix d'achat" });
    if (v.proKm != null && v.persoKm != null && v.proKm + v.persoKm > v.annualKm * 1.001 && v.annualKm > 0)
      ctx.addIssue({ code: "custom", path: ["persoKm"], message: "Km pro + perso supérieurs au kilométrage annuel" });
  });

export type VehicleFormData = z.input<typeof vehicleSchema>;
export type VehicleData = z.output<typeof vehicleSchema>;

export const scenarioSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire").max(100),
  description: z.string().max(1000).default(""),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide").default("#2a78d6"),
  adults: nonNeg("Adultes").int().max(20),
  children: nonNeg("Enfants").int().max(20),
  needsTwoCarsSimultaneously: z.boolean().default(false),
  vehicles: z
    .array(z.object({ vehicleId: z.number().int(), annualKmOverride: optNum(nonNeg("Km du scénario").int()) }))
    .default([]),
  priceOverrides: z.array(z.object({ energyCode: z.string().min(1), price: nonNeg("Prix") })).default([]),
});
export type ScenarioData = z.output<typeof scenarioSchema>;

export const energyTypeSchema = z.object({
  id: z.number().int().optional(),
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_]{2,20}$/, "Code : majuscules, chiffres ou _ (2–20 caractères)"),
  label: z.string().trim().min(1, "Libellé obligatoire").max(40),
  unit: z.string().trim().min(1, "Unité obligatoire").max(10),
  price: nonNeg("Prix"),
  isElectric: z.boolean().default(false),
});

export const settingsSchema = z.object({
  defaultBenefitTaxRate: pct("Taux AEN"),
  defaultHorizonYears: pos("Horizon").int().max(30),
  costMethod: z.enum(COST_METHODS),
  referenceScenarioId: z.number().int().nullable(),
});

export const adjustmentsSchema = z.object({
  energyPrices: z.record(z.string(), nonNeg("Prix")).optional(),
  annualKmByVehicle: z.record(z.string(), nonNeg("Km")).optional(),
  kmChangePct: z.number().min(-100).max(500).optional(),
  companyFeeDelta: z.number().optional(),
  holdingYears: pos("Détention").optional(),
  benefitTaxRate: pct("Taux AEN").optional(),
});

/** Transforme les erreurs zod en { chemin: message } pour l'affichage dans les formulaires. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
