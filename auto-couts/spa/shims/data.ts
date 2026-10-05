/** Remplace src/lib/data.ts : mêmes fonctions, lues depuis le stockage local. */
import type { CostCategory, CostFrequency, CostMethod, Powertrain, VehicleCategory } from "@/lib/domain";
import type { CalcContext, EnergyPrice, ScenarioInput, VehicleInput } from "@/lib/calc/types";
import { getDB, type EnergyRow, type ScenarioRow, type SettingsRow, type VehicleRow } from "../store";

export type VehicleWithLines = VehicleRow;
export type ScenarioFull = ScenarioRow;

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export async function getSettings(): Promise<SettingsRow> {
  return clone(getDB().settings);
}
export const getEnergyTypes = async () => clone([...getDB().energyTypes].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
export const getVehicles = async () =>
  clone(getDB().vehicles).map((v) => ({ ...v, costLines: [...v.costLines].sort((a, b) => a.sortOrder - b.sortOrder) }));
export const getScenarios = async () =>
  clone(getDB().scenarios).map((s) => ({ ...s, vehicles: [...s.vehicles].sort((a, b) => a.sortOrder - b.sortOrder) }));

export function toPriceTable(energies: EnergyRow[]): Record<string, EnergyPrice> {
  return Object.fromEntries(energies.map((e) => [e.code, { code: e.code, label: e.label, unit: e.unit, price: e.price }]));
}

export function toVehicleInput(v: VehicleRow): VehicleInput {
  return {
    ...(v as unknown as VehicleInput),
    category: v.category as VehicleCategory,
    powertrain: v.powertrain as Powertrain,
    costLines: v.costLines.map((l) => ({ id: l.id, label: l.label, category: l.category as CostCategory, frequency: l.frequency as CostFrequency, amount: l.amount, isEstimate: l.isEstimate })),
  };
}

export function toScenarioInput(s: ScenarioRow): ScenarioInput {
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
  settings: SettingsRow;
  energies: EnergyRow[];
  vehicles: VehicleInput[];
  rawVehicles: VehicleRow[];
  scenarios: ScenarioInput[];
  rawScenarios: ScenarioRow[];
  baseCtx: Omit<CalcContext, "scenarioPriceOverrides" | "scenarioAnnualKm">;
  referenceScenarioId: number | null;
}

const METHODS: CostMethod[] = ["ECONOMIC", "CASH"];

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
