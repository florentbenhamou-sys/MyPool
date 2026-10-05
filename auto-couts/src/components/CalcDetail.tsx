import type { CostItem, VehicleResult } from "@/lib/calc/types";
import { GROUP_COLORS } from "@/lib/colors";
import { METHOD_LABELS } from "@/lib/domain";
import { fmtEur, fmtKm } from "@/lib/format";
import { Badge, Warnings } from "./ui";

function ItemRow({ item, compact }: { item: CostItem; compact?: boolean }) {
  return (
    <details className="group border-b border-line last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: GROUP_COLORS[item.group] }} aria-hidden />
        <span className="flex-1 min-w-0">
          {item.label}
          {item.isEstimate && <span className="ml-2 text-xs text-muted">(estimation)</span>}
          <span className="ml-2 text-xs text-muted">{item.nature === "FIXED" ? "fixe" : "variable"}</span>
        </span>
        <span className="tnum text-right w-24">{fmtEur(item.monthly)}</span>
        {!compact && <span className="tnum text-right w-24 text-ink-2 hidden sm:block">{fmtEur(item.annual, 0)}</span>}
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-muted transition group-open:rotate-90" fill="currentColor" aria-hidden><path d="M7 5l6 5-6 5z" /></svg>
      </summary>
      <dl className="mb-3 ml-5 rounded-lg bg-surface-2 p-3 text-sm grid gap-1">
        {item.explanation.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-x-4">
            <dt className="text-ink-2">{s.label}</dt>
            <dd className="tnum text-right font-medium">{s.value}</dd>
            {s.detail && <dd className="col-span-2 text-xs text-muted -mt-0.5">{s.detail}</dd>}
          </div>
        ))}
      </dl>
    </details>
  );
}

/** Détail complet et transparent du calcul d'un véhicule. */
export function CalcDetail({ result, showWarnings = true, compact = false }: { result: VehicleResult; showWarnings?: boolean; compact?: boolean }) {
  const annualCol = compact ? "hidden" : "hidden sm:block";
  const t = result.totals;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge>{fmtKm(Math.round(result.annualKm))}/an ({result.annualKmSource})</Badge>
        {result.ownership && <Badge tone="accent">{METHOD_LABELS[result.ownership.method]}</Badge>}
        <Badge>Horizon {t.horizonYears} an{t.horizonYears > 1 ? "s" : ""}</Badge>
      </div>
      <div>
        <div className="flex items-center gap-3 border-b border-line pb-1 text-xs text-muted">
          <span className="flex-1 pl-5">{compact ? "Poste" : "Poste (cliquer pour le détail)"}</span>
          <span className="w-24 text-right">€/mois</span>
          <span className={`w-24 text-right ${annualCol}`}>€/an</span>
          <span className="w-4" />
        </div>
        {result.items.length ? result.items.map((i) => <ItemRow key={i.key} item={i} compact={compact} />) : <p className="py-3 text-sm text-muted">Aucun coût renseigné.</p>}
        <div className="flex items-center gap-3 pt-2 text-sm font-semibold">
          <span className="flex-1 pl-5">Total foyer</span>
          <span className="tnum w-24 text-right">{fmtEur(t.monthly)}</span>
          <span className={`tnum w-24 text-right ${annualCol}`}>{fmtEur(t.annual, 0)}</span>
          <span className="w-4" />
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-2">
          <span className="flex-1 pl-5">Coût au km</span>
          <span className="tnum w-24 text-right">{t.perKm !== null ? `${fmtEur(t.perKm, 3)}` : "—"}</span>
          <span className={`w-24 ${annualCol}`} />
          <span className="w-4" />
        </div>
      </div>

      {result.informativeItems.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-ink-2 mb-1">Non supporté par le foyer (informatif, non additionné)</div>
          {result.informativeItems.map((i) => (
            <ItemRow key={i.key} item={i} compact={compact} />
          ))}
        </div>
      )}

      {result.ownership?.method === "CASH" && (result.ownership.initialOutlay > 0 || result.ownership.recurringMonthly > 0) && (
        <div className="rounded-lg bg-surface-2 p-3 text-sm">
          <div className="font-medium mb-1">Trésorerie réelle</div>
          <div className="text-ink-2">
            Sortie initiale : <b className="text-ink">{fmtEur(result.ownership.initialOutlay, 0)}</b>
            {result.ownership.recurringMonthly > 0 && (
              <>
                {" "}· puis <b className="text-ink">{fmtEur(result.ownership.recurringMonthly)}</b>/mois de mensualité
              </>
            )}
            . Les montants mensuels ci-dessus sont des moyennes sur l&apos;horizon.
          </div>
        </div>
      )}

      {showWarnings && <Warnings items={result.warnings} />}
    </div>
  );
}
