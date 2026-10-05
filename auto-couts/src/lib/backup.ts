/** Export / import JSON complet de la base. Le jeu de démonstration utilise le même format. */
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { costLineSchema } from "./validation";

export const BACKUP_VERSION = 1;

const num = z.number().nullable().optional();
const vehicleBackup = z
  .object({
    id: z.number().int(),
    name: z.string(),
    category: z.string(),
    powertrain: z.string(),
    annualKm: z.number().int(),
    costLines: z.array(costLineSchema).default([]),
  })
  .catchall(z.unknown());

export const backupSchema = z.object({
  version: z.number().int(),
  exportedAt: z.string().optional(),
  settings: z
    .object({
      defaultBenefitTaxRate: z.number(),
      defaultHorizonYears: z.number().int(),
      costMethod: z.string(),
      referenceScenarioId: z.number().int().nullable().optional(),
    })
    .optional(),
  energyTypes: z.array(
    z.object({ code: z.string(), label: z.string(), unit: z.string(), price: z.number(), isElectric: z.boolean().default(false), sortOrder: z.number().int().default(0) }),
  ),
  vehicles: z.array(vehicleBackup),
  scenarios: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      description: z.string().default(""),
      color: z.string().default("#2a78d6"),
      adults: z.number().int().default(2),
      children: z.number().int().default(0),
      needsTwoCarsSimultaneously: z.boolean().default(false),
      vehicles: z.array(z.object({ vehicleId: z.number().int(), annualKmOverride: num, sortOrder: z.number().int().default(0) })),
      priceOverrides: z.array(z.object({ energyCode: z.string(), price: z.number() })).default([]),
    }),
  ),
  simulations: z.array(z.object({ name: z.string(), params: z.string() })).default([]),
});
export type Backup = z.input<typeof backupSchema>;

/** Champs scalaires du modèle Vehicle acceptés à l'import (tout le reste est ignoré). */
const VEHICLE_FIELDS = [
  "name", "brand", "model", "version", "year", "plate", "photoUrl", "notes", "category", "powertrain",
  "fuelEnergyCode", "fuelConsumption", "fuelConsumptionReal", "fuelPriceOverride",
  "elecConsumption", "elecConsumptionReal", "elecPriceOverride", "electricKmShare",
  "currentMileage", "annualKm", "proKm", "persoKm",
  "companyMonthlyFee", "employeeExtraContribution", "employerMonthlyCost", "benefitInKindMonthly", "benefitTaxRate",
  "taxCostMonthlyOverride", "employerEnergySharePct",
  "purchasePrice", "mileageAtPurchase", "downPayment", "financedAmount", "loanMonths", "loanRatePct",
  "monthlyPayment", "residualValue", "holdingYears",
] as const;

export async function exportBackup(prisma: PrismaClient) {
  const [settings, energyTypes, vehicles, scenarios, simulations] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.energyType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.vehicle.findMany({ include: { costLines: { orderBy: { sortOrder: "asc" } } }, orderBy: { id: "asc" } }),
    prisma.scenario.findMany({ include: { vehicles: true, priceOverrides: true }, orderBy: { id: "asc" } }),
    prisma.simulation.findMany(),
  ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: settings && {
      defaultBenefitTaxRate: settings.defaultBenefitTaxRate,
      defaultHorizonYears: settings.defaultHorizonYears,
      costMethod: settings.costMethod,
      referenceScenarioId: settings.referenceScenarioId,
    },
    energyTypes: energyTypes.map(({ code, label, unit, price, isElectric, sortOrder }) => ({ code, label, unit, price, isElectric, sortOrder })),
    vehicles: vehicles.map(({ createdAt, updatedAt, costLines, ...v }) => ({
      ...v,
      costLines: costLines.map(({ label, category, frequency, amount, isEstimate }) => ({ label, category, frequency, amount, isEstimate })),
    })),
    scenarios: scenarios.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      color: s.color,
      adults: s.adults,
      children: s.children,
      needsTwoCarsSimultaneously: s.needsTwoCarsSimultaneously,
      vehicles: s.vehicles.map(({ vehicleId, annualKmOverride, sortOrder }) => ({ vehicleId, annualKmOverride, sortOrder })),
      priceOverrides: s.priceOverrides.map(({ energyCode, price }) => ({ energyCode, price })),
    })),
    simulations: simulations.map(({ name, params }) => ({ name, params })),
  };
}

/** Remplace TOUTES les données par celles de la sauvegarde (transaction atomique). */
export async function importBackup(prisma: PrismaClient, raw: unknown): Promise<{ vehicles: number; scenarios: number }> {
  const data = backupSchema.parse(raw);
  if (data.version > BACKUP_VERSION) throw new Error(`Version de sauvegarde non supportée (${data.version})`);
  return prisma.$transaction(async (tx) => {
    await tx.scenarioVehicle.deleteMany();
    await tx.scenarioPriceOverride.deleteMany();
    await tx.scenario.deleteMany();
    await tx.costLine.deleteMany();
    await tx.vehicle.deleteMany();
    await tx.energyType.deleteMany();
    await tx.simulation.deleteMany();

    for (const e of data.energyTypes) await tx.energyType.create({ data: e });

    const idMap = new Map<number, number>();
    for (const v of data.vehicles) {
      const fields: Record<string, unknown> = {};
      for (const f of VEHICLE_FIELDS) if (v[f] !== undefined) fields[f] = v[f];
      const created = await tx.vehicle.create({
        data: {
          ...(fields as { name: string; category: string; powertrain: string }),
          costLines: { create: v.costLines.map((l, i) => ({ label: l.label, category: l.category, frequency: l.frequency, amount: l.amount, isEstimate: l.isEstimate, sortOrder: i })) },
        },
      });
      idMap.set(v.id, created.id);
    }

    const scenMap = new Map<number, number>();
    for (const s of data.scenarios) {
      const created = await tx.scenario.create({
        data: {
          name: s.name,
          description: s.description,
          color: s.color,
          adults: s.adults,
          children: s.children,
          needsTwoCarsSimultaneously: s.needsTwoCarsSimultaneously,
          vehicles: {
            create: s.vehicles
              .filter((sv) => idMap.has(sv.vehicleId))
              .map((sv, i) => ({ vehicleId: idMap.get(sv.vehicleId)!, annualKmOverride: sv.annualKmOverride ?? null, sortOrder: sv.sortOrder ?? i })),
          },
          priceOverrides: { create: s.priceOverrides },
        },
      });
      scenMap.set(s.id, created.id);
    }

    for (const sim of data.simulations) await tx.simulation.create({ data: sim });

    const st = data.settings;
    const settings = {
      defaultBenefitTaxRate: st?.defaultBenefitTaxRate ?? 41.2,
      defaultHorizonYears: st?.defaultHorizonYears ?? 5,
      costMethod: st?.costMethod === "CASH" ? "CASH" : "ECONOMIC",
      referenceScenarioId: st?.referenceScenarioId != null ? scenMap.get(st.referenceScenarioId) ?? null : null,
    };
    await tx.settings.upsert({ where: { id: 1 }, create: { id: 1, ...settings }, update: settings });
    return { vehicles: data.vehicles.length, scenarios: data.scenarios.length };
  });
}
