"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EnergyType } from "@prisma/client";
import { saveScenario } from "@/app/actions";
import { calculateScenarioCost } from "@/lib/calc/engine";
import type { CalcContext, VehicleInput } from "@/lib/calc/types";
import { SERIES_HEX, seriesColor } from "@/lib/colors";
import { CATEGORY_LABELS, POWERTRAIN_LABELS } from "@/lib/domain";
import { fmtEur, fmtKm } from "@/lib/format";
import { fieldErrors, scenarioSchema } from "@/lib/validation";
import { Field, NumInput } from "./VehicleForm";
import { Warnings } from "./ui";

export interface ScenarioFormInitial {
  name: string;
  description: string;
  color: string;
  adults: number;
  children: number;
  needsTwoCarsSimultaneously: boolean;
  vehicles: { vehicleId: number; annualKmOverride: number | null }[];
  priceOverrides: { energyCode: string; price: number }[];
}

const toNum = (s: string): number | null => {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export function ScenarioForm({
  id,
  initial,
  vehicles,
  energies,
  ctx,
  usedColors = [],
}: {
  usedColors?: string[];
  id: number | null;
  initial?: ScenarioFormInitial;
  vehicles: VehicleInput[];
  energies: EnergyType[];
  ctx: Omit<CalcContext, "scenarioPriceOverrides" | "scenarioAnnualKm">;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? SERIES_HEX.find((h) => !usedColors.includes(h)) ?? SERIES_HEX[0]);
  const [adults, setAdults] = useState(String(initial?.adults ?? 2));
  const [children, setChildren] = useState(String(initial?.children ?? 0));
  const [needsTwo, setNeedsTwo] = useState(initial?.needsTwoCarsSimultaneously ?? false);
  const [selected, setSelected] = useState<number[]>(initial?.vehicles.map((v) => v.vehicleId) ?? []);
  const [kmOverrides, setKmOverrides] = useState<Record<number, string>>(
    Object.fromEntries((initial?.vehicles ?? []).map((v) => [v.vehicleId, v.annualKmOverride != null ? String(v.annualKmOverride) : ""])),
  );
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries((initial?.priceOverrides ?? []).map((p) => [p.energyCode, String(p.price).replace(".", ",")])),
  );
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const payload = useMemo(
    () => ({
      name,
      description,
      color,
      adults: toNum(adults),
      children: toNum(children),
      needsTwoCarsSimultaneously: needsTwo,
      vehicles: selected.map((vid) => ({ vehicleId: vid, annualKmOverride: toNum(kmOverrides[vid] ?? "") })),
      priceOverrides: Object.entries(prices)
        .filter(([, v]) => v.trim() !== "")
        .map(([energyCode, v]) => ({ energyCode, price: toNum(v) })),
    }),
    [name, description, color, adults, children, needsTwo, selected, kmOverrides, prices],
  );
  const validation = useMemo(() => scenarioSchema.safeParse(payload), [payload]);
  const errors = { ...(submitted && !validation.success ? fieldErrors(validation.error) : {}), ...serverErrors };

  const preview = useMemo(() => {
    const ok = (n: number | null) => (n !== null && Number.isFinite(n) ? n : null);
    return calculateScenarioCost(
      {
        id: id ?? -1,
        name: name || "Scénario",
        vehicleIds: selected,
        annualKmOverrides: Object.fromEntries(selected.map((vid) => [vid, ok(toNum(kmOverrides[vid] ?? ""))])),
        priceOverrides: Object.fromEntries(payload.priceOverrides.filter((p) => ok(p.price) !== null).map((p) => [p.energyCode, p.price as number])),
        needsTwoCarsSimultaneously: needsTwo,
      },
      vehicles,
      ctx,
    );
  }, [id, name, selected, kmOverrides, payload.priceOverrides, needsTwo, vehicles, ctx]);

  const toggle = (vid: number) => setSelected((s) => (s.includes(vid) ? s.filter((x) => x !== vid) : [...s, vid]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerErrors({});
    if (!validation.success) return;
    start(async () => {
      const r = await saveScenario(id, payload);
      if (r.ok) router.push(`/scenarios/${r.data!.id}`);
      else setServerErrors(r.errors);
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
      <div className="space-y-5 min-w-0">
        <fieldset className="rounded-xl border border-line bg-surface p-4 md:p-5 space-y-3">
          <div className="text-sm font-semibold">Scénario</div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <Field label="Nom *" error={errors.name}>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex : Fonction + électrique d'occasion" aria-invalid={!!errors.name} autoFocus={!id} />
            </Field>
            <div>
              <span className="block text-xs font-medium text-ink-2 mb-1">Couleur</span>
              <div className="flex gap-1.5 py-1.5" role="radiogroup" aria-label="Couleur">
                {SERIES_HEX.map((h) => (
                  <button key={h} type="button" role="radio" aria-checked={color === h} aria-label={h} onClick={() => setColor(h)} className={`h-6 w-6 rounded-full ${color === h ? "ring-2 ring-offset-2 ring-accent ring-offset-[var(--surface)]" : ""}`} style={{ background: seriesColor(h) }} />
                ))}
              </div>
            </div>
          </div>
          <Field label="Description">
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </fieldset>

        <fieldset className="rounded-xl border border-line bg-surface p-4 md:p-5">
          <div className="text-sm font-semibold">Véhicules du scénario</div>
          <div className="text-xs text-ink-2 mb-3">Un même véhicule peut appartenir à plusieurs scénarios. Le kilométrage peut être adapté au scénario (ex : la nouvelle voiture reprend les trajets de l&apos;ancienne).</div>
          {vehicles.length === 0 && <p className="text-sm text-muted">Aucun véhicule enregistré.</p>}
          <div className="space-y-2">
            {vehicles.map((v) => {
              const on = selected.includes(v.id);
              const r = preview.vehicles.find((x) => x.vehicleId === v.id);
              return (
                <div key={v.id} className={`rounded-lg border p-3 ${on ? "border-accent bg-accent/5" : "border-line"}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex flex-1 min-w-48 items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={on} onChange={() => toggle(v.id)} className="h-4 w-4" />
                      <span>
                        <span className="font-medium text-sm">{v.name}</span>
                        <span className="block text-xs text-muted">{CATEGORY_LABELS[v.category]} · {POWERTRAIN_LABELS[v.powertrain]} · {fmtKm(v.annualKm)}/an</span>
                      </span>
                    </label>
                    {on && (
                      <>
                        <div className="w-40">
                          <NumInput value={kmOverrides[v.id] ?? ""} onChange={(e) => setKmOverrides((s) => ({ ...s, [v.id]: e.target.value }))} suffix="km/an" placeholder={String(v.annualKm)} />
                        </div>
                        <div className="w-24 text-right text-sm font-semibold tnum">{r ? `${fmtEur(r.totals.monthly, 0)}/m` : ""}</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {Object.entries(errors).filter(([k]) => k.startsWith("vehicles")).map(([k, m]) => <p key={k} className="text-xs text-bad mt-1">{m}</p>)}
        </fieldset>

        <fieldset className="rounded-xl border border-line bg-surface p-4 md:p-5">
          <div className="text-sm font-semibold">Prix de l&apos;énergie propres au scénario</div>
          <div className="text-xs text-ink-2 mb-3">Laisser vide pour utiliser le prix des paramètres (ex : recharge à domicile en heures creuses).</div>
          <div className="grid sm:grid-cols-3 gap-3">
            {energies.map((e, i) => (
              <Field key={e.code} label={e.label} hint={`global : ${fmtEur(e.price, 3)}/${e.unit}`} error={errors[`priceOverrides.${payload.priceOverrides.findIndex((p) => p.energyCode === e.code)}.price`]}>
                <NumInput value={prices[e.code] ?? ""} onChange={(ev) => setPrices((s) => ({ ...s, [e.code]: ev.target.value }))} suffix={`€/${e.unit}`} />
              </Field>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-line bg-surface p-4 md:p-5">
          <div className="text-sm font-semibold mb-3">Configuration familiale</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <Field label="Adultes" error={errors.adults}><NumInput value={adults} onChange={(e) => setAdults(e.target.value)} invalid={!!errors.adults} /></Field>
            <Field label="Enfants" error={errors.children}><NumInput value={children} onChange={(e) => setChildren(e.target.value)} invalid={!!errors.children} /></Field>
            <label className="col-span-2 flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" checked={needsTwo} onChange={(e) => setNeedsTwo(e.target.checked)} /> Besoin de deux véhicules simultanément
            </label>
          </div>
          <p className="text-xs text-muted mt-2">Informatif en V1 : un avertissement est affiché si la contrainte n&apos;est pas respectée.</p>
        </fieldset>

        {errors._ && <p className="text-sm text-bad">{errors._}</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Créer le scénario"}</button>
          <button type="button" className="btn" onClick={() => router.back()}>Annuler</button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="text-sm font-semibold">Aperçu</div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-xs text-ink-2">par mois</div><div className="text-xl font-semibold tnum">{fmtEur(preview.totals.monthly, 0)}</div></div>
          <div><div className="text-xs text-ink-2">par an</div><div className="text-xl font-semibold tnum">{fmtEur(preview.totals.annual, 0)}</div></div>
          <div><div className="text-xs text-ink-2">sur {ctx.horizonYears} ans</div><div className="font-semibold tnum">{fmtEur(preview.totals.horizon, 0)}</div></div>
          <div><div className="text-xs text-ink-2">par km</div><div className="font-semibold tnum">{preview.totals.perKm !== null ? fmtEur(preview.totals.perKm, 3) : "—"}</div></div>
        </div>
        <div className="text-xs text-muted">{fmtKm(Math.round(preview.totalKm))}/an au total</div>
        <Warnings items={preview.warnings} />
      </aside>
    </form>
  );
}
