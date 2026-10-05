import Link from "next/link";
import { loadAppData } from "@/lib/data";
import { calculateScenarioCost, compareScenarios } from "@/lib/calc/engine";
import { CATEGORY_LABELS, METHOD_LABELS, POWERTRAIN_LABELS } from "@/lib/domain";
import { fmtEur, fmtKm } from "@/lib/format";
import { seriesColor } from "@/lib/colors";
import { Card, Empty, PageHeader, Stat, Warnings } from "@/components/ui";
import { BreakdownDonut, CumulativeChart } from "@/components/charts";
import { ViewControls } from "@/components/ViewControls";

type SP = Promise<Record<string, string | undefined>>;

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const app = await loadAppData({ method: sp.methode, horizon: sp.horizon });
  const { baseCtx } = app;
  const H = baseCtx.horizonYears;
  const ref = app.scenarios.find((s) => s.id === app.referenceScenarioId);

  if (!ref) {
    return (
      <>
        <PageHeader title="Tableau de bord" />
        <Empty>
          Aucun scénario. <Link className="text-accent underline" href="/vehicules/nouveau">Ajoutez vos véhicules</Link> puis{" "}
          <Link className="text-accent underline" href="/scenarios/nouveau">créez la situation actuelle</Link>.
        </Empty>
      </>
    );
  }

  const results = app.scenarios.map((s) => calculateScenarioCost(s, app.vehicles, baseCtx));
  const r = results.find((x) => x.scenarioId === ref.id)!;
  const cmp = compareScenarios(results, ref.id);
  const best = cmp.diffs.filter((d) => d.scenarioId !== ref.id).sort((a, b) => b.horizonSavings[H] - a.horizonSavings[H])[0];
  const t = r.totals;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={
          <>
            Situation de référence : <b>{ref.name}</b> · {METHOD_LABELS[baseCtx.method]} ·{" "}
            <Link href="/parametres" className="underline">changer la référence</Link>
          </>
        }
        actions={<ViewControls method={baseCtx.method} horizon={H} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Stat label="Coût mensuel total" value={fmtEur(t.monthly, 0)} hint={`${r.vehicles.length} véhicule${r.vehicles.length > 1 ? "s" : ""} · ${fmtKm(Math.round(r.totalKm))}/an`} />
        <Stat label="Coût annuel total" value={fmtEur(t.annual, 0)} hint={`${fmtEur(t.horizon, 0)} sur ${H} an${H > 1 ? "s" : ""}`} />
        <Stat label="Coût moyen au km" value={t.perKm !== null ? fmtEur(t.perKm, 3) : "—"} hint="tous coûts compris" />
        <Stat label="Énergie" value={`${fmtEur(t.energyAnnual / 12, 0)}/mois`} hint={`${fmtEur(t.energyAnnual, 0)}/an`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Coûts fixes" value={`${fmtEur(t.fixedAnnual / 12, 0)}/mois`} hint={`${fmtEur(t.fixedAnnual, 0)}/an · redevances, financement, assurance…`} />
        <Stat label="Coûts variables" value={`${fmtEur(t.variableAnnual / 12, 0)}/mois`} hint={`${fmtEur(t.variableAnnual, 0)}/an · énergie, entretien, pneus…`} />
        <Stat label="Véhicules enregistrés" value={app.vehicles.length} hint={`${app.scenarios.length} scénario${app.scenarios.length > 1 ? "s" : ""}`} />
        {best ? (
          <Stat
            label={`Meilleure alternative (${H} ans)`}
            value={best.horizonSavings[H] > 0 ? `−${fmtEur(best.horizonSavings[H], 0)}` : "Aucune"}
            tone={best.horizonSavings[H] > 0 ? "good" : undefined}
            hint={best.horizonSavings[H] > 0 ? `${best.name} : ${fmtEur(best.monthlySaving, 0)}/mois` : "la référence est la moins chère"}
          />
        ) : (
          <Stat label="Alternatives" value="—" hint={<Link href="/scenarios/nouveau" className="underline">Créer un scénario</Link>} />
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Répartition des coûts (par mois)">
          <BreakdownDonut byGroup={t.byGroup} period="mois" />
        </Card>
        <Card title={`Coût cumulé sur ${H} ans`} actions={<Link href="/comparaison" className="text-xs text-accent">Comparer →</Link>}>
          <CumulativeChart
            series={results.map((x, i) => ({ key: `s${x.scenarioId}`, name: x.name + (x.scenarioId === ref.id ? " (réf.)" : ""), color: seriesColor(x.color, i), values: x.cumulativeByYear }))}
          />
        </Card>
      </div>

      <Card title={`Véhicules — ${ref.name}`} className="mb-4" actions={<Link href={`/scenarios/${ref.id}`} className="text-xs text-accent">Détail du calcul →</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tnum min-w-[560px]">
            <thead className="text-xs text-muted text-left">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">Véhicule</th>
                <th className="py-2 font-medium text-right">Km/an</th>
                <th className="py-2 font-medium text-right">Énergie/mois</th>
                <th className="py-2 font-medium text-right">Total/mois</th>
                <th className="py-2 font-medium text-right">Total/an</th>
                <th className="py-2 font-medium text-right">€/km</th>
              </tr>
            </thead>
            <tbody>
              {r.vehicles.map((v) => (
                <tr key={v.vehicleId} className="border-b border-line last:border-0">
                  <td className="py-2">
                    <Link href={`/vehicules/${v.vehicleId}`} className="font-medium hover:underline">{v.name}</Link>
                    <div className="text-xs text-muted">{CATEGORY_LABELS[v.category]} · {POWERTRAIN_LABELS[v.powertrain]}</div>
                  </td>
                  <td className="py-2 text-right">{fmtKm(Math.round(v.annualKm))}</td>
                  <td className="py-2 text-right">{fmtEur(v.totals.energyAnnual / 12, 0)}</td>
                  <td className="py-2 text-right font-semibold">{fmtEur(v.totals.monthly, 0)}</td>
                  <td className="py-2 text-right">{fmtEur(v.totals.annual, 0)}</td>
                  <td className="py-2 text-right">{v.totals.perKm !== null ? fmtEur(v.totals.perKm, 3) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Warnings items={r.warnings} />
    </>
  );
}
