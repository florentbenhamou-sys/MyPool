import Link from "next/link";
import { loadAppData } from "@/lib/data";
import { calculateVehicleCost } from "@/lib/calc/engine";
import { CATEGORY_LABELS, POWERTRAIN_LABELS } from "@/lib/domain";
import { fmtEur, fmtKm } from "@/lib/format";
import { Badge, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Véhicules" };

export default async function VehiclesPage() {
  const app = await loadAppData();
  return (
    <>
      <PageHeader
        title="Véhicules"
        subtitle={`${app.vehicles.length} véhicule(s) · coûts moyens sur ${app.baseCtx.horizonYears} ans, prix globaux`}
        actions={<Link href="/vehicules/nouveau" className="btn btn-primary">+ Ajouter un véhicule</Link>}
      />
      {app.vehicles.length === 0 ? (
        <Empty>Aucun véhicule. <Link href="/vehicules/nouveau" className="text-accent underline">Ajoutez le premier</Link>.</Empty>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {app.rawVehicles.map((raw, i) => {
            const v = app.vehicles[i];
            const r = calculateVehicleCost(v, app.baseCtx);
            const scen = app.scenarios.filter((s) => s.vehicleIds.includes(v.id)).length;
            return (
              <Link key={v.id} href={`/vehicules/${v.id}`} className="rounded-xl border border-line bg-surface overflow-hidden hover:border-accent transition flex flex-col">
                {raw.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={raw.photoUrl} alt="" className="h-32 w-full object-cover" />
                ) : null}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{v.name}</div>
                      <div className="text-xs text-ink-2 truncate">{[raw.brand, raw.model, raw.version, raw.year].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    {r.warnings.length > 0 && <Badge tone="warn">{r.warnings.length} ⚠</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone={v.category === "COMPANY" ? "accent" : "neutral"}>{CATEGORY_LABELS[v.category]}</Badge>
                    <Badge>{POWERTRAIN_LABELS[v.powertrain]}</Badge>
                    <Badge>{fmtKm(v.annualKm)}/an</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center mt-auto pt-4">
                    <div><div className="text-[11px] text-muted">mois</div><div className="font-semibold tnum">{fmtEur(r.totals.monthly, 0)}</div></div>
                    <div><div className="text-[11px] text-muted">an</div><div className="font-semibold tnum">{fmtEur(r.totals.annual, 0)}</div></div>
                    <div><div className="text-[11px] text-muted">km</div><div className="font-semibold tnum">{r.totals.perKm !== null ? fmtEur(r.totals.perKm, 3) : "—"}</div></div>
                  </div>
                  <div className="mt-3 text-[11px] text-muted">Utilisé dans {scen} scénario{scen > 1 ? "s" : ""}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
