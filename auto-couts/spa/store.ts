/**
 * Stockage local (navigateur) remplaçant SQLite dans la version fichier HTML.
 * Toutes les données tiennent dans un objet JSON sauvegardé dans localStorage.
 */
import { backupSchema, BACKUP_VERSION } from "@/lib/backup";
import { demoData } from "../prisma/demo-data";

const KEY = "auto-couts:data:v1";

export interface CostLineRow { id: number; vehicleId: number; label: string; category: string; frequency: string; amount: number; isEstimate: boolean; sortOrder: number }
export type VehicleRow = Record<string, any> & { id: number; name: string; category: string; powertrain: string; annualKm: number; costLines: CostLineRow[]; createdAt: Date; updatedAt: Date };
export interface ScenarioRow {
  id: number; name: string; description: string; color: string; adults: number; children: number; needsTwoCarsSimultaneously: boolean;
  vehicles: { id: number; scenarioId: number; vehicleId: number; annualKmOverride: number | null; sortOrder: number }[];
  priceOverrides: { id: number; scenarioId: number; energyCode: string; price: number }[];
  createdAt: Date; updatedAt: Date;
}
export interface EnergyRow { id: number; code: string; label: string; unit: string; price: number; isElectric: boolean; sortOrder: number; updatedAt: Date }
export interface SettingsRow { id: number; defaultBenefitTaxRate: number; defaultHorizonYears: number; costMethod: string; referenceScenarioId: number | null }
export interface SimulationRow { id: number; name: string; params: string; createdAt: Date }

export interface DB {
  settings: SettingsRow;
  energyTypes: EnergyRow[];
  vehicles: VehicleRow[];
  scenarios: ScenarioRow[];
  simulations: SimulationRow[];
  seq: number;
}

/** Valeurs par défaut de tous les champs d'un véhicule (miroir du modèle Prisma). */
export const VEHICLE_DEFAULTS: Record<string, unknown> = {
  brand: "", model: "", version: "", year: null, plate: "", photoUrl: "", notes: "",
  fuelEnergyCode: null, fuelConsumption: null, fuelConsumptionReal: null, fuelPriceOverride: null,
  elecConsumption: null, elecConsumptionReal: null, elecPriceOverride: null, electricKmShare: null,
  currentMileage: null, annualKm: 0, proKm: null, persoKm: null,
  companyMonthlyFee: null, employeeExtraContribution: null, employerMonthlyCost: null, benefitInKindMonthly: null,
  benefitTaxRate: null, taxCostMonthlyOverride: null, employerEnergySharePct: null,
  purchasePrice: null, mileageAtPurchase: null, downPayment: null, financedAmount: null, loanMonths: null,
  loanRatePct: null, monthlyPayment: null, residualValue: null, holdingYears: null,
};
const VEHICLE_FIELDS = ["name", "category", "powertrain", ...Object.keys(VEHICLE_DEFAULTS)];

let db: DB;

export function nextId(): number {
  return ++db.seq;
}

/** Construit une base à partir d'une sauvegarde JSON (même format que l'app serveur). */
export function dbFromBackup(raw: unknown): DB {
  const data = backupSchema.parse(raw);
  if (data.version > BACKUP_VERSION) throw new Error(`Version de sauvegarde non supportée (${data.version})`);
  let seq = 0;
  const id = () => ++seq;
  const now = new Date();
  const energyTypes: EnergyRow[] = data.energyTypes.map((e) => ({ ...e, id: id(), updatedAt: now }));
  const vMap = new Map<number, number>();
  const vehicles: VehicleRow[] = data.vehicles.map((v) => {
    const vid = id();
    vMap.set(v.id, vid);
    const row: Record<string, unknown> = { ...VEHICLE_DEFAULTS };
    for (const f of VEHICLE_FIELDS) if ((v as Record<string, unknown>)[f] !== undefined) row[f] = (v as Record<string, unknown>)[f];
    return {
      ...(row as Record<string, any>),
      id: vid, name: v.name, category: v.category, powertrain: v.powertrain, annualKm: v.annualKm,
      costLines: v.costLines.map((l, i) => ({ id: id(), vehicleId: vid, label: l.label, category: l.category, frequency: l.frequency, amount: l.amount, isEstimate: l.isEstimate, sortOrder: i })),
      createdAt: now, updatedAt: now,
    };
  });
  const sMap = new Map<number, number>();
  const scenarios: ScenarioRow[] = data.scenarios.map((s) => {
    const sid = id();
    sMap.set(s.id, sid);
    return {
      id: sid, name: s.name, description: s.description, color: s.color, adults: s.adults, children: s.children,
      needsTwoCarsSimultaneously: s.needsTwoCarsSimultaneously,
      vehicles: s.vehicles.filter((sv) => vMap.has(sv.vehicleId)).map((sv, i) => ({ id: id(), scenarioId: sid, vehicleId: vMap.get(sv.vehicleId)!, annualKmOverride: sv.annualKmOverride ?? null, sortOrder: sv.sortOrder ?? i })),
      priceOverrides: s.priceOverrides.map((p) => ({ id: id(), scenarioId: sid, energyCode: p.energyCode, price: p.price })),
      createdAt: now, updatedAt: now,
    };
  });
  const st = data.settings;
  return {
    settings: {
      id: 1,
      defaultBenefitTaxRate: st?.defaultBenefitTaxRate ?? 41.2,
      defaultHorizonYears: st?.defaultHorizonYears ?? 5,
      costMethod: st?.costMethod === "CASH" ? "CASH" : "ECONOMIC",
      referenceScenarioId: st?.referenceScenarioId != null ? sMap.get(st.referenceScenarioId) ?? null : null,
    },
    energyTypes,
    vehicles,
    scenarios,
    simulations: data.simulations.map((s) => ({ id: id(), name: s.name, params: s.params, createdAt: now })),
    seq,
  };
}

/** Sauvegarde JSON compatible avec l'application serveur (import/export croisés possibles). */
export function exportBackupFromDB(d: DB = db) {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: { defaultBenefitTaxRate: d.settings.defaultBenefitTaxRate, defaultHorizonYears: d.settings.defaultHorizonYears, costMethod: d.settings.costMethod, referenceScenarioId: d.settings.referenceScenarioId },
    energyTypes: d.energyTypes.map(({ code, label, unit, price, isElectric, sortOrder }) => ({ code, label, unit, price, isElectric, sortOrder })),
    vehicles: d.vehicles.map(({ createdAt, updatedAt, costLines, ...v }) => ({
      ...v,
      costLines: costLines.map(({ label, category, frequency, amount, isEstimate }) => ({ label, category, frequency, amount, isEstimate })),
    })),
    scenarios: d.scenarios.map((s) => ({
      id: s.id, name: s.name, description: s.description, color: s.color, adults: s.adults, children: s.children,
      needsTwoCarsSimultaneously: s.needsTwoCarsSimultaneously,
      vehicles: s.vehicles.map(({ vehicleId, annualKmOverride, sortOrder }) => ({ vehicleId, annualKmOverride, sortOrder })),
      priceOverrides: s.priceOverrides.map(({ energyCode, price }) => ({ energyCode, price })),
    })),
    simulations: d.simulations.map(({ name, params }) => ({ name, params })),
  };
}

export let storageOk = true;

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && Array.isArray(parsed.vehicles) && parsed.settings) return parsed;
    }
  } catch {
    storageOk = false;
  }
  return dbFromBackup(demoData);
}

export function getDB(): DB {
  if (!db) db = load();
  return db;
}

/** Applique une modification puis enregistre. */
export function mutate<T>(fn: (d: DB) => T): T {
  const d = getDB();
  const r = fn(d);
  persist();
  return r;
}

export function replaceDB(next: DB) {
  db = next;
  persist();
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    storageOk = true;
  } catch (e) {
    storageOk = false;
    const quota = e instanceof DOMException && /quota/i.test(e.name + e.message);
    alert(
      quota
        ? "Espace de stockage du navigateur plein (photos trop nombreuses ?). Les dernières modifications ne sont pas sauvegardées : exportez vos données en JSON."
        : "Le navigateur refuse l'enregistrement local (navigation privée ?). Pensez à exporter vos données en JSON.",
    );
  }
}
