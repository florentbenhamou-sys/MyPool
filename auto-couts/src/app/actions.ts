"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { importBackup } from "@/lib/backup";
import { adjustmentsSchema, energyTypeSchema, fieldErrors, scenarioSchema, settingsSchema, vehicleSchema } from "@/lib/validation";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; errors: Record<string, string> };

const refresh = () => revalidatePath("/", "layout");

/* ---------------- Véhicules ---------------- */

export async function saveVehicle(id: number | null, input: unknown): Promise<ActionResult<{ id: number }>> {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { costLines, ...data } = parsed.data;
  // Les champs non pertinents pour la catégorie / motorisation sont vidés pour éviter les données fantômes.
  if (data.category !== "COMPANY") {
    Object.assign(data, {
      companyMonthlyFee: null, employeeExtraContribution: null, employerMonthlyCost: null, benefitInKindMonthly: null,
      benefitTaxRate: null, taxCostMonthlyOverride: null, employerEnergySharePct: null,
    });
  } else {
    Object.assign(data, {
      purchasePrice: null, downPayment: null, financedAmount: null, loanMonths: null, loanRatePct: null,
      monthlyPayment: null, residualValue: null, holdingYears: null, mileageAtPurchase: null,
    });
  }
  if (data.powertrain === "ELECTRIC") Object.assign(data, { fuelEnergyCode: null, fuelConsumption: null, fuelConsumptionReal: null, fuelPriceOverride: null });
  if (data.powertrain !== "ELECTRIC" && data.powertrain !== "PHEV")
    Object.assign(data, { elecConsumption: null, elecConsumptionReal: null, elecPriceOverride: null, electricKmShare: null });
  if (data.powertrain !== "PHEV") data.electricKmShare = null;

  const lines = costLines.map((l, i) => ({ label: l.label, category: l.category, frequency: l.frequency, amount: l.amount, isEstimate: l.isEstimate, sortOrder: i }));
  const saved = await prisma.$transaction(async (tx) => {
    if (id) {
      await tx.costLine.deleteMany({ where: { vehicleId: id } });
      return tx.vehicle.update({ where: { id }, data: { ...data, costLines: { create: lines } } });
    }
    return tx.vehicle.create({ data: { ...data, costLines: { create: lines } } });
  });
  refresh();
  return { ok: true, data: { id: saved.id } };
}

export async function deleteVehicle(id: number): Promise<ActionResult> {
  await prisma.vehicle.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function duplicateVehicle(id: number): Promise<ActionResult<{ id: number }>> {
  const v = await prisma.vehicle.findUniqueOrThrow({ where: { id }, include: { costLines: true } });
  const { id: _id, createdAt, updatedAt, costLines, ...rest } = v;
  const copy = await prisma.vehicle.create({
    data: {
      ...rest,
      name: `${v.name} (copie)`,
      costLines: { create: costLines.map(({ id: _l, vehicleId, ...l }) => l) },
    },
  });
  refresh();
  return { ok: true, data: { id: copy.id } };
}

/* ---------------- Scénarios ---------------- */

export async function saveScenario(id: number | null, input: unknown): Promise<ActionResult<{ id: number }>> {
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { vehicles, priceOverrides, ...data } = parsed.data;
  const uniqueVehicles = vehicles.filter((v, i, a) => a.findIndex((x) => x.vehicleId === v.vehicleId) === i);
  const uniquePrices = priceOverrides.filter((p, i, a) => a.findIndex((x) => x.energyCode === p.energyCode) === i);
  const nested = {
    vehicles: { create: uniqueVehicles.map((v, i) => ({ vehicleId: v.vehicleId, annualKmOverride: v.annualKmOverride ?? null, sortOrder: i })) },
    priceOverrides: { create: uniquePrices },
  };
  const saved = await prisma.$transaction(async (tx) => {
    if (id) {
      await tx.scenarioVehicle.deleteMany({ where: { scenarioId: id } });
      await tx.scenarioPriceOverride.deleteMany({ where: { scenarioId: id } });
      return tx.scenario.update({ where: { id }, data: { ...data, ...nested } });
    }
    return tx.scenario.create({ data: { ...data, ...nested } });
  });
  // Premier scénario créé : il devient la référence
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.referenceScenarioId) await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, referenceScenarioId: saved.id }, update: { referenceScenarioId: saved.id } });
  refresh();
  return { ok: true, data: { id: saved.id } };
}

export async function deleteScenario(id: number): Promise<ActionResult> {
  await prisma.scenario.delete({ where: { id } });
  await prisma.settings.updateMany({ where: { referenceScenarioId: id }, data: { referenceScenarioId: null } });
  refresh();
  return { ok: true };
}

export async function duplicateScenario(id: number): Promise<ActionResult<{ id: number }>> {
  const s = await prisma.scenario.findUniqueOrThrow({ where: { id }, include: { vehicles: true, priceOverrides: true } });
  const copy = await prisma.scenario.create({
    data: {
      name: `${s.name} (copie)`, description: s.description, color: s.color, adults: s.adults, children: s.children,
      needsTwoCarsSimultaneously: s.needsTwoCarsSimultaneously,
      vehicles: { create: s.vehicles.map(({ vehicleId, annualKmOverride, sortOrder }) => ({ vehicleId, annualKmOverride, sortOrder })) },
      priceOverrides: { create: s.priceOverrides.map(({ energyCode, price }) => ({ energyCode, price })) },
    },
  });
  refresh();
  return { ok: true, data: { id: copy.id } };
}

export async function setReferenceScenario(id: number): Promise<ActionResult> {
  await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, referenceScenarioId: id }, update: { referenceScenarioId: id } });
  refresh();
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

  // Une énergie utilisée par un véhicule ne peut être ni supprimée ni recodée
  const existing = await prisma.energyType.findMany();
  const used = new Set((await prisma.vehicle.findMany({ select: { fuelEnergyCode: true } })).map((v) => v.fuelEnergyCode));
  for (const e of existing) {
    const next = parsed.find((p) => p!.id === e.id);
    if (used.has(e.code) && (!next || next.code !== e.code)) return { ok: false, errors: { _: `L'énergie « ${e.label} » est utilisée par des véhicules : elle ne peut pas être supprimée ni changer de code.` } };
  }

  await prisma.$transaction(async (tx) => {
    const keep = parsed.map((e) => e!.id).filter((x): x is number => !!x);
    await tx.energyType.deleteMany({ where: { id: { notIn: keep } } });
    for (const [i, e] of parsed.entries()) {
      const { id, ...data } = e!;
      if (id) await tx.energyType.update({ where: { id }, data: { ...data, sortOrder: i } });
      else await tx.energyType.create({ data: { ...data, sortOrder: i } });
    }
  });
  refresh();
  return { ok: true };
}

export async function saveSettings(input: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, ...parsed.data }, update: parsed.data });
  refresh();
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
    const r = await importBackup(prisma, raw);
    refresh();
    return { ok: true, data: r };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: { _: `Import refusé : ${msg.slice(0, 500)}` } };
  }
}

export async function resetDemoData(): Promise<ActionResult> {
  const { demoData } = await import("../../prisma/demo-data");
  await importBackup(prisma, demoData);
  refresh();
  return { ok: true };
}

/* ---------------- Simulations enregistrées ---------------- */

export async function saveSimulation(name: string, params: unknown): Promise<ActionResult<{ id: number }>> {
  const parsed = adjustmentsSchema.safeParse(params);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (!name.trim()) return { ok: false, errors: { name: "Nom obligatoire" } };
  const s = await prisma.simulation.create({ data: { name: name.trim().slice(0, 100), params: JSON.stringify(parsed.data) } });
  refresh();
  return { ok: true, data: { id: s.id } };
}

export async function deleteSimulation(id: number): Promise<ActionResult> {
  await prisma.simulation.delete({ where: { id } });
  refresh();
  return { ok: true };
}
