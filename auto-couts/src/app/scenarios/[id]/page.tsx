import Link from "next/link";
import { notFound } from "next/navigation";
import { loadAppData } from "@/lib/data";
import { calculateScenarioCost, compareScenarios } from "@/lib/calc/engine";
import { CATEGORY_LABELS, POWERTRAIN_LABELS } from "@/lib/domain";
import { fmtEur, fmtKm } from "@/lib/format";
import { seriesColor } from "@/lib/colors";
import { Badge, Card, PageHeader, Stat, Warnings } from "@/components/ui";
import { CalcDetail } from "@/components/CalcDetail";
import { BreakdownDonut, CumulativeChart } from "@/components/charts";
import { ScenarioActions } from "@/components/EntityActions";
import { ViewControls } from "@/components/ViewControls";

export default async function ScenarioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const app = await loadAppData({ method: sp.methode, horizon: sp.horizon });
  const s = app.scenarios.find((x) => x.id === Number(id));
  const raw = app.rawScenarios.find((x) => x.id === Number(id));
  if (!s || !raw) notFound();
  const H = app.baseCtx.horizonYears;
  const r = calculateScenarioCost(s, app.vehicles, app.baseCtx);
  const refScenario = app.scenarios.find((x) => x.id === app.referenceScenarioId);
  const isRef = refScenario?.id === s.id;
  const diff = refScenario && !isRef ? compareScenarios([calculateScenarioCost(refScenario, app.vehicles, app.baseCtx), r], refScenario.id).diffs[1] : null;

  return (
    <>
      <div className="mb-2 text-sm"><Link href="/scenarios" className="text-ink-2 hover:underline">← Scénarios</Link></div>
      <PageHeader
        title={s.name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {isRef && <Badge tone="accent">Référence</Badge>}
            <span>{raw.adults} adulte{raw.adults > 1 ? "s" : ""} · {raw.children} enfant{raw.children > 1 ? "s" : ""}{raw.needsTwoCarsSimultaneously ? " · 2 véhicules nécessaires" : ""}</span>
          </span>
        }
        actions={<ScenarioActions id={s.id} name={s.name} isReference={isRef} />}
      />
      {raw.description && <p className="-mt-3 mb-4 text-sm text-ink-2">{raw.description}</p>}
      <div className="mb-4 flex justify-end"><ViewControls method={app.baseCtx.method} horizon={H} /></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Coût mensuel" value={fmtEur(r.totals.monthly, 0)} />
        <Stat label="Coût annuel" value={fmtEur(r.totals.annual, 0)} />
        <Stat label={`Coût sur ${H} ans`} value={fmtEur(r.totals.horizon, 0)} />
        <Stat label="Coût au km" value={r.totals.perKm !== null ? fmtEur(r.totals.perKm, 3) : "—"} hint={`${fmtKm(Math.round(r.totalKm))}/an`} />
      </div>

      {diff && refScenario && (
        <div className={`mb-4 rounded-xl border p-4 text-sm ${diff.monthlySaving > 0 ? "border-good/40 bg-good/5" : "border-bad/40 bg-bad/5"}`}>
          <div className="font-semibold">{diff.summary}</div>
          <div className="mt-1 text-ink-2">
            Sur 3 ans : <b>{fmtEur(diff.horizonSavings[3], 0)}</b> · 5 ans : <b>{fmtEur(diff.horizonSavings[5], 0)}</b> · 10 ans : <b>{fmtEur(diff.horizonSavings[10], 0)}</b>{" "}
            <Link href={`/comparaison?ids=${refScenario.id},${s.id}`} className="text-accent underline ml-1">Comparaison détaillée →</Link>
          </div>
        </div>
      )}

      {(Object.keys(s.priceOverrides ?? {}).length > 0) && (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <span className="text-ink-2">Prix propres au scénario :</span>
          {Object.entries(s.priceOverrides!).map(([code, p]) => {
            const e = app.energies.find((x) => x.code === code);
            return <Badge key={code}>{e?.label ?? code} : {fmtEur(p, 3)}/{e?.unit ?? ""}</Badge>;
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Répartition (par mois)"><BreakdownDonut byGroup={r.totals.byGroup} period="mois" /></Card>
        <Card title="Coût cumulé par véhicule">
          <CumulativeChart series={r.vehicles.map((v, i) => ({ key: `v${v.vehicleId}`, name: v.name, color: seriesColor(undefined, i), values: v.cumulativeByYear }))} />
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-3">Détail par véhicule</h2>
      <div className="grid xl:grid-cols-2 gap-4 mb-4">
        {r.vehicles.map((v) => (
          <Card
            key={v.vehicleId}
            title={<Link href={`/vehicules/${v.vehicleId}`} className="hover:underline">{v.name}</Link>}
            actions={<span className="text-xs text-muted">{CATEGORY_LABELS[v.category]} · {POWERTRAIN_LABELS[v.powertrain]}</span>}
          >
            <CalcDetail result={v} showWarnings={false} />
          </Card>
        ))}
      </div>
      <Warnings items={r.warnings} />
    </>
  );
}
