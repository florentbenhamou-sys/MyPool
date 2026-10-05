/** Remplace src/app/actions.ts : mêmes actions, exécutées dans le navigateur. */
import { adjustmentsSchema, energyTypeSchema, fieldErrors, scenarioSchema, settingsSchema, vehicleSchema } from "@/lib/validation";
import { dbFromBackup, getDB, mutate, nextId, replaceDB, type ScenarioRow, type VehicleRow } from "../store";
import { demoData } from "../../prisma/demo-data";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; errors: Record<string, string> };

/* ---------------- Véhicules ---------------- */

export async function saveVehicle(id: number | null, input: unknown): Promise<ActionResult<{ id: number }>> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { costLines, ...data } = parsed.data as Record<string, any>;
  if (data.category !== "COMPANY") {
    Object.assign(data, { companyMonthlyFee: null, employeeExtraContribution: null, employerMonthlyCost: null, benefitInKindMonthly: null, benefitTaxRate: null, taxCostMonthlyOverride: null, employerEnergySharePct: null });
  } else {
    Object.assign(data, { purchasePrice: null, downPayment: null, financedAmount: null, loanMonths: null, loanRatePct: null, monthlyPayment: null, residualValue: null, holdingYears: null, mileageAtPurchase: null });
  }
  if (data.powertrain === "ELECTRIC") Object.assign(data, { fuelEnergyCode: null, fuelConsumption: null, fuelConsumptionReal: null, fuelPriceOverride: null });
  if (data.powertrain !== "ELECTRIC" && data.powertrain !== "PHEV") Object.assign(data, { elecConsumption: null, elecConsumptionReal: null, elecPriceOverride: null, electricKmShare: null });
  if (data.powertrain !== "PHEV") data.electricKmShare = null;
  for (const [k, v] of Object.entries(data)) if (v === undefined) data[k] = null;

  return mutate((db) => {
    const vid = id ?? nextId();
    const lines = (costLines as any[]).map((l, i) => ({ id: nextId(), vehicleId: vid, label: l.label, category: l.category, frequency: l.frequency, amount: l.amount, isEstimate: l.isEstimate, sortOrder: i }));
    const now = new Date();
    const existing = db.vehicles.find((v) => v.id === id);
    if (id && !existing) return { ok: false as const, errors: { _: "Véhicule introuvable." } };
    const row = { ...(existing ?? {}), ...data, id: vid, costLines: lines, createdAt: existing?.createdAt ?? now, updatedAt: now } as VehicleRow;
    if (existing) db.vehicles[db.vehicles.indexOf(existing)] = row;
    else db.vehicles.push(row);
    return { ok: true as const, data: { id: vid } };
  });
}

export async function deleteVehicle(id: number): Promise<ActionResult> {
  mutate((db) => {
    db.vehicles = db.vehicles.filter((v) => v.id !== id);
    for (const s of db.scenarios) s.vehicles = s.vehicles.filter((sv) => sv.vehicleId !== id);
  });
  return { ok: true };
}

export async function duplicateVehicle(id: number): Promise<ActionResult<{ id: number }>> {
  return mutate((db) => {
    const v = db.vehicles.find((x) => x.id === id);
    if (!v) return { ok: false as const, errors: { _: "Véhicule introuvable." } };
    const nid = nextId();
    const now = new Date();
    db.vehicles.push({ ...JSON.parse(JSON.stringify(v)), id: nid, name: `${v.name} (copie)`, costLines: v.costLines.map((l) => ({ ...l, id: nextId(), vehicleId: nid })), createdAt: now, updatedAt: now });
    return { ok: true as const, data: { id: nid } };
  });
}

/* ---------------- Scénarios ---------------- */

export async function saveScenario(id: number | null, input: unknown): Promise<ActionResult<{ id: number }>> {
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { vehicles, priceOverrides, ...data } = parsed.data;
  return mutate((db) => {
    const existing = db.scenarios.find((s) => s.id === id);
    if (id && !existing) return { ok: false as const, errors: { _: "Scénario introuvable." } };
    const sid = id ?? nextId();
    const now = new Date();
    const row: ScenarioRow = {
      ...data,
      id: sid,
      vehicles: vehicles
        .filter((v, i, a) => a.findIndex((x) => x.vehicleId === v.vehicleId) === i)
        .map((v, i) => ({ id: nextId(), scenarioId: sid, vehicleId: v.vehicleId, annualKmOverride: v.annualKmOverride ?? null, sortOrder: i })),
      priceOverrides: priceOverrides
        .filter((p, i, a) => a.findIndex((x) => x.energyCode === p.energyCode) === i)
        .map((p) => ({ id: nextId(), scenarioId: sid, energyCode: p.energyCode, price: p.price })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing) db.scenarios[db.scenarios.indexOf(existing)] = row;
    else db.scenarios.push(row);
    if (!db.settings.referenceScenarioId) db.settings.referenceScenarioId = sid;
    return { ok: true as const, data: { id: sid } };
  });
}

export async function deleteScenario(id: number): Promise<ActionResult> {
  mutate((db) => {
    db.scenarios = db.scenarios.filter((s) => s.id !== id);
    if (db.settings.referenceScenarioId === id) db.settings.referenceScenarioId = null;
  });
  return { ok: true };
}

export async function duplicateScenario(id: number): Promise<ActionResult<{ id: number }>> {
  return mutate((db) => {
    const s = db.scenarios.find((x) => x.id === id);
    if (!s) return { ok: false as const, errors: { _: "Scénario introuvable." } };
    const nid = nextId();
    const now = new Date();
    db.scenarios.push({
      ...JSON.parse(JSON.stringify(s)),
      id: nid,
      name: `${s.name} (copie)`,
      vehicles: s.vehicles.map((v) => ({ ...v, id: nextId(), scenarioId: nid })),
      priceOverrides: s.priceOverrides.map((p) => ({ ...p, id: nextId(), scenarioId: nid })),
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true as const, data: { id: nid } };
  });
}

export async function setReferenceScenario(id: number): Promise<ActionResult> {
  mutate((db) => { db.settings.referenceScenarioId = id; });
  return { ok: true };
}

/* ---------------- Paramètres ---------------- */

export async function saveEnergyTypes(input: unknown): Promise<ActionResult> {
  const list = Array.isArray(input) ? input : [];
  const errors: Record<string, string> = {};
  const parsed = list.map((e, i) => {
    const r = energyTypeSchema.safeParse(e);
    if (!r.success) for (const [k, m] of Object.entries(fieldErrors(r.error))) errors[`${i}.${k}`] = m;
    return r.success ? r.data : null;
  });
  const codes = parsed.filter(Boolean).map((e) => e!.code);
  codes.forEach((c, i) => {
    if (codes.indexOf(c) !== i) errors[`${i}.code`] = `Code « ${c} » en double`;
  });
  if (!codes.includes("ELECTRICITY")) errors["_"] = "Le type ELECTRICITY est requis (véhicules électriques et hybrides rechargeables).";
  if (Object.keys(errors).length) return { ok: false, errors };

  const db = getDB();
  const used = new Set(db.vehicles.map((v) => v.fuelEnergyCode));
  for (const e of db.energyTypes) {
    const next = parsed.find((p) => p!.id === e.id);
    if (used.has(e.code) && (!next || next.code !== e.code))
      return { ok: false, errors: { _: `L'énergie « ${e.label} » est utilisée par des véhicules : elle ne peut pas être supprimée ni changer de code.` } };
  }
  mutate((d) => {
    const now = new Date();
    d.energyTypes = parsed.map((e, i) => ({ ...e!, id: e!.id ?? nextId(), sortOrder: i, updatedAt: now }));
  });
  return { ok: true };
}

export async function saveSettings(input: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  mutate((db) => { db.settings = { id: 1, ...parsed.data }; });
  return { ok: true };
}

export async function importData(json: string): Promise<ActionResult<{ vehicles: number; scenarios: number }>> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, errors: { _: "Fichier JSON illisible." } };
  }
  try {
    const next = dbFromBackup(raw);
    replaceDB(next);
    return { ok: true, data: { vehicles: next.vehicles.length, scenarios: next.scenarios.length } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: { _: `Import refusé : ${msg.slice(0, 500)}` } };
  }
}

export async function resetDemoData(): Promise<ActionResult> {
  replaceDB(dbFromBackup(demoData));
  return { ok: true };
}

/* ---------------- Simulations enregistrées ---------------- */

export async function saveSimulation(name: string, params: unknown): Promise<ActionResult<{ id: number }>> {
  const parsed = adjustmentsSchema.safeParse(params);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (!name.trim()) return { ok: false, errors: { name: "Nom obligatoire" } };
  return mutate((db) => {
    const id = nextId();
    db.simulations.push({ id, name: name.trim().slice(0, 100), params: JSON.stringify(parsed.data), createdAt: new Date() });
    return { ok: true as const, data: { id } };
  });
}

export async function deleteSimulation(id: number): Promise<ActionResult> {
  mutate((db) => { db.simulations = db.simulations.filter((s) => s.id !== id); });
  return { ok: true };
}
