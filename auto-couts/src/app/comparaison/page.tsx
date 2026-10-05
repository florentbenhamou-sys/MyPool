import Link from "next/link";
import { loadAppData } from "@/lib/data";
import { calculateScenarioCost, compareScenarios } from "@/lib/calc/engine";
import type { ScenarioResult } from "@/lib/calc/types";
import { COST_GROUPS, GROUP_LABELS, METHOD_DESCRIPTIONS, METHOD_LABELS, STANDARD_HORIZONS } from "@/lib/domain";
import { fmtEur, fmtKm, fmtPct } from "@/lib/format";
import { GROUP_COLORS, seriesColor } from "@/lib/colors";
import { Card, Empty, PageHeader, Warnings } from "@/components/ui";
import { CumulativeChart, StackedCostBars } from "@/components/charts";
import { ScenarioPicker } from "@/components/ScenarioPicker";
import { ViewControls } from "@/components/ViewControls";

export const metadata = { title: "Comparaison" };

const signed = (v: number, d: 0 | 2 = 0) => (Math.abs(v) < 0.5 ? fmtEur(0, d) : `${v > 0 ? "+" : "−"}${fmtEur(Math.abs(v), d)}`);

/** Explique l'écart annuel entre un scénario et la référence : par véhicule puis par poste. */
function explainDiff(base: ScenarioResult, alt: ScenarioResult) {
  const baseIds = new Set(base.vehicles.map((v) => v.vehicleId));
  const altIds = new Set(alt.vehicles.map((v) => v.vehicleId));
  const removed = base.vehicles.filter((v) => !altIds.has(v.vehicleId));
  const added = alt.vehicles.filter((v) => !baseIds.has(v.vehicleId));
  const changed = alt.vehicles
    .filter((v) => baseIds.has(v.vehicleId))
    .map((v) => ({ v, delta: v.totals.annual - base.vehicles.find((b) => b.vehicleId === v.vehicleId)!.totals.annual }))
    .filter((x) => Math.abs(x.delta) >= 1);
  const groups = COST_GROUPS.map((g) => ({ g, delta: alt.totals.byGroup[g] - base.totals.byGroup[g] }))
    .filter((x) => Math.abs(x.delta) >= 1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { removed, added, changed, groups };
}

export default async function ComparisonPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const app = await loadAppData({ method: sp.methode, horizon: sp.horizon });
  const H = app.baseCtx.horizonYears;
  const allIds = app.scenarios.map((s) => s.id);
  const ids = sp.ids !== undefined ? sp.ids.split(",").map(Number).filter((x) => allIds.includes(x)) : allIds;
  const refParam = Number(sp.ref);
  const baselineId = ids.includes(refParam) ? refParam : ids.includes(app.referenceScenarioId ?? -1) ? app.referenceScenarioId! : ids[0];

  const results = app.scenarios.filter((s) => ids.includes(s.id)).map((s) => calculateScenarioCost(s, app.vehicles, app.baseCtx));
  const cmp = compareScenarios(results, baselineId);
  const base = results.find((r) => r.scenarioId === cmp.baselineId);
  const diffOf = (id: number) => cmp.diffs.find((d) => d.scenarioId === id)!;
  const horizons = Array.from(new Set([...STANDARD_HORIZONS, H])).sort((a, b) => a - b);
  const colorOf = (id: number) => {
    const i = app.scenarios.findIndex((s) => s.id === id);
    return seriesColor(app.scenarios[i]?.color, i);
  };

  const Row = ({ label, values, strong, sub }: { label: string; values: React.ReactNode[]; strong?: boolean; sub?: boolean }) => (
    <tr className={`border-b border-line last:border-0 ${strong ? "font-semibold" : ""}`}>
      <th scope="row" className={`py-2 pr-4 text-left font-normal ${sub ? "pl-3 text-ink-2" : ""} ${strong ? "font-semibold" : ""}`}>{label}</th>
      {values.map((v, i) => <td key={i} className="py-2 px-2 text-right tnum">{v}</td>)}
    </tr>
  );
  const savingCell = (v: number, isBase: boolean) =>
    isBase ? <span className="text-muted">—</span> : <span className={v > 0.5 ? "text-good" : v < -0.5 ? "text-bad" : ""}>{v > 0.5 ? `−${fmtEur(v, 0)}` : v < -0.5 ? `+${fmtEur(-v, 0)}` : fmtEur(0, 0)}</span>;

  return (
    <>
      <PageHeader title="Comparaison des scénarios" subtitle={<>{METHOD_LABELS[app.baseCtx.method]} — {METHOD_DESCRIPTIONS[app.baseCtx.method]}</>} actions={<ViewControls method={app.baseCtx.method} horizon={H} />} />
      <div className="mb-4">
        <ScenarioPicker scenarios={app.rawScenarios.map((s) => ({ id: s.id, name: s.name, color: s.color }))} selected={ids} baselineId={baselineId} />
      </div>

      {results.length === 0 || !base ? (
        <Empty>Sélectionnez au moins un scénario. {app.scenarios.length === 0 && <Link href="/scenarios/nouveau" className="text-accent underline">Créer un scénario</Link>}</Empty>
      ) : (
        <>
          {results.length > 1 && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
              {cmp.diffs.filter((d) => d.scenarioId !== base.scenarioId).map((d) => (
                <div key={d.scenarioId} className={`rounded-xl border p-4 ${d.monthlySaving > 0.5 ? "border-good/40 bg-good/5" : d.monthlySaving < -0.5 ? "border-bad/40 bg-bad/5" : "border-line bg-surface"}`}>
                  <div className="text-xs text-ink-2 flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(d.scenarioId) }} />{d.name}{d.scenarioId === cmp.cheapestId && <span className="font-semibold">· le moins cher</span>}</div>
                  <div className={`text-2xl font-semibold mt-1 ${d.monthlySaving > 0.5 ? "text-good" : d.monthlySaving < -0.5 ? "text-bad" : ""}`}>
                    {d.monthlySaving > 0.5 ? "−" : d.monthlySaving < -0.5 ? "+" : ""}{fmtEur(Math.abs(d.monthlySaving), 0)}<span className="text-sm font-normal">/mois</span>
                  </div>
                  <p className="text-sm mt-1">{d.summary}</p>
                  <p className="text-xs text-ink-2 mt-1">Sur {H} ans : {d.horizonSavings[H] >= 0 ? "économie" : "surcoût"} de {fmtEur(Math.abs(d.horizonSavings[H]), 0)}</p>
                </div>
              ))}
            </div>
          )}

          <Card className="mb-4" title="Tableau comparatif">
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 text-left text-xs text-muted font-medium">Référence : {base.name}</th>
                    {results.map((r) => (
                      <th key={r.scenarioId} className="py-2 px-2 text-right font-semibold min-w-32">
                        <span className="inline-flex items-start justify-end gap-1.5"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(r.scenarioId) }} />{r.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row label="Véhicules" values={results.map((r) => <span key={r.scenarioId} className="text-xs text-ink-2">{r.vehicles.map((v) => v.name).join(" + ") || "—"}</span>)} />
                  <Row label="Kilométrage annuel" values={results.map((r) => fmtKm(Math.round(r.totalKm)))} />
                  <Row label="Coût mensuel" strong values={results.map((r) => fmtEur(r.totals.monthly, 0))} />
                  <Row label="Coût annuel" strong values={results.map((r) => fmtEur(r.totals.annual, 0))} />
                  {horizons.map((h) => <Row key={h} label={`Coût sur ${h} an${h > 1 ? "s" : ""}`} values={results.map((r) => fmtEur(r.horizonTotals[h], 0))} strong={h === H} />)}
                  <Row label="Coût / km" strong values={results.map((r) => (r.totals.perKm !== null ? fmtEur(r.totals.perKm, 3) : "—"))} />
                  <Row label="Coûts fixes (an)" values={results.map((r) => fmtEur(r.totals.fixedAnnual, 0))} />
                  <Row label="Coûts variables (an)" values={results.map((r) => fmtEur(r.totals.variableAnnual, 0))} />
                  {COST_GROUPS.filter((g) => results.some((r) => Math.abs(r.totals.byGroup[g]) > 0.5)).map((g) => (
                    <Row key={g} sub label={GROUP_LABELS[g]} values={results.map((r) => fmtEur(r.totals.byGroup[g], 0))} />
                  ))}
                  {results.length > 1 && (
                    <>
                      <tr><td colSpan={results.length + 1} className="pt-4 pb-1 text-xs font-semibold text-ink-2">Économie par rapport à « {base.name} »</td></tr>
                      <Row label="Économie mensuelle" values={results.map((r) => savingCell(diffOf(r.scenarioId).monthlySaving, r.scenarioId === base.scenarioId))} />
                      <Row label="Économie annuelle" values={results.map((r) => savingCell(diffOf(r.scenarioId).annualSaving, r.scenarioId === base.scenarioId))} />
                      {[3, 5, 10].map((h) => <Row key={h} label={`Économie sur ${h} ans`} values={results.map((r) => savingCell(diffOf(r.scenarioId).horizonSavings[h], r.scenarioId === base.scenarioId))} />)}
                      <Row label="Différence" values={results.map((r) => { const p = diffOf(r.scenarioId).pctChange; return r.scenarioId === base.scenarioId || p === null ? "—" : <span key={r.scenarioId} className={p < 0 ? "text-good" : p > 0 ? "text-bad" : ""}>{p > 0 ? "+" : ""}{fmtPct(p)}</span>; })} />
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">« − » = moins cher que la référence (économie), « + » = plus cher. Montants mensuels/annuels = moyennes sur {H} ans.</p>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <Card title="Coût annuel par poste"><StackedCostBars rows={results.map((r) => ({ name: r.name, byGroup: r.totals.byGroup }))} /></Card>
            <Card title="Coût cumulé"><CumulativeChart series={results.map((r) => ({ key: `s${r.scenarioId}`, name: r.name, color: colorOf(r.scenarioId), values: r.cumulativeByYear }))} /></Card>
          </div>

          {results.filter((r) => r.scenarioId !== base.scenarioId).map((r) => {
            const e = explainDiff(base, r);
            const d = diffOf(r.scenarioId);
            return (
              <Card key={r.scenarioId} className="mb-4" title={`Pourquoi « ${r.name} » ${d.annualSaving >= 0 ? "coûte moins cher" : "coûte plus cher"} ?`}>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-ink-2 mb-2">Par véhicule (coût annuel)</div>
                    <ul className="space-y-1.5">
                      {e.removed.map((v) => <li key={`r${v.vehicleId}`} className="flex justify-between gap-3"><span>Retrait de <b>{v.name}</b></span><span className="tnum text-good">{signed(-v.totals.annual)}</span></li>)}
                      {e.added.map((v) => <li key={`a${v.vehicleId}`} className="flex justify-between gap-3"><span>Ajout de <b>{v.name}</b> <span className="text-muted">({fmtKm(Math.round(v.annualKm))})</span></span><span className="tnum text-bad">{signed(v.totals.annual)}</span></li>)}
                      {e.changed.map(({ v, delta }) => <li key={`c${v.vehicleId}`} className="flex justify-between gap-3"><span><b>{v.name}</b> (km ou prix du scénario)</span><span className={`tnum ${delta < 0 ? "text-good" : "text-bad"}`}>{signed(delta)}</span></li>)}
                      <li className="flex justify-between gap-3 border-t border-line pt-1.5 font-semibold"><span>Écart total</span><span className="tnum">{signed(-d.annualSaving)}/an</span></li>
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-ink-2 mb-2">Par poste (coût annuel)</div>
                    <ul className="space-y-1.5">
                      {e.groups.map(({ g, delta }) => (
                        <li key={g} className="flex justify-between gap-3">
                          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLORS[g] }} />{GROUP_LABELS[g]}</span>
                          <span className={`tnum ${delta < 0 ? "text-good" : "text-bad"}`}>{signed(delta)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted">Détail ligne par ligne : <Link className="underline" href={`/scenarios/${r.scenarioId}`}>{r.name}</Link> · <Link className="underline" href={`/scenarios/${base.scenarioId}`}>{base.name}</Link></p>
                  </div>
                </div>
              </Card>
            );
          })}

          <Warnings items={results.flatMap((r) => r.warnings.map((w) => `${r.name} — ${w}`))} />
        </>
      )}
    </>
  );
}
