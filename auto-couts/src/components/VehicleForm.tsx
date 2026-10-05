"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EnergyType } from "@prisma/client";
import { saveVehicle } from "@/app/actions";
import { calculateVehicleCost } from "@/lib/calc/engine";
import { annuityPayment } from "@/lib/calc/finance";
import type { CalcContext, VehicleInput } from "@/lib/calc/types";
import {
  CATEGORY_LABELS,
  COST_CATEGORIES,
  COST_CATEGORY_META,
  COST_FREQUENCIES,
  DEFAULT_FUEL_BY_POWERTRAIN,
  ELECTRICITY,
  FREQUENCY_LABELS,
  POWERTRAINS,
  POWERTRAIN_LABELS,
  VEHICLE_CATEGORIES,
  powertrainUses,
  type CostCategory,
  type CostFrequency,
  type Powertrain,
  type VehicleCategory,
} from "@/lib/domain";
import { fmtEur, fmtKm, fmtNum } from "@/lib/format";
import { fieldErrors, vehicleSchema } from "@/lib/validation";
import { CalcDetail } from "./CalcDetail";

/** Champs numériques du formulaire (saisis en texte, convertis à l'envoi). */
const NUM_FIELDS = [
  "year", "fuelConsumption", "fuelConsumptionReal", "fuelPriceOverride", "elecConsumption", "elecConsumptionReal",
  "elecPriceOverride", "electricKmShare", "currentMileage", "annualKm", "proKm", "persoKm", "companyMonthlyFee",
  "employeeExtraContribution", "employerMonthlyCost", "benefitInKindMonthly", "benefitTaxRate", "taxCostMonthlyOverride",
  "employerEnergySharePct", "purchasePrice", "mileageAtPurchase", "downPayment", "financedAmount", "loanMonths",
  "loanRatePct", "monthlyPayment", "residualValue", "holdingYears",
] as const;
type NumField = (typeof NUM_FIELDS)[number];
const COMPANY_FIELDS = ["companyMonthlyFee", "employeeExtraContribution", "employerMonthlyCost", "benefitInKindMonthly", "benefitTaxRate", "taxCostMonthlyOverride", "employerEnergySharePct"] as const;
const PURCHASE_FIELDS = ["purchasePrice", "mileageAtPurchase", "downPayment", "financedAmount", "loanMonths", "loanRatePct", "monthlyPayment", "residualValue", "holdingYears"] as const;
const FUEL_FIELDS = ["fuelConsumption", "fuelConsumptionReal", "fuelPriceOverride"] as const;
const ELEC_FIELDS = ["elecConsumption", "elecConsumptionReal", "elecPriceOverride", "electricKmShare"] as const;
const TEXT_FIELDS = ["name", "brand", "model", "version", "plate", "photoUrl", "notes"] as const;
type TextField = (typeof TEXT_FIELDS)[number];

interface LineState {
  key: string;
  label: string;
  category: CostCategory;
  frequency: CostFrequency;
  amount: string;
  isEstimate: boolean;
}

export interface VehicleFormInitial {
  [k: string]: unknown;
  category?: string;
  powertrain?: string;
  fuelEnergyCode?: string | null;
  costLines?: { label: string; category: string; frequency: string; amount: number; isEstimate: boolean }[];
}

const toNum = (s: string): number | null => {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

let keySeq = 0;
const newKey = () => `l${++keySeq}`;

export function VehicleForm({
  id,
  initial,
  energies,
  ctx,
}: {
  id: number | null;
  initial?: VehicleFormInitial;
  energies: EnergyType[];
  ctx: Omit<CalcContext, "scenarioPriceOverrides" | "scenarioAnnualKm">;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<VehicleCategory>((initial?.category as VehicleCategory) ?? "COMPANY");
  const [powertrain, setPowertrain] = useState<Powertrain>((initial?.powertrain as Powertrain) ?? "GASOLINE");
  const [fuelCode, setFuelCode] = useState<string>(initial?.fuelEnergyCode ?? DEFAULT_FUEL_BY_POWERTRAIN[(initial?.powertrain as Powertrain) ?? "GASOLINE"] ?? "");
  const [f, setF] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const k of [...NUM_FIELDS, ...TEXT_FIELDS]) {
      const v = initial?.[k];
      o[k] = v === null || v === undefined ? "" : String(v).replace(".", NUM_FIELDS.includes(k as NumField) ? "," : ".");
    }
    if (!initial) o.annualKm = "15000";
    return o;
  });
  const [lines, setLines] = useState<LineState[]>(() =>
    (initial?.costLines ?? []).map((l) => ({
      key: newKey(),
      label: l.label,
      category: l.category as CostCategory,
      frequency: l.frequency as CostFrequency,
      amount: String(l.amount).replace(".", ","),
      isEstimate: l.isEstimate,
    })),
  );
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const set = (k: NumField | TextField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const uses = powertrainUses(powertrain);
  const fuelEnergies = energies.filter((e) => (powertrain === "OTHER" ? true : !e.isElectric));
  const priceOf = (code: string) => energies.find((e) => e.code === code);

  /** Données envoyées (identiques pour la validation client, le serveur et l'aperçu). */
  const payload = useMemo(() => {
    const p: Record<string, unknown> = { category, powertrain, fuelEnergyCode: uses.fuel ? fuelCode || null : null };
    for (const k of TEXT_FIELDS) p[k] = f[k];
    for (const k of NUM_FIELDS) p[k] = toNum(f[k]);
    // Champs masqués pour la catégorie / motorisation choisie : ignorés
    const hidden: readonly string[] = [
      ...(category === "COMPANY" ? PURCHASE_FIELDS : COMPANY_FIELDS),
      ...(uses.fuel ? [] : FUEL_FIELDS),
      ...(uses.electric ? [] : ELEC_FIELDS),
      ...(powertrain === "PHEV" ? [] : ["electricKmShare"]),
      ...(category === "USED" ? [] : ["mileageAtPurchase"]),
    ];
    for (const k of hidden) p[k] = null;
    p.costLines = lines.map((l) => ({ label: l.label, category: l.category, frequency: l.frequency, amount: toNum(l.amount), isEstimate: l.isEstimate }));
    return p;
  }, [category, powertrain, fuelCode, f, lines, uses.fuel]);

  const validation = useMemo(() => vehicleSchema.safeParse(payload), [payload]);
  const errors = { ...(submitted && !validation.success ? fieldErrors(validation.error) : {}), ...serverErrors };
  // Les erreurs de type (NaN) sont affichées même avant envoi
  const nanErrors = Object.fromEntries(NUM_FIELDS.filter((k) => Number.isNaN(payload[k] as number)).map((k) => [k, "Nombre invalide"]));
  const err = (k: string) => nanErrors[k] ?? errors[k];

  // Aperçu en direct : calcul sur les données saisies (même partielles)
  const preview = useMemo(() => {
    const num = (k: NumField) => {
      const v = payload[k] as number | null;
      return v === null || Number.isNaN(v) ? null : v;
    };
    const input: VehicleInput = {
      id: id ?? -1,
      name: f.name || "Nouveau véhicule",
      category,
      powertrain,
      fuelEnergyCode: uses.fuel ? fuelCode || null : null,
      ...Object.fromEntries(NUM_FIELDS.map((k) => [k, num(k)])),
      annualKm: Math.max(0, num("annualKm") ?? 0),
      costLines: lines
        .map((l) => ({ label: l.label, category: l.category, frequency: l.frequency, amount: toNum(l.amount) ?? 0, isEstimate: l.isEstimate }))
        .filter((l) => Number.isFinite(l.amount)),
    } as VehicleInput;
    try {
      return calculateVehicleCost(input, ctx);
    } catch {
      return null;
    }
  }, [payload, category, powertrain, fuelCode, lines, f.name, id, ctx, uses.fuel]);

  const onPowertrain = (p: Powertrain) => {
    setPowertrain(p);
    const def = DEFAULT_FUEL_BY_POWERTRAIN[p];
    if (def) setFuelCode(def);
    else if (p === "OTHER") setFuelCode("");
  };

  const addLine = (category: CostCategory) =>
    setLines((ls) => [...ls, { key: newKey(), label: COST_CATEGORY_META[category].label, category, frequency: COST_CATEGORY_META[category].defaultFrequency, amount: "", isEstimate: false }]);
  const updLine = (key: string, patch: Partial<LineState>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    const url = await resizeImage(file, 640);
    setF((s) => ({ ...s, photoUrl: url }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerErrors({});
    if (!validation.success || Object.keys(nanErrors).length) {
      document.querySelector("[aria-invalid=true]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    startTransition(async () => {
      const r = await saveVehicle(id, payload);
      if (r.ok) router.push(`/vehicules/${r.data!.id}`);
      else setServerErrors(r.errors);
    });
  };

  // Valeurs indicatives (placeholders)
  const price = toNum(f.purchasePrice);
  const down = toNum(f.downPayment) ?? 0;
  const financedHint = price && price > down ? price - down : null;
  const financed = toNum(f.financedAmount) ?? financedHint;
  const months = toNum(f.loanMonths);
  const rate = toNum(f.loanRatePct);
  const paymentHint = financed && months && months > 0 && rate !== null && !Number.isNaN(rate) ? annuityPayment(financed, rate, months) : null;
  const km = toNum(f.annualKm) ?? 0;
  const share = toNum(f.electricKmShare);

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start" noValidate>
      <div className="space-y-5 min-w-0">
        <Section title="Type de véhicule">
          <Segmented options={VEHICLE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))} value={category} onChange={(v) => setCategory(v as VehicleCategory)} />
          <div className="mt-4">
            <div className="text-xs font-medium text-ink-2 mb-1.5">Motorisation</div>
            <Segmented options={POWERTRAINS.map((p) => ({ value: p, label: POWERTRAIN_LABELS[p] }))} value={powertrain} onChange={(v) => onPowertrain(v as Powertrain)} wrap />
          </div>
        </Section>

        <Section title="Identification">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nom du véhicule *" error={err("name")} className="sm:col-span-2">
              <input className="input" value={f.name} onChange={set("name")} placeholder="ex : Voiture de Marie" aria-invalid={!!err("name")} autoFocus={!id} />
            </Field>
            <Field label="Marque"><input className="input" value={f.brand} onChange={set("brand")} placeholder="Peugeot" /></Field>
            <Field label="Modèle"><input className="input" value={f.model} onChange={set("model")} placeholder="308" /></Field>
            <Field label="Version / finition"><input className="input" value={f.version} onChange={set("version")} placeholder="Allure PureTech 130" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Année" error={err("year")}><NumInput value={f.year} onChange={set("year")} invalid={!!err("year")} placeholder="2024" /></Field>
              <Field label="Immatriculation"><input className="input" value={f.plate} onChange={set("plate")} placeholder="AB-123-CD" /></Field>
            </div>
          </div>
          <details className="mt-3 text-sm" open={!!f.photoUrl || !!f.notes}>
            <summary className="cursor-pointer text-ink-2">Photo et notes (optionnel)</summary>
            <div className="mt-3 grid sm:grid-cols-[120px_1fr] gap-3 items-start">
              <div className="h-24 w-full rounded-lg bg-surface-2 overflow-hidden flex items-center justify-center text-xs text-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {f.photoUrl ? <img src={f.photoUrl} alt="" className="h-full w-full object-cover" /> : "Aucune photo"}
              </div>
              <div className="space-y-2">
                <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} className="text-sm" />
                {f.photoUrl && <button type="button" className="btn btn-sm" onClick={() => setF((s) => ({ ...s, photoUrl: "" }))}>Retirer la photo</button>}
                <textarea className="input" rows={2} value={f.notes} onChange={set("notes")} placeholder="Notes" />
              </div>
            </div>
          </details>
        </Section>

        <Section title="Énergie et consommation" subtitle="La consommation réelle, si renseignée, est prioritaire sur la valeur constructeur.">
          {uses.fuel && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Énergie (carburant)" error={err("fuelEnergyCode")}>
                <select className="input" value={fuelCode} onChange={(e) => setFuelCode(e.target.value)} aria-invalid={!!err("fuelEnergyCode")}>
                  <option value="">— choisir —</option>
                  {fuelEnergies.map((e) => (
                    <option key={e.code} value={e.code}>{e.label} ({fmtEur(e.price, 3)}/{e.unit})</option>
                  ))}
                </select>
              </Field>
              <Field label="Prix spécifique à ce véhicule" hint={`Vide = prix global ${priceOf(fuelCode) ? fmtEur(priceOf(fuelCode)!.price, 3) : ""}`} error={err("fuelPriceOverride")}>
                <NumInput value={f.fuelPriceOverride} onChange={set("fuelPriceOverride")} suffix={`€/${priceOf(fuelCode)?.unit ?? "L"}`} invalid={!!err("fuelPriceOverride")} />
              </Field>
              <Field label="Consommation constructeur" error={err("fuelConsumption")}>
                <NumInput value={f.fuelConsumption} onChange={set("fuelConsumption")} suffix={`${priceOf(fuelCode)?.unit ?? "L"}/100 km`} invalid={!!err("fuelConsumption")} placeholder="6,5" />
              </Field>
              <Field label="Consommation réelle" error={err("fuelConsumptionReal")} hint="optionnelle">
                <NumInput value={f.fuelConsumptionReal} onChange={set("fuelConsumptionReal")} suffix={`${priceOf(fuelCode)?.unit ?? "L"}/100 km`} invalid={!!err("fuelConsumptionReal")} />
              </Field>
            </div>
          )}
          {uses.electric && (
            <div className={`grid sm:grid-cols-2 gap-3 ${uses.fuel ? "mt-4 pt-4 border-t border-line" : ""}`}>
              <Field label="Consommation électrique constructeur" error={err("elecConsumption")}>
                <NumInput value={f.elecConsumption} onChange={set("elecConsumption")} suffix="kWh/100 km" invalid={!!err("elecConsumption")} placeholder="17" />
              </Field>
              <Field label="Consommation électrique réelle" error={err("elecConsumptionReal")} hint="optionnelle (pertes de recharge incluses)">
                <NumInput value={f.elecConsumptionReal} onChange={set("elecConsumptionReal")} suffix="kWh/100 km" invalid={!!err("elecConsumptionReal")} />
              </Field>
              <Field label="Prix du kWh pour ce véhicule" hint={`Vide = prix global ${priceOf(ELECTRICITY) ? fmtEur(priceOf(ELECTRICITY)!.price, 3) : ""}`} error={err("elecPriceOverride")}>
                <NumInput value={f.elecPriceOverride} onChange={set("elecPriceOverride")} suffix="€/kWh" invalid={!!err("elecPriceOverride")} />
              </Field>
              {powertrain === "PHEV" && (
                <Field
                  label="Part des km en électrique"
                  error={err("electricKmShare")}
                  hint={share !== null && !Number.isNaN(share) && km ? `${fmtKm(Math.round((km * share) / 100))} électriques · ${fmtKm(Math.round(km - (km * share) / 100))} thermiques` : undefined}
                >
                  <NumInput value={f.electricKmShare} onChange={set("electricKmShare")} suffix="%" invalid={!!err("electricKmShare")} placeholder="40" />
                </Field>
              )}
            </div>
          )}
        </Section>

        <Section title="Kilométrage">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Kilométrage annuel estimé *" error={err("annualKm")} hint="utilisé dans tous les calculs">
              <NumInput value={f.annualKm} onChange={set("annualKm")} suffix="km/an" invalid={!!err("annualKm")} />
            </Field>
            <Field label="Kilométrage actuel" error={err("currentMileage")}><NumInput value={f.currentMileage} onChange={set("currentMileage")} suffix="km" invalid={!!err("currentMileage")} /></Field>
            <Field label="dont professionnel" error={err("proKm")} hint="informatif"><NumInput value={f.proKm} onChange={set("proKm")} suffix="km/an" invalid={!!err("proKm")} /></Field>
            <Field label="dont personnel" error={err("persoKm")} hint="informatif"><NumInput value={f.persoKm} onChange={set("persoKm")} suffix="km/an" invalid={!!err("persoKm")} /></Field>
          </div>
        </Section>

        {category === "COMPANY" ? (
          <Section title="Voiture de fonction" subtitle="Seuls les montants supportés par le foyer sont additionnés ; le coût employeur reste informatif.">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Redevance mensuelle" error={err("companyMonthlyFee")}><NumInput value={f.companyMonthlyFee} onChange={set("companyMonthlyFee")} suffix="€/mois" invalid={!!err("companyMonthlyFee")} placeholder="450" /></Field>
              <Field label="Autre participation du salarié" hint="options, franchise… (mensuel)" error={err("employeeExtraContribution")}><NumInput value={f.employeeExtraContribution} onChange={set("employeeExtraContribution")} suffix="€/mois" invalid={!!err("employeeExtraContribution")} /></Field>
              <Field label="Énergie prise en charge par l'employeur" hint="0 % = payée par le foyer · 100 % = carte carburant" error={err("employerEnergySharePct")}>
                <NumInput value={f.employerEnergySharePct} onChange={set("employerEnergySharePct")} suffix="%" invalid={!!err("employerEnergySharePct")} placeholder="0" />
              </Field>
              <Field label="Coût employeur" hint="informatif, non compté" error={err("employerMonthlyCost")}><NumInput value={f.employerMonthlyCost} onChange={set("employerMonthlyCost")} suffix="€/mois" invalid={!!err("employerMonthlyCost")} /></Field>
            </div>
            <div className="mt-4 pt-4 border-t border-line grid sm:grid-cols-3 gap-3">
              <Field label="Avantage en nature" hint="montant mensuel (bulletin de paie)" error={err("benefitInKindMonthly")}><NumInput value={f.benefitInKindMonthly} onChange={set("benefitInKindMonthly")} suffix="€/mois" invalid={!!err("benefitInKindMonthly")} /></Field>
              <Field label="Taux appliqué à l'AEN" hint={`impôt marginal + prélèvements · vide = ${fmtNum(ctx.defaultBenefitTaxRate)} %`} error={err("benefitTaxRate")}><NumInput value={f.benefitTaxRate} onChange={set("benefitTaxRate")} suffix="%" invalid={!!err("benefitTaxRate")} /></Field>
              <Field label="ou surcoût fiscal connu" hint="prioritaire sur le calcul AEN × taux" error={err("taxCostMonthlyOverride")}><NumInput value={f.taxCostMonthlyOverride} onChange={set("taxCostMonthlyOverride")} suffix="€/mois" invalid={!!err("taxCostMonthlyOverride")} /></Field>
            </div>
          </Section>
        ) : (
          <Section
            title={category === "NEW" ? "Achat d'une voiture neuve" : "Achat d'une voiture d'occasion"}
            subtitle="La mensualité saisie est prioritaire ; sinon une mensualité indicative est calculée."
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Prix d'achat" error={err("purchasePrice")}><NumInput value={f.purchasePrice} onChange={set("purchasePrice")} suffix="€" invalid={!!err("purchasePrice")} /></Field>
              {category === "USED" ? (
                <Field label="Kilométrage à l'achat" error={err("mileageAtPurchase")}><NumInput value={f.mileageAtPurchase} onChange={set("mileageAtPurchase")} suffix="km" invalid={!!err("mileageAtPurchase")} /></Field>
              ) : <div className="hidden sm:block" />}
              <Field label="Valeur de revente estimée" hint="en fin de détention" error={err("residualValue")}><NumInput value={f.residualValue} onChange={set("residualValue")} suffix="€" invalid={!!err("residualValue")} /></Field>
              <Field label="Durée de détention" error={err("holdingYears")} hint={price && toNum(f.residualValue) !== null && toNum(f.holdingYears) ? `Décote : ${fmtEur((price - (toNum(f.residualValue) ?? 0)) / (toNum(f.holdingYears) ?? 1), 0)}/an` : undefined}>
                <NumInput value={f.holdingYears} onChange={set("holdingYears")} suffix="ans" invalid={!!err("holdingYears")} placeholder="5" />
              </Field>
            </div>
            <div className="mt-4 pt-4 border-t border-line">
              <div className="text-xs font-medium text-ink-2 mb-2">Financement (optionnel)</div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Apport" error={err("downPayment")}><NumInput value={f.downPayment} onChange={set("downPayment")} suffix="€" invalid={!!err("downPayment")} /></Field>
                <Field label="Montant financé" hint={financedHint ? `vide = ${fmtEur(financedHint, 0)}` : undefined} error={err("financedAmount")}><NumInput value={f.financedAmount} onChange={set("financedAmount")} suffix="€" invalid={!!err("financedAmount")} /></Field>
                <Field label="Durée du crédit" error={err("loanMonths")}><NumInput value={f.loanMonths} onChange={set("loanMonths")} suffix="mois" invalid={!!err("loanMonths")} /></Field>
                <Field label="Taux annuel" error={err("loanRatePct")}><NumInput value={f.loanRatePct} onChange={set("loanRatePct")} suffix="%" invalid={!!err("loanRatePct")} /></Field>
                <Field label="Mensualité" hint={paymentHint ? `indicative : ${fmtEur(paymentHint)}` : "si connue"} error={err("monthlyPayment")} className="sm:col-span-2">
                  <NumInput value={f.monthlyPayment} onChange={set("monthlyPayment")} suffix="€/mois" invalid={!!err("monthlyPayment")} />
                </Field>
              </div>
            </div>
          </Section>
        )}

        <Section title="Autres coûts" subtitle="Assurance, parking, entretien, pneus… Montant mensuel, annuel ou au km.">
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={l.key} className="grid grid-cols-2 sm:grid-cols-[150px_1fr_110px_100px_auto_auto] gap-2 items-center rounded-lg bg-surface-2 p-2">
                <select className="input" value={l.category} onChange={(e) => updLine(l.key, { category: e.target.value as CostCategory })} aria-label="Catégorie">
                  {COST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{COST_CATEGORY_META[c].label}</option>
                  ))}
                </select>
                <input className="input" value={l.label} onChange={(e) => updLine(l.key, { label: e.target.value })} placeholder="Libellé" aria-label="Libellé" />
                <input className="input text-right" inputMode="decimal" value={l.amount} onChange={(e) => updLine(l.key, { amount: e.target.value })} placeholder="0" aria-label="Montant" aria-invalid={!!errors[`costLines.${i}.amount`] || Number.isNaN(toNum(l.amount))} />
                <select className="input" value={l.frequency} onChange={(e) => updLine(l.key, { frequency: e.target.value as CostFrequency })} aria-label="Fréquence">
                  {COST_FREQUENCIES.map((fq) => (
                    <option key={fq} value={fq}>{FREQUENCY_LABELS[fq]}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-ink-2" title="Montant estimé (pas encore réel)">
                  <input type="checkbox" checked={l.isEstimate} onChange={(e) => updLine(l.key, { isEstimate: e.target.checked })} /> estimé
                </label>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Supprimer la ligne">✕</button>
                {errors[`costLines.${i}.amount`] && <div className="col-span-full text-xs text-bad">{errors[`costLines.${i}.amount`]}</div>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["INSURANCE", "PARKING", "MAINTENANCE", "TIRES", "REPAIRS", "TOLLS", "WASHING", "LEASING", "OTHER_FIXED", "OTHER_VARIABLE"] as CostCategory[]).map((c) => (
              <button key={c} type="button" className="btn btn-sm" onClick={() => addLine(c)}>+ {COST_CATEGORY_META[c].label}</button>
            ))}
          </div>
        </Section>

        {errors._ && <p className="text-sm text-bad">{errors._}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : id ? "Enregistrer" : "Créer le véhicule"}</button>
          <button type="button" className="btn" onClick={() => router.back()}>Annuler</button>
          {submitted && !validation.success && <span className="self-center text-sm text-bad">Corrigez les champs en rouge.</span>}
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="text-sm font-semibold">Aperçu du coût</div>
        {preview ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-xs text-ink-2">par mois</div><div className="text-lg font-semibold tnum">{fmtEur(preview.totals.monthly, 0)}</div></div>
              <div><div className="text-xs text-ink-2">par an</div><div className="text-lg font-semibold tnum">{fmtEur(preview.totals.annual, 0)}</div></div>
              <div><div className="text-xs text-ink-2">par km</div><div className="text-lg font-semibold tnum">{preview.totals.perKm !== null ? fmtEur(preview.totals.perKm, 3) : "—"}</div></div>
            </div>
            <CalcDetail result={preview} compact />
          </>
        ) : (
          <p className="text-sm text-muted">Complétez le formulaire pour voir le calcul.</p>
        )}
      </aside>
    </form>
  );
}

/* ---------------- petits composants ---------------- */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-line bg-surface p-4 md:p-5">
      <legend className="sr-only">{title}</legend>
      <div className="mb-3">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-ink-2 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </fieldset>
  );
}

export function Field({ label, error, hint, children, className = "" }: { label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-ink-2 mb-1">{label}</span>
      {children}
      {error ? <span className="block text-xs text-bad mt-1">{error}</span> : hint ? <span className="block text-xs text-muted mt-1">{hint}</span> : null}
    </label>
  );
}

export function NumInput({
  value,
  onChange,
  suffix,
  invalid,
  placeholder,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  suffix?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  return (
    <span
      className={`flex items-stretch overflow-hidden rounded-lg border bg-surface focus-within:outline-2 focus-within:outline-accent ${invalid ? "border-bad" : "border-line"}`}
    >
      <input className="min-w-0 flex-1 bg-transparent px-3 py-2 text-right text-[0.9rem] tnum outline-none" inputMode="decimal" value={value} onChange={onChange} aria-invalid={invalid} placeholder={placeholder} />
      {suffix && <span className="flex items-center whitespace-nowrap border-l border-line bg-surface-2 px-2 text-xs text-muted">{suffix}</span>}
    </span>
  );
}

function Segmented({ options, value, onChange, wrap }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; wrap?: boolean }) {
  return (
    <div className={`flex gap-1.5 ${wrap ? "flex-wrap" : "flex-col sm:flex-row"}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg border px-3 py-2 text-sm ${value === o.value ? "border-accent bg-accent/10 text-accent font-semibold" : "border-line text-ink-2 hover:bg-surface-2"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function resizeImage(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.8));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
