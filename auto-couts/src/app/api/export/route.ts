import { prisma } from "@/lib/db";
import { exportBackup } from "@/lib/backup";
import { loadAppData } from "@/lib/data";
import { calculateScenarioCost, calculateVehicleCost } from "@/lib/calc/engine";
import { CATEGORY_LABELS, POWERTRAIN_LABELS, GROUP_LABELS, COST_GROUPS } from "@/lib/domain";

export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : typeof v === "number" ? String(Math.round(v * 100) / 100).replace(".", ",") : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const data = await exportBackup(prisma);
    return new Response(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="auto-couts-${stamp}.json"` },
    });
  }

  const app = await loadAppData({ method: url.searchParams.get("methode") ?? undefined });
  const H = app.baseCtx.horizonYears;
  if (format === "csv-scenarios") {
    const header = ["Scénario", "Véhicules", "Km/an", "Coût mensuel (€)", "Coût annuel (€)", `Coût ${H} ans (€)`, "Coût/km (€)", ...COST_GROUPS.map((g) => `${GROUP_LABELS[g]} (€/an)`)];
    const rows = app.scenarios.map((s) => {
      const r = calculateScenarioCost(s, app.vehicles, app.baseCtx);
      return [s.name, r.vehicles.map((v) => v.name).join(" + "), r.totalKm, r.totals.monthly, r.totals.annual, r.totals.horizon, r.totals.perKm, ...COST_GROUPS.map((g) => r.totals.byGroup[g])];
    });
    return new Response(csv([header, ...rows]), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="scenarios-${stamp}.csv"` },
    });
  }

  const header = ["Véhicule", "Marque", "Modèle", "Type", "Motorisation", "Km/an", "Coût mensuel (€)", "Coût annuel (€)", `Coût ${H} ans (€)`, "Coût/km (€)", "Fixes (€/an)", "Variables (€/an)", "Énergie (€/an)"];
  const rows = app.vehicles.map((v) => {
    const r = calculateVehicleCost(v, app.baseCtx);
    const raw = app.rawVehicles.find((x) => x.id === v.id)!;
    return [v.name, raw.brand, raw.model, CATEGORY_LABELS[v.category], POWERTRAIN_LABELS[v.powertrain], r.annualKm, r.totals.monthly, r.totals.annual, r.totals.horizon, r.totals.perKm, r.totals.fixedAnnual, r.totals.variableAnnual, r.totals.energyAnnual];
  });
  return new Response(csv([header, ...rows]), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="vehicules-${stamp}.csv"` },
  });
}
