import Link from "next/link";
import { notFound } from "next/navigation";
import { loadAppData } from "@/lib/data";
import { calculateVehicleCost } from "@/lib/calc/engine";
import { CATEGORY_LABELS, POWERTRAIN_LABELS } from "@/lib/domain";
import { fmtEur, fmtKm } from "@/lib/format";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { CalcDetail } from "@/components/CalcDetail";
import { BreakdownDonut } from "@/components/charts";
import { VehicleActions } from "@/components/EntityActions";
import { ViewControls } from "@/components/ViewControls";

export default async function VehiclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const app = await loadAppData({ method: sp.methode, horizon: sp.horizon });
  const idx = app.vehicles.findIndex((x) => x.id === Number(id));
  if (idx < 0) notFound();
  const v = app.vehicles[idx];
  const raw = app.rawVehicles[idx];
  const r = calculateVehicleCost(v, app.baseCtx);
  const usedIn = app.scenarios.filter((s) => s.vehicleIds.includes(v.id));
  const H = app.baseCtx.horizonYears;

  return (
    <>
      <div className="mb-2 text-sm"><Link href="/vehicules" className="text-ink-2 hover:underline">← Véhicules</Link></div>
      <PageHeader
        title={v.name}
        subtitle={[raw.brand, raw.model, raw.version, raw.year, raw.plate].filter(Boolean).join(" · ")}
        actions={<VehicleActions id={v.id} name={v.name} usedIn={usedIn.map((s) => s.name)} />}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{CATEGORY_LABELS[v.category]}</Badge>
          <Badge>{POWERTRAIN_LABELS[v.powertrain]}</Badge>
          {raw.currentMileage != null && <Badge>Compteur : {fmtKm(raw.currentMileage)}</Badge>}
          {raw.proKm != null && <Badge>Pro : {fmtKm(raw.proKm)}/an</Badge>}
          {raw.persoKm != null && <Badge>Perso : {fmtKm(raw.persoKm)}/an</Badge>}
        </div>
        <ViewControls method={app.baseCtx.method} horizon={H} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Coût mensuel" value={fmtEur(r.totals.monthly, 0)} />
        <Stat label="Coût annuel" value={fmtEur(r.totals.annual, 0)} />
        <Stat label={`Coût sur ${H} ans`} value={fmtEur(r.totals.horizon, 0)} />
        <Stat label="Coût au km" value={r.totals.perKm !== null ? fmtEur(r.totals.perKm, 3) : "—"} hint={`${fmtKm(Math.round(r.annualKm))}/an`} />
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
        <Card title="Détail du calcul">
          <CalcDetail result={r} />
        </Card>
        <div className="space-y-4">
          <Card title="Répartition annuelle">
            <BreakdownDonut byGroup={r.totals.byGroup} />
          </Card>
          <Card title="Coût selon l'horizon">
            <table className="w-full text-sm tnum">
              <tbody>
                {Object.entries(r.horizonTotals).map(([y, total]) => (
                  <tr key={y} className="border-b border-line last:border-0">
                    <td className="py-1.5">{y} an{Number(y) > 1 ? "s" : ""}</td>
                    <td className="py-1.5 text-right font-medium">{fmtEur(total, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Scénarios utilisant ce véhicule">
            {usedIn.length ? (
              <ul className="text-sm space-y-1">
                {usedIn.map((s) => <li key={s.id}><Link href={`/scenarios/${s.id}`} className="text-accent hover:underline">{s.name}</Link></li>)}
              </ul>
            ) : <p className="text-sm text-muted">Aucun. <Link href="/scenarios/nouveau" className="underline">Créer un scénario</Link></p>}
          </Card>
          {raw.notes && <Card title="Notes"><p className="text-sm whitespace-pre-wrap">{raw.notes}</p></Card>}
        </div>
      </div>
    </>
  );
}
