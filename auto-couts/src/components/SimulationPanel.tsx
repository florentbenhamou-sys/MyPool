"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EnergyType } from "@prisma/client";
import { deleteSimulation, saveSimulation } from "@/app/actions";
import { calculateScenarioCost, energyPriceSensitivity, priceRange } from "@/lib/calc/engine";
import type { Adjustments, CalcContext, ScenarioInput, VehicleInput } from "@/lib/calc/types";
import { seriesColor } from "@/lib/colors";
import { METHOD_LABELS, STANDARD_HORIZONS, type CostMethod } from "@/lib/domain";
import { fmtEur, fmtKm, fmtNum } from "@/lib/format";
import { SensitivityChart } from "./charts";
import { NumInput } from "./VehicleForm";
import { Card, Warnings } from "./ui";

type BaseCtx = Omit<CalcContext, "scenarioPriceOverrides" | "scenarioAnnualKm">;

interface State {
  prices: Record<string, string>;
  kmPct: string;
  kmByVehicle: Record<number, string>;
  feeDelta: string;
  holding: string;
  taxRate: string;
}
const EMPTY: State = { prices: {}, kmPct: "", kmByVehicle: {}, feeDelta: "", holding: "", taxRate: "" };

const toNum = (s: string | undefined): number | undefined => {
  if (s === undefined) return undefined;
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

function toAdjustments(s: State): Adjustments {
  const a: Adjustments = {};
  const prices = Object.fromEntries(Object.entries(s.prices).map(([k, v]) => [k, toNum(v)]).filter(([, v]) => v !== undefined && (v as number) >= 0));
  if (Object.keys(prices).length) a.energyPrices = prices as Record<string, number>;
  const km = Object.fromEntries(Object.entries(s.kmByVehicle).map(([k, v]) => [Number(k), toNum(v)]).filter(([, v]) => v !== undefined && (v as number) >= 0));
  if (Object.keys(km).length) a.annualKmByVehicle = km as Record<number, number>;
  const pct = toNum(s.kmPct);
  if (pct !== undefined && pct >= -100) a.kmChangePct = pct;
  const fee = toNum(s.feeDelta);
  if (fee !== undefined) a.companyFeeDelta = fee;
  const h = toNum(s.holding);
  if (h !== undefined && h > 0) a.holdingYears = h;
  const t = toNum(s.taxRate);
  if (t !== undefined && t >= 0 && t <= 100) a.benefitTaxRate = t;
  return a;
}

function fromAdjustments(a: Adjustments): State {
  const str = (v: number | undefined) => (v === undefined ? "" : String(v).replace(".", ","));
  return {
    prices: Object.fromEntries(Object.entries(a.energyPrices ?? {}).map(([k, v]) => [k, str(v)])),
    kmByVehicle: Object.fromEntries(Object.entries(a.annualKmByVehicle ?? {}).map(([k, v]) => [Number(k), str(v)])),
    kmPct: str(a.kmChangePct),
    feeDelta: str(a.companyFeeDelta),
    holding: str(a.holdingYears),
    taxRate: str(a.benefitTaxRate),
  };
}

export function SimulationPanel({
  vehicles,
  scenarios,
  energies,
  baseCtx,
  referenceId,
  saved,
}: {
  vehicles: VehicleInput[];
  scenarios: ScenarioInput[];
  energies: EnergyType[];
  baseCtx: BaseCtx;
  referenceId: number | null;
  saved: { id: number; name: string; params: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ids, setIds] = useState<number[]>(scenarios.map((s) => s.id));
  const [st, setSt] = useState<State>(EMPTY);
  const [method, setMethod] = useState<CostMethod>(baseCtx.method);
  const [horizon, setHorizon] = useState(baseCtx.horizonYears);
  const [sensCode, setSensCode] = useState(energies.find((e) => e.code === "ELECTRICITY")?.code ?? energies[0]?.code ?? "");
  const [saveName, setSaveName] = useState("");

  const ctx: BaseCtx = useMemo(() => ({ ...baseCtx, method, horizonYears: horizon }), [baseCtx, method, horizon]);
  const adjustments = useMemo(() => toAdjustments(st), [st]);
  const active = Object.keys(adjustments).length > 0;
  const selected = scenarios.filter((s) => ids.includes(s.id));
  const usedVehicleIds = new Set(selected.flatMap((s) => s.vehicleIds));
  const hasCompany = vehicles.some((v) => usedVehicleIds.has(v.id) && v.category === "COMPANY");
  const hasBought = vehicles.some((v) => usedVehicleIds.has(v.id) && v.category !== "COMPANY");

  const rows = useMemo(
    () =>
      selected.map((s) => ({
        s,
        base: calculateScenarioCost(s, vehicles, { ...ctx, adjustments: undefined }),
        sim: calculateScenarioCost(s, vehicles, { ...ctx, adjustments }),
      })),
    [selected, vehicles, ctx, adjustments],
  );
  const refRow = rows.find((r) => r.s.id === referenceId) ?? rows[0];
  const cheapestSim = rows.length ? rows.reduce((a, b) => (b.sim.totals.horizon < a.sim.totals.horizon ? b : a)) : null;

  // Sensibilité au prix d'une énergie
  const sensEnergy = energies.find((e) => e.code === sensCode);
  const sensCurrent = adjustments.energyPrices?.[sensCode] ?? sensEnergy?.price ?? 0;
  const [range, setRange] = useState<{ min: string; max: string }>({ min: "", max: "" });
  const sens = useMemo(() => {
    if (!sensEnergy) return null;
    const p = sensEnergy.price;
    const min = toNum(range.min) ?? Math.round(p * 0.6 * 100) / 100;
    const max = toNum(range.max) ?? Math.round(p * 1.4 * 100) / 100;
    const prices = priceRange(min, Math.max(max, min), 5);
    const series = selected.map((s, i) => ({ key: `s${s.id}`, name: s.name, color: seriesColor(s.color, i) }));
    const perScenario = selected.map((s) => energyPriceSensitivity(s, vehicles, { ...ctx, adjustments }, sensCode, prices));
    const points = prices.map((price, k) => ({ price, ...Object.fromEntries(selected.map((s, i) => [`s${s.id}`, perScenario[i][k].codeAnnual])) }));
    const energyOnly = selected.map((s, i) => ({ s, values: perScenario[i] }));
    return { prices, series, points, energyOnly };
  }, [sensEnergy, range, selected, vehicles, ctx, adjustments, sensCode]);

  const preset = (patch: Partial<State>) => setSt((s) => ({ ...s, ...patch, prices: { ...s.prices, ...patch.prices } }));
  const gasoline = energies.find((e) => e.code === "GASOLINE");
  const elec = energies.find((e) => e.code === "ELECTRICITY");

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {scenarios.map((s, i) => {
            const on = ids.includes(s.id);
            return (
              <button key={s.id} type="button" aria-pressed={on} onClick={() => setIds((x) => (on ? x.filter((y) => y !== s.id) : [...x, s.id]))} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? "border-accent bg-accent/10 font-medium" : "border-line text-ink-2"}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: seriesColor(s.color, i) }} />
                {s.name}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-2">Scénarios rapides :</span>
          {gasoline && <button className="btn btn-sm" onClick={() => preset({ prices: { GASOLINE: "2,2" } })}>Essence à 2,20 €/L</button>}
          {elec && <button className="btn btn-sm" onClick={() => preset({ prices: { ELECTRICITY: "0,15" } })}>Électricité à 0,15 €/kWh</button>}
          <button className="btn btn-sm" onClick={() => preset({ kmPct: "20" })}>+20 % de km</button>
          {hasCompany && <button className="btn btn-sm" onClick={() => preset({ feeDelta: "50" })}>Redevance +50 €</button>}
          {hasBought && <button className="btn btn-sm" onClick={() => preset({ holding: "5" })}>Détention 5 ans</button>}
          {active && <button className="btn btn-sm btn-danger" onClick={() => setSt(EMPTY)}>Réinitialiser</button>}
        </div>
      </Card>

      <div className="grid lg:grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
        <Card title="Hypothèses simulées" className="lg:sticky lg:top-6">
          <p className="text-xs text-ink-2 mb-3">Les données enregistrées ne sont jamais modifiées. Champ vide = valeur actuelle.</p>
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs font-semibold text-ink-2 mb-2">Prix de l&apos;énergie</div>
              <div className="space-y-2">
                {energies.map((e) => (
                  <label key={e.code} className="grid grid-cols-[1fr_140px] items-center gap-2">
                    <span>{e.label}</span>
                    <NumInput value={st.prices[e.code] ?? ""} onChange={(ev) => setSt((s) => ({ ...s, prices: { ...s.prices, [e.code]: ev.target.value } }))} placeholder={fmtNum(e.price, 3)} suffix={`€/${e.unit}`} />
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-ink-2 mb-2">Kilométrage</div>
              <label className="grid grid-cols-[1fr_140px] items-center gap-2 mb-2">
                <span>Variation globale</span>
                <NumInput value={st.kmPct} onChange={(e) => setSt((s) => ({ ...s, kmPct: e.target.value }))} placeholder="0" suffix="%" />
              </label>
              {vehicles.filter((v) => usedVehicleIds.has(v.id)).map((v) => (
                <label key={v.id} className="grid grid-cols-[1fr_140px] items-center gap-2 mb-2">
                  <span className="truncate" title={v.name}>{v.name}</span>
                  <NumInput value={st.kmByVehicle[v.id] ?? ""} onChange={(e) => setSt((s) => ({ ...s, kmByVehicle: { ...s.kmByVehicle, [v.id]: e.target.value } }))} placeholder={String(v.annualKm)} suffix="km/an" />
                </label>
              ))}
              <p className="text-xs text-muted">Un km par véhicule remplace celui du scénario et la variation globale.</p>
            </div>
            {hasCompany && (
              <div>
                <div className="text-xs font-semibold text-ink-2 mb-2">Voitures de fonction</div>
                <label className="grid grid-cols-[1fr_140px] items-center gap-2 mb-2">
                  <span>Variation de redevance</span>
                  <NumInput value={st.feeDelta} onChange={(e) => setSt((s) => ({ ...s, feeDelta: e.target.value }))} placeholder="0" suffix="€/mois" />
                </label>
                <label className="grid grid-cols-[1fr_140px] items-center gap-2">
                  <span>Taux sur l&apos;AEN</span>
                  <NumInput value={st.taxRate} onChange={(e) => setSt((s) => ({ ...s, taxRate: e.target.value }))} placeholder={fmtNum(baseCtx.defaultBenefitTaxRate)} suffix="%" />
                </label>
              </div>
            )}
            {hasBought && (
              <div>
                <div className="text-xs font-semibold text-ink-2 mb-2">Véhicules achetés</div>
                <label className="grid grid-cols-[1fr_140px] items-center gap-2">
                  <span>Durée de détention</span>
                  <NumInput value={st.holding} onChange={(e) => setSt((s) => ({ ...s, holding: e.target.value }))} placeholder="actuelle" suffix="ans" />
                </label>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-ink-2 mb-2">Calcul</div>
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={method} onChange={(e) => setMethod(e.target.value as CostMethod)}>
                  {(["ECONOMIC", "CASH"] as const).map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </select>
                <select className="input" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
                  {Array.from(new Set([...STANDARD_HORIZONS, baseCtx.horizonYears])).sort((a, b) => a - b).map((h) => <option key={h} value={h}>{h} an{h > 1 ? "s" : ""}</option>)}
                </select>
              </div>
            </div>
            <div className="border-t border-line pt-3">
              <div className="text-xs font-semibold text-ink-2 mb-2">Hypothèses enregistrées</div>
              <div className="flex gap-2">
                <input className="input" placeholder="Nom de la simulation" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
                <button className="btn" disabled={!active || !saveName.trim() || pending} onClick={() => start(async () => { const r = await saveSimulation(saveName, adjustments); if (r.ok) { setSaveName(""); router.refresh(); } })}>Enregistrer</button>
              </div>
              <ul className="mt-2 space-y-1">
                {saved.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <button className="text-accent hover:underline text-left truncate" onClick={() => { try { setSt(fromAdjustments(JSON.parse(s.params))); } catch { /* JSON invalide ignoré */ } }}>{s.name}</button>
                    <button className="btn btn-sm btn-danger" aria-label={`Supprimer ${s.name}`} disabled={pending} onClick={() => start(async () => { await deleteSimulation(s.id); router.refresh(); })}>✕</button>
                  </li>
                ))}
                {saved.length === 0 && <li className="text-xs text-muted">Aucune.</li>}
              </ul>
            </div>
          </div>
        </Card>

        <div className="space-y-4 min-w-0">
          <Card title={active ? "Résultat de la simulation" : "Résultats actuels (aucune hypothèse modifiée)"}>
            {rows.length === 0 ? <p className="text-sm text-muted">Sélectionnez au moins un scénario.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm tnum min-w-[560px]">
                  <thead className="text-xs text-muted">
                    <tr className="border-b border-line">
                      <th className="py-2 text-left font-medium">Scénario</th>
                      <th className="py-2 px-2 text-right font-medium">Actuel /mois</th>
                      <th className="py-2 px-2 text-right font-medium">Simulé /mois</th>
                      <th className="py-2 px-2 text-right font-medium">Écart /an</th>
                      <th className="py-2 px-2 text-right font-medium">Simulé {horizon} ans</th>
                      <th className="py-2 px-2 text-right font-medium">vs {refRow?.s.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ s, base, sim }, i) => {
                      const d = sim.totals.annual - base.totals.annual;
                      const vsRef = refRow ? (refRow.sim.totals.monthly - sim.totals.monthly) : 0;
                      return (
                        <tr key={s.id} className="border-b border-line last:border-0">
                          <td className="py-2"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: seriesColor(s.color, i) }} />{s.name}{cheapestSim?.s.id === s.id && rows.length > 1 && <span className="text-xs text-good font-semibold">le moins cher</span>}</span></td>
                          <td className="py-2 px-2 text-right">{fmtEur(base.totals.monthly, 0)}</td>
                          <td className="py-2 px-2 text-right font-semibold">{fmtEur(sim.totals.monthly, 0)}</td>
                          <td className={`py-2 text-right ${d > 0.5 ? "text-bad" : d < -0.5 ? "text-good" : "text-muted"}`}>{Math.abs(d) < 0.5 ? "=" : `${d > 0 ? "+" : "−"}${fmtEur(Math.abs(d), 0)}`}</td>
                          <td className="py-2 px-2 text-right">{fmtEur(sim.totals.horizon, 0)}</td>
                          <td className={`py-2 text-right ${s.id === refRow?.s.id ? "text-muted" : vsRef > 0.5 ? "text-good" : vsRef < -0.5 ? "text-bad" : ""}`}>
                            {s.id === refRow?.s.id ? "réf." : `${vsRef > 0.5 ? "−" : vsRef < -0.5 ? "+" : ""}${fmtEur(Math.abs(vsRef), 0)}/mois`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length > 0 && active && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-ink-2">Détail par véhicule</summary>
                <table className="mt-2 w-full text-sm tnum">
                  <tbody>
                    {rows.flatMap(({ s, base, sim }) =>
                      sim.vehicles.map((v, k) => (
                        <tr key={`${s.id}-${v.vehicleId}`} className="border-b border-line last:border-0">
                          <td className="py-1.5 text-ink-2">{s.name}</td>
                          <td className="py-1.5">{v.name} <span className="text-xs text-muted">{fmtKm(Math.round(v.annualKm))}</span></td>
                          <td className="py-1.5 text-right">{fmtEur(base.vehicles[k].totals.monthly, 0)} → <b>{fmtEur(v.totals.monthly, 0)}</b>/mois</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </details>
            )}
          </Card>

          <Card title="Sensibilité au prix de l'énergie" actions={
            <select className="input !w-auto !py-1" value={sensCode} onChange={(e) => { setSensCode(e.target.value); setRange({ min: "", max: "" }); }}>
              {energies.map((e) => <option key={e.code} value={e.code}>{e.label}</option>)}
            </select>
          }>
            {sens && sensEnergy && rows.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-3 mb-3 text-sm items-center">
                  <span className="text-ink-2">Plage de prix</span>
                  <div className="w-32"><NumInput value={range.min} onChange={(e) => setRange((r) => ({ ...r, min: e.target.value }))} placeholder={fmtNum(sens.prices[0], 3)} suffix={`€/${sensEnergy.unit}`} /></div>
                  <span>à</span>
                  <div className="w-32"><NumInput value={range.max} onChange={(e) => setRange((r) => ({ ...r, max: e.target.value }))} placeholder={fmtNum(sens.prices[sens.prices.length - 1], 3)} suffix={`€/${sensEnergy.unit}`} /></div>
                  <span className="text-xs text-muted">prix actuel : {fmtEur(sensCurrent, 3)}</span>
                </div>
                <div className="text-xs text-ink-2 mb-1">Coût annuel {sensEnergy.label.toLowerCase()} (part foyer) selon le prix</div>
                <SensitivityChart points={sens.points} series={sens.series} unit={sensEnergy.unit} current={sensCurrent} />
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-sm tnum min-w-[480px]">
                    <thead className="text-xs text-muted">
                      <tr className="border-b border-line">
                        <th className="py-1.5 text-left font-medium">Prix {sensEnergy.label.toLowerCase()}</th>
                        {sens.prices.map((p) => <th key={p} className="py-1.5 px-2 text-right font-medium">{fmtNum(p, 3)} €/{sensEnergy.unit}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {sens.energyOnly.map(({ s, values }) => (
                        <tr key={s.id} className="border-b border-line last:border-0">
                          <td className="py-1.5">{s.name}<div className="text-xs text-muted">{sensEnergy.label} / total annuel</div></td>
                          {values.map((v) => (
                            <td key={v.price} className="py-1.5 px-2 text-right">
                              {fmtEur(v.codeAnnual, 0)}
                              <div className="text-xs text-muted">{fmtEur(v.totalAnnual, 0)}</div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted mt-2">Le prix testé remplace tous les autres prix de cette énergie (paramètres, véhicule, scénario). La part prise en charge par l&apos;employeur est déduite.</p>
              </>
            ) : <p className="text-sm text-muted">Sélectionnez un scénario.</p>}
          </Card>

          <Warnings items={rows.flatMap((r) => r.sim.warnings.map((w) => `${r.s.name} — ${w}`))} />
        </div>
      </div>
    </div>
  );
}
