import Link from "next/link";
import { loadAppData } from "@/lib/data";
import { calculateScenarioCost, compareScenarios } from "@/lib/calc/engine";
import { fmtEur, fmtKm, fmtPct } from "@/lib/format";
import { seriesColor } from "@/lib/colors";
import { Badge, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Scénarios" };

export default async function ScenariosPage() {
  const app = await loadAppData();
  const results = app.scenarios.map((s) => calculateScenarioCost(s, app.vehicles, app.baseCtx));
  const cmp = compareScenarios(results, app.referenceScenarioId ?? undefined);
  const H = app.baseCtx.horizonYears;
  return (
    <>
      <PageHeader
        title="Scénarios"
        subtitle="Chaque scénario est une configuration automobile du foyer."
        actions={
          <>
            <Link href="/comparaison" className="btn">Comparer</Link>
            <Link href="/scenarios/nouveau" className="btn btn-primary">+ Nouveau scénario</Link>
          </>
        }
      />
      {results.length === 0 ? (
        <Empty>Aucun scénario. <Link href="/scenarios/nouveau" className="text-accent underline">Créez la situation actuelle</Link>.</Empty>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {results.map((r, i) => {
            const s = app.rawScenarios[i];
            const d = cmp.diffs[i];
            const isRef = r.scenarioId === cmp.baselineId;
            return (
              <Link key={r.scenarioId} href={`/scenarios/${r.scenarioId}`} className="rounded-xl border border-line bg-surface p-4 hover:border-accent transition flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: seriesColor(s.color, i) }} />
                    <span className="font-semibold truncate">{r.name}</span>
                  </div>
                  {isRef ? <Badge tone="accent">Référence</Badge> : r.scenarioId === cmp.cheapestId ? <Badge>Le moins cher</Badge> : null}
                </div>
                {s.description && <p className="mt-1 text-xs text-ink-2 line-clamp-2">{s.description}</p>}
                <ul className="mt-3 text-sm space-y-0.5 text-ink-2">
                  {r.vehicles.map((v) => <li key={v.vehicleId}>• {v.name} <span className="text-muted">({fmtKm(Math.round(v.annualKm))})</span></li>)}
                  {r.vehicles.length === 0 && <li className="text-muted">Aucun véhicule</li>}
                </ul>
                <div className="mt-auto pt-4 grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-[11px] text-muted">mois</div><div className="font-semibold tnum">{fmtEur(r.totals.monthly, 0)}</div></div>
                  <div><div className="text-[11px] text-muted">an</div><div className="font-semibold tnum">{fmtEur(r.totals.annual, 0)}</div></div>
                  <div><div className="text-[11px] text-muted">{H} ans</div><div className="font-semibold tnum">{fmtEur(r.totals.horizon, 0)}</div></div>
                </div>
                {!isRef && (
                  <div className={`mt-3 text-xs font-medium ${d.monthlySaving > 0 ? "text-good" : d.monthlySaving < 0 ? "text-bad" : "text-ink-2"}`}>
                    {d.monthlySaving >= 0 ? "Économie" : "Surcoût"} : {fmtEur(Math.abs(d.monthlySaving), 0)}/mois ({d.pctChange !== null ? fmtPct(d.pctChange) : "—"})
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
