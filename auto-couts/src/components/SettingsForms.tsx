"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EnergyType, Settings } from "@prisma/client";
import { importData, resetDemoData, saveEnergyTypes, saveSettings } from "@/app/actions";
import { METHOD_DESCRIPTIONS, METHOD_LABELS, type CostMethod } from "@/lib/domain";
import { Field, NumInput } from "./VehicleForm";
import { Card } from "./ui";

const toNum = (s: string) => {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  return t === "" ? NaN : Number(t);
};

type Row = { id?: number; code: string; label: string; unit: string; price: string; isElectric: boolean; key: string };
let seq = 0;

export function EnergyPricesForm({ energies, usedCodes }: { energies: EnergyType[]; usedCodes: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<Row[]>(energies.map((e) => ({ id: e.id, code: e.code, label: e.label, unit: e.unit, price: String(e.price).replace(".", ","), isElectric: e.isElectric, key: `e${e.id}` })));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const upd = (key: string, patch: Partial<Row>) => { setSaved(false); setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r))); };

  const submit = () =>
    start(async () => {
      const r = await saveEnergyTypes(rows.map(({ key, price, ...rest }) => ({ ...rest, price: toNum(price) })));
      if (r.ok) { setErrors({}); setSaved(true); router.refresh(); } else setErrors(r.errors);
    });

  return (
    <Card title="Prix des énergies" actions={saved ? <span className="text-xs text-good">Enregistré ✓</span> : null}>
      <p className="text-xs text-ink-2 mb-3">Prix utilisés par défaut dans tous les calculs. Surchargeables par véhicule, par scénario ou en simulation.</p>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const locked = !!r.id && (usedCodes.includes(r.code) || r.code === "ELECTRICITY");
          return (
            <div key={r.key} className="grid grid-cols-2 sm:grid-cols-[1fr_120px_80px_150px_auto] gap-2 items-start">
              <div>
                <input className="input" value={r.label} onChange={(e) => upd(r.key, { label: e.target.value })} aria-label="Libellé" aria-invalid={!!errors[`${i}.label`]} />
                {errors[`${i}.label`] && <div className="text-xs text-bad">{errors[`${i}.label`]}</div>}
              </div>
              <div>
                <input className="input font-mono text-xs" value={r.code} disabled={locked} title={locked ? "Code utilisé par des véhicules : non modifiable" : "Code technique"} onChange={(e) => upd(r.key, { code: e.target.value.toUpperCase() })} aria-label="Code" aria-invalid={!!errors[`${i}.code`]} />
                {errors[`${i}.code`] && <div className="text-xs text-bad">{errors[`${i}.code`]}</div>}
              </div>
              <input className="input" value={r.unit} onChange={(e) => upd(r.key, { unit: e.target.value })} aria-label="Unité" disabled={r.code === "ELECTRICITY"} />
              <div>
                <NumInput value={r.price} onChange={(e) => upd(r.key, { price: e.target.value })} suffix={`€/${r.unit || "u"}`} invalid={!!errors[`${i}.price`]} />
                {errors[`${i}.price`] && <div className="text-xs text-bad">{errors[`${i}.price`]}</div>}
              </div>
              <button type="button" className="btn btn-sm btn-danger self-center" disabled={locked} title={locked ? "Utilisé par au moins un véhicule" : "Supprimer"} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>✕</button>
            </div>
          );
        })}
      </div>
      {errors._ && <p className="text-sm text-bad mt-2">{errors._}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" onClick={() => setRows((rs) => [...rs, { code: "", label: "", unit: "L", price: "", isElectric: false, key: `n${++seq}` }])}>+ Ajouter une énergie</button>
        <button type="button" className="btn btn-primary btn-sm ml-auto" disabled={pending} onClick={submit}>{pending ? "…" : "Enregistrer les prix"}</button>
      </div>
    </Card>
  );
}

export function GeneralSettingsForm({ settings, scenarios }: { settings: Settings; scenarios: { id: number; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rate, setRate] = useState(String(settings.defaultBenefitTaxRate).replace(".", ","));
  const [horizon, setHorizon] = useState(String(settings.defaultHorizonYears));
  const [method, setMethod] = useState<CostMethod>(settings.costMethod as CostMethod);
  const [ref, setRef] = useState<number | null>(settings.referenceScenarioId ?? scenarios[0]?.id ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const submit = () =>
    start(async () => {
      const r = await saveSettings({ defaultBenefitTaxRate: toNum(rate), defaultHorizonYears: toNum(horizon), costMethod: method, referenceScenarioId: ref });
      if (r.ok) { setErrors({}); setSaved(true); router.refresh(); } else setErrors(r.errors);
    });

  return (
    <Card title="Paramètres de calcul" actions={saved ? <span className="text-xs text-good">Enregistré ✓</span> : null}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Scénario de référence (situation actuelle)">
          <select className="input" value={ref ?? ""} onChange={(e) => { setSaved(false); setRef(e.target.value ? Number(e.target.value) : null); }}>
            {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Horizon par défaut" error={errors.defaultHorizonYears}>
          <NumInput value={horizon} onChange={(e) => { setSaved(false); setHorizon(e.target.value); }} suffix="ans" invalid={!!errors.defaultHorizonYears} />
        </Field>
        <Field label="Taux appliqué à l'avantage en nature" hint="Taux marginal d'imposition + prélèvements sociaux sur l'AEN (ex : 30 % + 11,2 %)" error={errors.defaultBenefitTaxRate}>
          <NumInput value={rate} onChange={(e) => { setSaved(false); setRate(e.target.value); }} suffix="%" invalid={!!errors.defaultBenefitTaxRate} />
        </Field>
        <Field label="Méthode de coût par défaut" hint={METHOD_DESCRIPTIONS[method]}>
          <select className="input" value={method} onChange={(e) => { setSaved(false); setMethod(e.target.value as CostMethod); }}>
            {(["ECONOMIC", "CASH"] as const).map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={submit}>{pending ? "…" : "Enregistrer"}</button>
      </div>
    </Card>
  );
}

export function BackupCard() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    if (!confirm("L'import REMPLACE toutes les données actuelles (véhicules, scénarios, prix). Continuer ?")) return;
    start(async () => {
      const r = await importData(text);
      setMsg(r.ok ? { ok: true, text: `Import réussi : ${r.data!.vehicles} véhicules, ${r.data!.scenarios} scénarios.` } : { ok: false, text: r.errors._ ?? "Import refusé." });
      if (file.current) file.current.value = "";
      router.refresh();
    });
  };

  return (
    <Card title="Sauvegarde, import et export">
      <div className="flex flex-wrap gap-2">
        <a className="btn" href="/api/export?format=json" download>Exporter (JSON complet)</a>
        <a className="btn" href="/api/export?format=csv" download>Véhicules (CSV)</a>
        <a className="btn" href="/api/export?format=csv-scenarios" download>Scénarios (CSV)</a>
        <label className="btn cursor-pointer">
          Importer un JSON…
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <button
          className="btn btn-danger"
          disabled={pending}
          onClick={() => { if (confirm("Remplacer toutes les données par les données de démonstration ?")) start(async () => { await resetDemoData(); setMsg({ ok: true, text: "Données de démonstration rechargées." }); router.refresh(); }); }}
        >
          Recharger la démo
        </button>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>}
      <p className="mt-3 text-xs text-muted">Les données sont stockées localement dans <code>prisma/auto-couts.db</code> (SQLite). Le JSON exporté peut être réimporté sur un autre poste. CSV : séparateur « ; », compatible Excel.</p>
    </Card>
  );
}
