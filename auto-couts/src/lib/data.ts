/** Accès aux données (serveur uniquement) + conversion vers les entrées du moteur. */
import "server-only";
import type { CostLine, EnergyType, Scenario, ScenarioPriceOverride, ScenarioVehicle, Settings, Vehicle } from "@prisma/client";
import { prisma } from "./db";
import type { CostCategory, CostFrequency, CostMethod, Powertrain, VehicleCategory } from "./domain";
import type { CalcContext, EnergyPrice, ScenarioInput, VehicleInput } from "./calc/types";

export type VehicleWithLines = Vehicle & { costLines: CostLine[] };
export type ScenarioFull = Scenario & { vehicles: ScenarioVehicle[]; priceOverrides: ScenarioPriceOverride[] };

export async function getSettings(): Promise<Settings> {
  return (await prisma.settings.findUnique({ where: { id: 1 } })) ?? (await prisma.settings.create({ data: { id: 1 } }));
}

export const getEnergyTypes = () => prisma.energyType.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });

export const getVehicles = () =>
  prisma.vehicle.findMany({ include: { costLines: { orderBy: { sortOrder: "asc" } } }, orderBy: { id: "asc" } });

export const getScenarios = () =>
  prisma.scenario.findMany({
    include: { vehicles: { orderBy: { sortOrder: "asc" } }, priceOverrides: true },
    orderBy: { id: "asc" },
  });

export function toPriceTable(energies: EnergyType[]): Record<string, EnergyPrice> {
  return Object.fromEntries(energies.map((e) => [e.code, { code: e.code, label: e.label, unit: e.unit, price: e.price }]));
}

export function toVehicleInput(v: VehicleWithLines): VehicleInput {
  return {
    ...v,
    category: v.category as VehicleCategory,
    powertrain: v.powertrain as Powertrain,
    costLines: v.costLines.map((l) => ({
      id: l.id,
      label: l.label,
      category: l.category as CostCategory,
      frequency: l.frequency as CostFrequency,
      amount: l.amount,
      isEstimate: l.isEstimate,
    })),
  };
}

export function toScenarioInput(s: ScenarioFull): ScenarioInput {
  return {
    id: s.id,
    name: s.name,
    color: s.color,
    vehicleIds: s.vehicles.map((v) => v.vehicleId),
    annualKmOverrides: Object.fromEntries(s.vehicles.map((v) => [v.vehicleId, v.annualKmOverride])),
    priceOverrides: Object.fromEntries(s.priceOverrides.map((p) => [p.energyCode, p.price])),
    needsTwoCarsSimultaneously: s.needsTwoCarsSimultaneously,
    adults: s.adults,
    children: s.children,
  };
}

export interface AppData {
  settings: Settings;
  energies: EnergyType[];
  vehicles: VehicleInput[];
  rawVehicles: VehicleWithLines[];
  scenarios: ScenarioInput[];
  rawScenarios: ScenarioFull[];
  baseCtx: Omit<CalcContext, "scenarioPriceOverrides" | "scenarioAnnualKm">;
  referenceScenarioId: number | null;
}

const METHODS: CostMethod[] = ["ECONOMIC", "CASH"];

/** Charge tout ce qu'il faut pour calculer ; méthode/horizon surchargeables (URL). */
export async function loadAppData(opts: { method?: string; horizon?: string | number } = {}): Promise<AppData> {
  const [settings, energies, rawVehicles, rawScenarios] = await Promise.all([getSettings(), getEnergyTypes(), getVehicles(), getScenarios()]);
  const method = METHODS.includes(opts.method as CostMethod) ? (opts.method as CostMethod) : (settings.costMethod as CostMethod);
  const h = Number(opts.horizon);
  const horizonYears = Number.isFinite(h) && h > 0 && h <= 30 ? h : settings.defaultHorizonYears;
  const ref = rawScenarios.find((s) => s.id === settings.referenceScenarioId) ?? rawScenarios[0];
  return {
    settings,
    energies,
    rawVehicles,
    vehicles: rawVehicles.map(toVehicleInput),
    rawScenarios,
    scenarios: rawScenarios.map(toScenarioInput),
    baseCtx: { prices: toPriceTable(energies), method, horizonYears, defaultBenefitTaxRate: settings.defaultBenefitTaxRate },
    referenceScenarioId: ref?.id ?? null,
  };
}
