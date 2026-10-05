/** Téléchargements (remplace la route /api/export du serveur). */
import { calculateScenarioCost, calculateVehicleCost } from "@/lib/calc/engine";
import { CATEGORY_LABELS, COST_GROUPS, GROUP_LABELS, POWERTRAIN_LABELS } from "@/lib/domain";
import { loadAppData } from "./shims/data";
import { exportBackupFromDB } from "./store";

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : typeof v === "number" ? String(Math.round(v * 100) / 100).replace(".", ",") : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function runExport(format: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "json") return download(`auto-couts-${stamp}.json`, JSON.stringify(exportBackupFromDB(), null, 2), "application/json");
  const app = await loadAppData();
  const H = app.baseCtx.horizonYears;
  if (format === "csv-scenarios") {
    const header = ["Scénario", "Véhicules", "Km/an", "Coût mensuel (€)", "Coût annuel (€)", `Coût ${H} ans (€)`, "Coût/km (€)", ...COST_GROUPS.map((g) => `${GROUP_LABELS[g]} (€/an)`)];
    const rows = app.scenarios.map((s) => {
      const r = calculateScenarioCost(s, app.vehicles, app.baseCtx);
      return [s.name, r.vehicles.map((v) => v.name).join(" + "), r.totalKm, r.totals.monthly, r.totals.annual, r.totals.horizon, r.totals.perKm, ...COST_GROUPS.map((g) => r.totals.byGroup[g])];
    });
    return download(`scenarios-${stamp}.csv`, csv([header, ...rows]), "text/csv;charset=utf-8");
  }
  const header = ["Véhicule", "Marque", "Modèle", "Type", "Motorisation", "Km/an", "Coût mensuel (€)", "Coût annuel (€)", `Coût ${H} ans (€)`, "Coût/km (€)", "Fixes (€/an)", "Variables (€/an)", "Énergie (€/an)"];
  const rows = app.vehicles.map((v, i) => {
    const r = calculateVehicleCost(v, app.baseCtx);
    const raw = app.rawVehicles[i];
    return [v.name, raw.brand, raw.model, CATEGORY_LABELS[v.category], POWERTRAIN_LABELS[v.powertrain], r.annualKm, r.totals.monthly, r.totals.annual, r.totals.horizon, r.totals.perKm, r.totals.fixedAnnual, r.totals.variableAnnual, r.totals.energyAnnual];
  });
  download(`vehicules-${stamp}.csv`, csv([header, ...rows]), "text/csv;charset=utf-8");
}
