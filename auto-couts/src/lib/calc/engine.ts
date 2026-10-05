/**
 * Moteur de calcul des coûts automobiles.
 *
 * Toutes les formules métier sont ici (et dans finance.ts) : les composants
 * React ne font qu'afficher les résultats. Aucune dépendance à la base ni à l'UI.
 *
 * Conventions :
 *  - les montants retournés sont des coûts supportés par le FOYER (positifs = dépense) ;
 *  - "annual" / "monthly" = moyenne sur l'horizon choisi (identique quel que soit
 *    l'horizon en mode économique, variable en mode trésorerie) ;
 *  - les coûts non supportés par le foyer (coût employeur, énergie prise en charge…)
 *    sont listés à part, en "informatif", et jamais additionnés.
 */
import {
  COST_CATEGORY_META,
  COST_GROUPS,
  CATEGORY_LABELS,
  ELECTRICITY,
  powertrainUses,
  STANDARD_HORIZONS,
  type CostGroup,
} from "../domain";
import { fmtEur, fmtKm, fmtNum, fmtPct, fmtYears } from "../format";
import { amortizationAt, annuityPayment, impliedAnnualRate } from "./finance";
import type {
  Adjustments,
  CalcContext,
  Comparison,
  CostItem,
  EnergyPart,
  EnergyResult,
  ExplainStep,
  FinancingInfo,
  OwnershipResult,
  PriceSource,
  ScenarioDiff,
  ScenarioInput,
  ScenarioResult,
  Totals,
  VehicleInput,
  VehicleResult,
} from "./types";

/** Durée de détention retenue si non renseignée (signalée par un avertissement). */
export const DEFAULT_HOLDING_YEARS = 5;

const isNum = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/* ================================================================== */
/* Kilométrage & prix                                                  */
/* ================================================================== */

export function resolveAnnualKm(
  v: VehicleInput,
  ctx: Pick<CalcContext, "scenarioAnnualKm" | "adjustments">,
): { km: number; source: VehicleResult["annualKmSource"]; steps: ExplainStep[] } {
  const steps: ExplainStep[] = [];
  const adj = ctx.adjustments;
  const forced = adj?.annualKmByVehicle?.[v.id];
  if (isNum(forced)) {
    steps.push({ label: "Kilométrage annuel (simulation)", value: fmtKm(forced) });
    return { km: Math.max(0, forced), source: "simulation", steps };
  }
  const scen = ctx.scenarioAnnualKm?.[v.id];
  let km = isNum(scen) ? scen : v.annualKm;
  const source: VehicleResult["annualKmSource"] = isNum(scen) ? "scénario" : "véhicule";
  steps.push({ label: `Kilométrage annuel (${source})`, value: fmtKm(km) });
  if (isNum(adj?.kmChangePct) && adj.kmChangePct !== 0) {
    const before = km;
    km = km * (1 + adj.kmChangePct / 100);
    steps.push({
      label: "Variation simulée du kilométrage",
      value: fmtKm(Math.round(km)),
      detail: `${fmtKm(before)} × (1 ${adj.kmChangePct >= 0 ? "+" : "−"} ${fmtNum(Math.abs(adj.kmChangePct))} %)`,
    });
    return { km: Math.max(0, km), source: "simulation", steps };
  }
  return { km: Math.max(0, km), source, steps };
}

/** Priorité : simulation > scénario > véhicule > paramètres globaux. */
export function resolvePrice(
  code: string,
  vehicleOverride: number | null | undefined,
  ctx: Pick<CalcContext, "prices" | "scenarioPriceOverrides" | "adjustments">,
): { price: number; source: PriceSource } | null {
  const sim = ctx.adjustments?.energyPrices?.[code];
  if (isNum(sim)) return { price: sim, source: "simulation" };
  const scen = ctx.scenarioPriceOverrides?.[code];
  if (isNum(scen)) return { price: scen, source: "scénario" };
  if (isNum(vehicleOverride)) return { price: vehicleOverride, source: "véhicule" };
  const g = ctx.prices[code];
  if (g && isNum(g.price)) return { price: g.price, source: "global" };
  return null;
}

/* ================================================================== */
/* Énergie                                                             */
/* ================================================================== */

function energyPart(
  code: string,
  km: number,
  rated: number | null | undefined,
  real: number | null | undefined,
  priceOverride: number | null | undefined,
  ctx: CalcContext,
  warnings: string[],
  what: string,
): EnergyPart | null {
  const consumption = isNum(real) && real > 0 ? real : isNum(rated) && rated > 0 ? rated : null;
  const meta = ctx.prices[code];
  const label = meta?.label ?? code;
  const unit = meta?.unit ?? "unité";
  if (consumption === null) {
    if (km > 0) warnings.push(`Consommation ${what} manquante : coût ${label.toLowerCase()} non calculé (compté 0 €).`);
    return null;
  }
  const p = resolvePrice(code, priceOverride, ctx);
  if (!p) {
    warnings.push(`Prix de l'énergie « ${label} » introuvable : coût non calculé (compté 0 €).`);
    return null;
  }
  if (p.price < 0) warnings.push(`Prix négatif pour « ${label} » : vérifiez la saisie.`);
  const annualQuantity = (km * consumption) / 100;
  const annualCost = annualQuantity * p.price;
  return {
    code,
    label,
    unit,
    km,
    consumption,
    consumptionSource: isNum(real) && real > 0 ? "réelle" : "constructeur",
    price: p.price,
    priceSource: p.source,
    annualQuantity,
    annualCost,
    costPerKm: (consumption / 100) * p.price,
  };
}

/** Coût énergétique annuel d'un véhicule (avant partage employeur / foyer). */
export function calculateEnergyCost(v: VehicleInput, annualKm: number, ctx: CalcContext, warnings: string[] = []): EnergyResult {
  const uses = powertrainUses(v.powertrain);
  const parts: EnergyPart[] = [];

  if (v.powertrain === "PHEV") {
    let share = v.electricKmShare;
    if (!isNum(share)) {
      warnings.push("Hybride rechargeable : part de km électriques non renseignée, 0 % retenu (hypothèse prudente).");
      share = 0;
    }
    if (share < 0 || share > 100) {
      warnings.push("Part de km électriques hors de 0–100 % : valeur bornée.");
      share = Math.min(100, Math.max(0, share));
    }
    const elecKm = (annualKm * share) / 100;
    const fuelKm = annualKm - elecKm;
    const fuelCode = v.fuelEnergyCode ?? "GASOLINE";
    const f = energyPart(fuelCode, fuelKm, v.fuelConsumption, v.fuelConsumptionReal, v.fuelPriceOverride, ctx, warnings, "carburant");
    if (f) parts.push(f);
    const e = energyPart(ELECTRICITY, elecKm, v.elecConsumption, v.elecConsumptionReal, v.elecPriceOverride, ctx, warnings, "électrique");
    if (e) parts.push(e);
  } else if (uses.electric) {
    const e = energyPart(ELECTRICITY, annualKm, v.elecConsumption, v.elecConsumptionReal, v.elecPriceOverride, ctx, warnings, "électrique");
    if (e) parts.push(e);
  } else {
    const code = v.fuelEnergyCode;
    if (!code) {
      warnings.push("Type d'énergie non choisi : coût énergie non calculé.");
    } else {
      const isElec = code === ELECTRICITY;
      const f = energyPart(
        code,
        annualKm,
        v.fuelConsumption,
        v.fuelConsumptionReal,
        isElec ? v.elecPriceOverride ?? v.fuelPriceOverride : v.fuelPriceOverride,
        ctx,
        warnings,
        "",
      );
      if (f) parts.push(f);
    }
  }

  const annualTotal = parts.reduce((s, p) => s + p.annualCost, 0);
  let employerSharePct = 0;
  if (v.category === "COMPANY" && isNum(v.employerEnergySharePct)) {
    employerSharePct = Math.min(100, Math.max(0, v.employerEnergySharePct));
    if (employerSharePct !== v.employerEnergySharePct) warnings.push("Part énergie employeur hors de 0–100 % : valeur bornée.");
  }
  const employerAnnual = (annualTotal * employerSharePct) / 100;
  return {
    parts,
    annualTotal,
    employerSharePct,
    employerAnnual,
    householdAnnual: annualTotal - employerAnnual,
    costPerKm: annualKm > 0 ? annualTotal / annualKm : null,
  };
}

/* ================================================================== */
/* Financement / possession                                            */
/* ================================================================== */

interface ResolvedLoan extends FinancingInfo {
  /** taux utilisé pour l'échéancier (saisi ou implicite) ; null = intérêts inconnus */
  scheduleRatePct: number | null;
  /** durée connue ? sinon les mensualités courent sur toute la détention */
  monthsKnown: boolean;
}

/** Résout le crédit d'un véhicule acheté (mensualité saisie prioritaire). */
export function resolveFinancing(v: VehicleInput, holdingMonths: number, warnings: string[]): ResolvedLoan | null {
  const price = v.purchasePrice;
  const hasLoanData = (isNum(v.loanMonths) && v.loanMonths > 0) || (isNum(v.monthlyPayment) && v.monthlyPayment > 0) || (isNum(v.financedAmount) && v.financedAmount > 0);
  if (!hasLoanData) return null;

  let financed = v.financedAmount;
  if (!isNum(financed) && isNum(price)) financed = Math.max(0, price - (v.downPayment ?? 0));
  if (isNum(financed) && isNum(price) && isNum(v.downPayment) && Math.abs(v.downPayment + financed - price) > 1) {
    warnings.push(
      `Apport (${fmtEur(v.downPayment, 0)}) + montant financé (${fmtEur(financed, 0)}) ≠ prix d'achat (${fmtEur(price, 0)}) : vérifiez (frais de dossier ?).`,
    );
  }

  const monthsKnown = isNum(v.loanMonths) && v.loanMonths > 0;
  const months = monthsKnown ? Math.round(v.loanMonths as number) : holdingMonths;
  if (!monthsKnown) warnings.push("Durée du crédit non renseignée : mensualités supposées payées pendant toute la détention.");

  const rate = isNum(v.loanRatePct) ? v.loanRatePct : null;
  if (isNum(v.monthlyPayment) && v.monthlyPayment > 0) {
    let scheduleRatePct: number | null = null;
    let totalInterest: number | null = null;
    if (isNum(financed) && financed > 0 && monthsKnown) {
      totalInterest = v.monthlyPayment * months - financed;
      scheduleRatePct = impliedAnnualRate(financed, v.monthlyPayment, months);
      if (scheduleRatePct === null) {
        warnings.push("Mensualité × durée inférieure au montant financé : données de crédit incohérentes.");
        totalInterest = null;
      } else if (rate !== null && Math.abs(scheduleRatePct - rate) > 0.25) {
        warnings.push(
          `Le taux saisi (${fmtPct(rate, 2)}) ne correspond pas à la mensualité (taux implicite ${fmtPct(scheduleRatePct, 2)}) : la mensualité saisie est retenue (assurance emprunteur incluse ?).`,
        );
      }
    } else if (!isNum(financed) || financed <= 0) {
      warnings.push("Montant financé inconnu : intérêts du crédit non calculables.");
    }
    return {
      financedAmount: isNum(financed) ? financed : 0,
      loanMonths: months,
      ratePct: rate ?? scheduleRatePct,
      monthlyPayment: v.monthlyPayment,
      monthlyPaymentSource: "saisie",
      totalInterest,
      scheduleRatePct,
      monthsKnown,
    };
  }

  if (!isNum(financed) || financed <= 0) {
    warnings.push("Crédit renseigné sans montant financé ni prix d'achat : crédit ignoré.");
    return null;
  }
  let r = rate;
  if (r === null) {
    warnings.push("Taux du crédit non renseigné : 0 % retenu pour calculer la mensualité indicative.");
    r = 0;
  }
  const payment = annuityPayment(financed, r, months);
  return {
    financedAmount: financed,
    loanMonths: months,
    ratePct: r,
    monthlyPayment: payment,
    monthlyPaymentSource: "calculée",
    totalInterest: payment * months - financed,
    scheduleRatePct: r,
    monthsKnown,
  };
}

interface CashBreakdown {
  initial: number;
  payments: number;
  resale: number; // négatif (rentrée d'argent)
  loanPayoff: number;
  cycles: number;
  remainingValue: number | null;
}

/** Flux de trésorerie de possession cumulés sur `months` mois (renouvellement à l'identique). */
function cashFlowsUpTo(
  price: number | null,
  residual: number,
  holdingMonths: number,
  loan: ResolvedLoan | null,
  horizonMonths: number,
): CashBreakdown {
  const out: CashBreakdown = { initial: 0, payments: 0, resale: 0, loanPayoff: 0, cycles: 0, remainingValue: null };
  if (price === null) {
    // Pas de prix : seules les mensualités sont connues.
    if (loan) out.payments = loan.monthlyPayment * Math.min(loan.loanMonths, horizonMonths);
    return out;
  }
  for (let start = 0; start < horizonMonths; start += holdingMonths) {
    out.cycles++;
    const elapsed = Math.min(holdingMonths, horizonMonths - start);
    out.initial += loan ? Math.max(0, price - loan.financedAmount) : price;
    if (loan) {
      const paidMonths = Math.min(loan.loanMonths, elapsed);
      if (loan.scheduleRatePct !== null) {
        out.payments += amortizationAt(loan.financedAmount, loan.scheduleRatePct, loan.loanMonths, loan.monthlyPayment, paidMonths).paymentsMade;
      } else {
        out.payments += loan.monthlyPayment * paidMonths;
      }
    }
    if (elapsed === holdingMonths) {
      out.resale -= residual;
      if (loan && loan.loanMonths > holdingMonths && loan.scheduleRatePct !== null) {
        out.loanPayoff += amortizationAt(loan.financedAmount, loan.scheduleRatePct, loan.loanMonths, loan.monthlyPayment, holdingMonths).balance;
      }
    } else {
      out.remainingValue = price - ((price - residual) * elapsed) / holdingMonths;
    }
  }
  return out;
}

export interface OwnershipCalc {
  result: OwnershipResult;
  items: CostItem[];
  /** coût de possession cumulé à `years` années */
  totalAt: (years: number) => number;
}

/** Coût de possession d'un véhicule acheté (neuf / occasion), selon la méthode. */
export function calculateOwnershipCost(v: VehicleInput, ctx: CalcContext, warnings: string[]): OwnershipCalc | null {
  if (v.category === "COMPANY") return null;
  const adj = ctx.adjustments;
  const price = isNum(v.purchasePrice) && v.purchasePrice > 0 ? v.purchasePrice : null;
  const hasPayment = isNum(v.monthlyPayment) && v.monthlyPayment > 0;
  if (price === null && !hasPayment) {
    const hasLeasing = v.costLines.some((l) => l.category === "LEASING");
    if (!hasLeasing) warnings.push(`${CATEGORY_LABELS[v.category]} sans prix d'achat, mensualité ni leasing : aucun coût de possession compté.`);
    return null;
  }

  let holdingYears = isNum(adj?.holdingYears) && adj.holdingYears > 0 ? adj.holdingYears : v.holdingYears;
  if (!isNum(holdingYears) || holdingYears <= 0) {
    warnings.push(`Durée de détention non renseignée : ${DEFAULT_HOLDING_YEARS} ans retenus.`);
    holdingYears = DEFAULT_HOLDING_YEARS;
  }
  const holdingMonths = Math.max(1, Math.round(holdingYears * 12));

  let residual = isNum(v.residualValue) ? v.residualValue : null;
  if (price !== null && residual === null) warnings.push("Valeur de revente non renseignée : 0 € retenu (décote = prix d'achat complet).");
  if (price !== null && residual !== null && residual > price) warnings.push("Valeur de revente supérieure au prix d'achat : vérifiez la saisie.");
  const residualV = residual ?? 0;

  const loan = resolveFinancing(v, holdingMonths, warnings);
  if (loan && price === null) warnings.push("Prix d'achat non renseigné : seules les mensualités sont comptées (décote inconnue).");

  const depreciationTotal = price !== null ? price - residualV : null;
  const depreciationAnnual = depreciationTotal !== null ? depreciationTotal / holdingYears : null;

  let interestDuringHolding: number | null = null;
  if (loan) {
    if (loan.scheduleRatePct !== null && loan.financedAmount > 0) {
      interestDuringHolding = amortizationAt(loan.financedAmount, loan.scheduleRatePct, loan.loanMonths, loan.monthlyPayment, holdingMonths).interestPaid;
    } else if (price !== null) {
      warnings.push("Intérêts du crédit non calculables (données insuffisantes) : non comptés en coût économique.");
    }
  }

  const H = ctx.horizonYears;
  const method = ctx.method;
  const items: CostItem[] = [];
  const mk = (key: string, label: string, horizonAmount: number, explanation: ExplainStep[], isEstimate = false): CostItem => ({
    key,
    label,
    group: "FINANCING",
    nature: "FIXED",
    annual: horizonAmount / H,
    monthly: horizonAmount / H / 12,
    isEstimate,
    explanation,
  });

  const financingInfo: FinancingInfo | null = loan
    ? {
        financedAmount: loan.financedAmount,
        loanMonths: loan.loanMonths,
        ratePct: loan.ratePct,
        monthlyPayment: loan.monthlyPayment,
        monthlyPaymentSource: loan.monthlyPaymentSource,
        totalInterest: loan.totalInterest,
      }
    : null;

  const loanSteps: ExplainStep[] = loan
    ? [
        { label: "Montant financé", value: fmtEur(loan.financedAmount) },
        { label: "Durée du crédit", value: `${loan.loanMonths} mois` },
        ...(loan.ratePct !== null ? [{ label: "Taux annuel", value: fmtPct(loan.ratePct, 2) }] : []),
        { label: `Mensualité (${loan.monthlyPaymentSource})`, value: fmtEur(loan.monthlyPayment) },
        ...(loan.totalInterest !== null ? [{ label: "Coût total des intérêts", value: fmtEur(loan.totalInterest) }] : []),
      ]
    : [];

  let totalAt: (years: number) => number;
  let initialOutlay = 0;
  let recurringMonthly = 0;
  let remainingValueAtHorizon: number | null = null;

  if (method === "ECONOMIC") {
    let annual: number;
    if (depreciationAnnual !== null) {
      const interestAnnual = (interestDuringHolding ?? 0) / holdingYears;
      annual = depreciationAnnual + interestAnnual;
      items.push(
        mk("depreciation", "Décote (perte de valeur)", depreciationAnnual * H, [
          { label: "Prix d'achat", value: fmtEur(price) },
          { label: "Valeur de revente estimée", value: fmtEur(residualV), detail: residual === null ? "non renseignée" : "estimation" },
          { label: "Décote totale", value: fmtEur(depreciationTotal), detail: `${fmtEur(price)} − ${fmtEur(residualV)}` },
          { label: "Durée de détention", value: fmtYears(holdingYears) },
          { label: "Décote annuelle", value: fmtEur(depreciationAnnual), detail: `${fmtEur(depreciationTotal)} / ${fmtNum(holdingYears)} an(s)` },
          { label: "Décote mensuelle", value: fmtEur(depreciationAnnual / 12) },
        ], true),
      );
      if (interestDuringHolding !== null && interestDuringHolding > 0) {
        items.push(
          mk("interest", "Intérêts du crédit", interestAnnual * H, [
            ...loanSteps,
            { label: "Intérêts payés pendant la détention", value: fmtEur(interestDuringHolding) },
            { label: "Intérêts annualisés", value: fmtEur(interestAnnual), detail: `${fmtEur(interestDuringHolding)} / ${fmtNum(holdingYears)} an(s)` },
            { label: "Note", value: "Le capital remboursé n'est pas recompté (déjà inclus dans la décote)." },
          ]),
        );
      }
    } else {
      // pas de prix : la mensualité est le seul coût connu
      annual = loan!.monthlyPayment * 12;
      items.push(mk("payments", "Mensualités (prix d'achat inconnu)", annual * H, [...loanSteps, { label: "Annuel", value: fmtEur(annual), detail: `${fmtEur(loan!.monthlyPayment)} × 12` }], true));
    }
    totalAt = (y) => annual * y;
  } else {
    const flows = (y: number) => cashFlowsUpTo(price, residualV, holdingMonths, loan, Math.round(y * 12));
    const f = flows(H);
    totalAt = (y) => {
      const c = flows(y);
      return c.initial + c.payments + c.resale + c.loanPayoff;
    };
    initialOutlay = price !== null ? (loan ? Math.max(0, price - loan.financedAmount) : price) : 0;
    recurringMonthly = loan?.monthlyPayment ?? 0;
    remainingValueAtHorizon = f.remainingValue;
    const cyc = f.cycles > 1 ? ` (${f.cycles} cycles d'achat, renouvellement à l'identique)` : "";
    if (f.initial)
      items.push(
        mk("initial", loan ? "Apport initial" : "Achat comptant", f.initial, [
          { label: loan ? "Apport par achat" : "Prix payé par achat", value: fmtEur(initialOutlay) },
          { label: "Total sur l'horizon", value: fmtEur(f.initial), detail: `${fmtYears(H)}${cyc}` },
          { label: "Moyenne annuelle", value: fmtEur(f.initial / H) },
        ]),
      );
    if (f.payments)
      items.push(
        mk("payments", "Mensualités de crédit", f.payments, [
          ...loanSteps,
          { label: "Total payé sur l'horizon", value: fmtEur(f.payments) },
          { label: "Moyenne annuelle", value: fmtEur(f.payments / H) },
        ]),
      );
    if (f.loanPayoff)
      items.push(mk("payoff", "Solde du crédit à la revente", f.loanPayoff, [{ label: "Capital restant dû à la revente", value: fmtEur(f.loanPayoff) }]));
    if (f.resale)
      items.push(
        mk("resale", "Revente (rentrée d'argent)", f.resale, [
          { label: "Valeur de revente estimée", value: fmtEur(residualV) },
          { label: "Reventes dans l'horizon", value: fmtEur(-f.resale) },
        ], true),
      );
    if (f.remainingValue !== null)
      warnings.push(
        `Trésorerie : véhicule encore détenu à la fin de l'horizon (valeur estimée ≈ ${fmtEur(f.remainingValue, 0)}, non déduite).`,
      );
  }

  if (method === "CASH" && H > holdingYears + 1e-9) warnings.push(`Horizon (${fmtYears(H)}) > détention (${fmtYears(holdingYears)}) : renouvellement à l'identique supposé.`);

  return {
    items,
    totalAt,
    result: {
      method,
      purchasePrice: price,
      residualValue: residual,
      holdingYears,
      depreciationTotal,
      depreciationAnnual,
      financing: financingInfo,
      interestDuringHolding,
      horizonTotal: totalAt(H),
      initialOutlay,
      recurringMonthly,
      remainingValueAtHorizon,
    },
  };
}

/* ================================================================== */
/* Véhicule                                                            */
/* ================================================================== */

function companyItems(v: VehicleInput, ctx: CalcContext, warnings: string[]): { items: CostItem[]; info: CostItem[] } {
  const items: CostItem[] = [];
  const info: CostItem[] = [];
  if (v.category !== "COMPANY") return { items, info };
  const adj = ctx.adjustments;
  const fixed = (key: string, label: string, group: CostGroup, monthly: number, explanation: ExplainStep[], isEstimate = false): CostItem => ({
    key, label, group, nature: "FIXED", monthly, annual: monthly * 12, isEstimate, explanation,
  });

  const baseFee = v.companyMonthlyFee ?? 0;
  if (!isNum(v.companyMonthlyFee)) warnings.push("Voiture de fonction sans redevance renseignée : 0 € retenu.");
  const delta = isNum(adj?.companyFeeDelta) ? adj.companyFeeDelta : 0;
  const fee = baseFee + delta;
  if (fee !== 0 || isNum(v.companyMonthlyFee)) {
    items.push(
      fixed("companyFee", "Redevance voiture de fonction", "FINANCING", fee, [
        { label: "Redevance mensuelle", value: fmtEur(baseFee) },
        ...(delta ? [{ label: "Variation simulée", value: fmtEur(delta) }, { label: "Redevance retenue", value: fmtEur(fee) }] : []),
        { label: "Annuel", value: fmtEur(fee * 12), detail: `${fmtEur(fee)} × 12` },
      ]),
    );
  }
  if (isNum(v.employeeExtraContribution) && v.employeeExtraContribution !== 0) {
    items.push(
      fixed("employeeContribution", "Participation complémentaire du salarié", "FINANCING", v.employeeExtraContribution, [
        { label: "Participation mensuelle", value: fmtEur(v.employeeExtraContribution) },
        { label: "Annuel", value: fmtEur(v.employeeExtraContribution * 12) },
      ]),
    );
  }

  // Fiscalité de l'avantage en nature
  const aen = v.benefitInKindMonthly;
  const simRate = adj?.benefitTaxRate;
  if (isNum(simRate) && isNum(aen)) {
    const tax = (aen * simRate) / 100;
    items.push(fixed("benefitTax", "Surcoût fiscal de l'avantage en nature", "TAX", tax, [
      { label: "Avantage en nature mensuel", value: fmtEur(aen) },
      { label: "Taux appliqué (simulation)", value: fmtPct(simRate) },
      { label: "Surcoût mensuel", value: fmtEur(tax), detail: `${fmtEur(aen)} × ${fmtPct(simRate)}` },
    ], true));
  } else if (isNum(v.taxCostMonthlyOverride)) {
    items.push(fixed("benefitTax", "Surcoût fiscal de l'avantage en nature", "TAX", v.taxCostMonthlyOverride, [
      { label: "Surcoût fiscal mensuel (saisi)", value: fmtEur(v.taxCostMonthlyOverride) },
      { label: "Annuel", value: fmtEur(v.taxCostMonthlyOverride * 12) },
    ]));
  } else if (isNum(aen) && aen > 0) {
    const rate = isNum(v.benefitTaxRate) ? v.benefitTaxRate : ctx.defaultBenefitTaxRate;
    const tax = (aen * rate) / 100;
    items.push(fixed("benefitTax", "Surcoût fiscal de l'avantage en nature", "TAX", tax, [
      { label: "Avantage en nature mensuel", value: fmtEur(aen) },
      { label: `Taux appliqué (${isNum(v.benefitTaxRate) ? "véhicule" : "paramètres"})`, value: fmtPct(rate) },
      { label: "Surcoût mensuel", value: fmtEur(tax), detail: `${fmtEur(aen)} × ${fmtPct(rate)}` },
      { label: "Annuel", value: fmtEur(tax * 12) },
    ], true));
  }

  if (isNum(v.employerMonthlyCost) && v.employerMonthlyCost > 0) {
    info.push({
      key: "employerCost", label: "Coût employeur (informatif)", group: "FINANCING", nature: "FIXED",
      monthly: v.employerMonthlyCost, annual: v.employerMonthlyCost * 12, isEstimate: false, informative: true,
      explanation: [{ label: "Non supporté par le foyer", value: fmtEur(v.employerMonthlyCost) + "/mois" }],
    });
  }
  if (v.costLines.some((l) => l.category === "LEASING")) warnings.push("Ligne « leasing » sur une voiture de fonction : risque de double comptage avec la redevance.");
  return { items, info };
}

function costLineItems(v: VehicleInput, annualKm: number, warnings: string[]): CostItem[] {
  return v.costLines.map((l, i) => {
    const meta = COST_CATEGORY_META[l.category];
    if (l.amount < 0) warnings.push(`Montant négatif pour « ${l.label} » : vérifiez la saisie.`);
    let annual: number;
    let detail: string;
    if (l.frequency === "MONTHLY") {
      annual = l.amount * 12;
      detail = `${fmtEur(l.amount)} × 12 mois`;
    } else if (l.frequency === "PER_KM") {
      annual = l.amount * annualKm;
      detail = `${fmtEur(l.amount, 3)}/km × ${fmtKm(Math.round(annualKm))}`;
    } else {
      annual = l.amount;
      detail = "montant annuel saisi";
    }
    return {
      key: `line-${l.id ?? i}`,
      label: l.label || meta.label,
      group: meta.group,
      nature: meta.nature,
      annual,
      monthly: annual / 12,
      isEstimate: !!l.isEstimate,
      explanation: [
        { label: "Catégorie", value: `${meta.label} (${meta.nature === "FIXED" ? "fixe" : "variable"})` },
        { label: "Coût annuel", value: fmtEur(annual), detail },
        { label: "Coût mensuel", value: fmtEur(annual / 12) },
      ],
    };
  });
}

function emptyGroups(): Record<CostGroup, number> {
  return Object.fromEntries(COST_GROUPS.map((g) => [g, 0])) as Record<CostGroup, number>;
}

function horizonList(H: number): number[] {
  return Array.from(new Set([...STANDARD_HORIZONS, H])).sort((a, b) => a - b);
}

/** Calcul complet d'un véhicule. */
export function calculateVehicleCost(v: VehicleInput, ctx: CalcContext): VehicleResult {
  if (!(ctx.horizonYears > 0)) throw new Error("L'horizon doit être > 0");
  const warnings: string[] = [];
  const kmRes = resolveAnnualKm(v, ctx);
  const km = kmRes.km;
  if (v.annualKm < 0) warnings.push("Kilométrage annuel négatif : vérifiez la saisie.");
  if (km === 0) warnings.push("Kilométrage annuel nul : coût au km non calculable.");

  const energy = calculateEnergyCost(v, km, ctx, warnings);
  const items: CostItem[] = [];
  const informativeItems: CostItem[] = [];

  // Énergie (part foyer)
  const householdShare = 1 - energy.employerSharePct / 100;
  for (const p of energy.parts) {
    const annual = p.annualCost * householdShare;
    const steps: ExplainStep[] = [
      ...kmRes.steps,
      ...(energy.parts.length > 1 ? [{ label: `Km parcourus en ${p.label.toLowerCase()}`, value: fmtKm(Math.round(p.km)) }] : []),
      { label: `Consommation (${p.consumptionSource})`, value: `${fmtNum(p.consumption)} ${p.unit}/100 km` },
      { label: `Prix ${p.label.toLowerCase()} (${p.priceSource})`, value: `${fmtEur(p.price, 3)}/${p.unit}` },
      { label: "Consommation annuelle", value: `${fmtNum(p.annualQuantity)} ${p.unit}`, detail: `${fmtKm(Math.round(p.km))} × ${fmtNum(p.consumption)} / 100` },
      { label: "Coût énergie au km", value: `${fmtEur(p.costPerKm, 3)}/km`, detail: `${fmtNum(p.consumption)} / 100 × ${fmtEur(p.price, 3)}` },
      { label: "Coût énergie annuel", value: fmtEur(p.annualCost), detail: `${fmtNum(p.annualQuantity)} ${p.unit} × ${fmtEur(p.price, 3)}` },
    ];
    if (energy.employerSharePct > 0) {
      steps.push({ label: "Pris en charge par l'employeur", value: fmtPct(energy.employerSharePct, 0) });
      steps.push({ label: "Part foyer annuelle", value: fmtEur(annual) });
    }
    steps.push({ label: "Coût énergie mensuel (foyer)", value: fmtEur(annual / 12) });
    items.push({
      key: `energy-${p.code}`,
      label: `Énergie – ${p.label}`,
      group: "ENERGY",
      nature: "VARIABLE",
      annual,
      monthly: annual / 12,
      isEstimate: true,
      explanation: steps,
    });
  }
  if (energy.employerAnnual > 0) {
    informativeItems.push({
      key: "employerEnergy", label: "Énergie payée par l'employeur (informatif)", group: "ENERGY", nature: "VARIABLE",
      annual: energy.employerAnnual, monthly: energy.employerAnnual / 12, isEstimate: true, informative: true,
      explanation: [
        { label: "Coût énergie total", value: fmtEur(energy.annualTotal) },
        { label: "Part employeur", value: fmtPct(energy.employerSharePct, 0) },
        { label: "Montant non supporté par le foyer", value: fmtEur(energy.employerAnnual) },
      ],
    });
  }

  const company = companyItems(v, ctx, warnings);
  items.push(...company.items);
  informativeItems.push(...company.info);
  items.push(...costLineItems(v, km, warnings));

  const ownership = calculateOwnershipCost(v, ctx, warnings);
  if (ownership) items.push(...ownership.items);
  if (ownership?.result.financing && v.costLines.some((l) => l.category === "LEASING")) {
    warnings.push("Crédit et leasing renseignés sur le même véhicule : risque de double comptage.");
  }

  const H = ctx.horizonYears;
  // Coûts récurrents (hors possession) : constants chaque année
  const ownershipKeys = new Set(ownership?.items.map((i) => i.key) ?? []);
  const runningAnnual = items.filter((i) => !ownershipKeys.has(i.key)).reduce((s, i) => s + i.annual, 0);
  const totalAt = (y: number) => runningAnnual * y + (ownership ? ownership.totalAt(y) : 0);

  const totals = buildTotals(items, totalAt(H), H, km);
  const cumulativeByYear = Array.from({ length: Math.ceil(H) + 1 }, (_, y) => totalAt(Math.min(y, H)));
  const horizonTotals = Object.fromEntries(horizonList(H).map((y) => [y, totalAt(y)]));

  return {
    vehicleId: v.id,
    name: v.name,
    category: v.category,
    powertrain: v.powertrain,
    annualKm: km,
    annualKmSource: kmRes.source,
    energy,
    ownership: ownership?.result ?? null,
    items,
    informativeItems,
    totals,
    cumulativeByYear,
    horizonTotals,
    warnings,
  };
}

function buildTotals(items: CostItem[], horizonTotal: number, H: number, km: number): Totals {
  const byGroup = emptyGroups();
  let fixedAnnual = 0;
  let variableAnnual = 0;
  let energyAnnual = 0;
  for (const i of items) {
    byGroup[i.group] += i.annual;
    if (i.nature === "FIXED") fixedAnnual += i.annual;
    else variableAnnual += i.annual;
    if (i.group === "ENERGY") energyAnnual += i.annual;
  }
  const annual = horizonTotal / H;
  return {
    monthly: annual / 12,
    annual,
    horizon: horizonTotal,
    horizonYears: H,
    perKm: km > 0 ? annual / km : null,
    fixedAnnual,
    variableAnnual,
    energyAnnual,
    byGroup,
  };
}

/** Raccourcis demandés par le cahier des charges. */
export const calculateAnnualCost = (v: VehicleInput, ctx: CalcContext) => calculateVehicleCost(v, ctx).totals.annual;
export const calculateMonthlyCost = (v: VehicleInput, ctx: CalcContext) => calculateVehicleCost(v, ctx).totals.monthly;
export const calculateCostPerKm = (v: VehicleInput, ctx: CalcContext) => calculateVehicleCost(v, ctx).totals.perKm;

/* ================================================================== */
/* Scénarios                                                           */
/* ================================================================== */

export function calculateScenarioCost(
  scenario: ScenarioInput,
  vehicles: VehicleInput[],
  baseCtx: Omit<CalcContext, "scenarioPriceOverrides" | "scenarioAnnualKm">,
): ScenarioResult {
  const ctx: CalcContext = {
    ...baseCtx,
    scenarioPriceOverrides: scenario.priceOverrides,
    scenarioAnnualKm: scenario.annualKmOverrides,
  };
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const warnings: string[] = [];
  const results: VehicleResult[] = [];
  for (const id of scenario.vehicleIds) {
    const v = byId.get(id);
    if (!v) {
      warnings.push(`Véhicule #${id} introuvable (supprimé ?).`);
      continue;
    }
    const r = calculateVehicleCost(v, ctx);
    results.push(r);
    for (const w of r.warnings) warnings.push(`${r.name} : ${w}`);
  }
  if (results.length === 0) warnings.push("Aucun véhicule dans ce scénario.");
  if (scenario.needsTwoCarsSimultaneously && results.length < 2) warnings.push("Le foyer a besoin de deux véhicules simultanément, mais ce scénario en compte moins de deux.");

  const H = ctx.horizonYears;
  const totalKm = results.reduce((s, r) => s + r.annualKm, 0);
  const byGroup = emptyGroups();
  const sum = (f: (t: Totals) => number) => results.reduce((s, r) => s + f(r.totals), 0);
  for (const r of results) for (const g of COST_GROUPS) byGroup[g] += r.totals.byGroup[g];
  const horizonTotal = sum((t) => t.horizon);
  const annual = horizonTotal / H;
  const horizonTotals = Object.fromEntries(horizonList(H).map((y) => [y, results.reduce((s, r) => s + (r.horizonTotals[y] ?? 0), 0)]));
  const cumulativeByYear = Array.from({ length: Math.ceil(H) + 1 }, (_, y) => results.reduce((s, r) => s + r.cumulativeByYear[y], 0));

  return {
    scenarioId: scenario.id,
    name: scenario.name,
    color: scenario.color,
    vehicles: results,
    totalKm,
    totals: {
      monthly: annual / 12,
      annual,
      horizon: horizonTotal,
      horizonYears: H,
      perKm: totalKm > 0 ? annual / totalKm : null,
      fixedAnnual: sum((t) => t.fixedAnnual),
      variableAnnual: sum((t) => t.variableAnnual),
      energyAnnual: sum((t) => t.energyAnnual),
      byGroup,
    },
    cumulativeByYear,
    horizonTotals,
    warnings,
  };
}

/** Compare des scénarios à une référence (économie positive = moins cher). */
export function compareScenarios(results: ScenarioResult[], baselineId?: number): Comparison {
  if (results.length === 0) return { baselineId: baselineId ?? -1, results, diffs: [], cheapestId: null };
  const base = results.find((r) => r.scenarioId === baselineId) ?? results[0];
  const diffs: ScenarioDiff[] = results.map((r) => {
    const monthlySaving = base.totals.monthly - r.totals.monthly;
    const annualSaving = base.totals.annual - r.totals.annual;
    const horizonSavings = Object.fromEntries(
      Object.keys(r.horizonTotals).map((k) => [Number(k), (base.horizonTotals[Number(k)] ?? 0) - r.horizonTotals[Number(k)]]),
    );
    const pctChange = base.totals.annual !== 0 ? ((r.totals.annual - base.totals.annual) / base.totals.annual) * 100 : null;
    let summary: string;
    if (r.scenarioId === base.scenarioId) summary = "Scénario de référence.";
    else if (Math.abs(monthlySaving) < 0.5) summary = `Coût équivalent à « ${base.name} ».`;
    else if (monthlySaving > 0)
      summary = `Cette configuration permet d'économiser ${fmtEur(monthlySaving, 0)}/mois, soit ${fmtEur(annualSaving, 0)}/an par rapport à « ${base.name} ».`;
    else summary = `Cette configuration coûte ${fmtEur(-monthlySaving, 0)}/mois de plus, soit ${fmtEur(-annualSaving, 0)}/an par rapport à « ${base.name} ».`;
    return { scenarioId: r.scenarioId, name: r.name, monthlySaving, annualSaving, horizonSavings, pctChange, summary };
  });
  const cheapest = results.reduce((a, b) => (b.totals.horizon < a.totals.horizon ? b : a));
  return { baselineId: base.scenarioId, results, diffs, cheapestId: cheapest.scenarioId };
}

/** Recalcule un scénario avec des ajustements "Et si…" sans toucher aux données. */
export function simulateScenario(
  scenario: ScenarioInput,
  vehicles: VehicleInput[],
  baseCtx: Omit<CalcContext, "scenarioPriceOverrides" | "scenarioAnnualKm">,
  adjustments: Adjustments,
): { base: ScenarioResult; simulated: ScenarioResult } {
  const base = calculateScenarioCost(scenario, vehicles, { ...baseCtx, adjustments: undefined });
  const simulated = calculateScenarioCost(scenario, vehicles, { ...baseCtx, adjustments });
  return { base, simulated };
}

/** Sensibilité du coût annuel d'un scénario au prix d'une énergie. */
export function energyPriceSensitivity(
  scenario: ScenarioInput,
  vehicles: VehicleInput[],
  baseCtx: Omit<CalcContext, "scenarioPriceOverrides" | "scenarioAnnualKm">,
  energyCode: string,
  prices: number[],
): { price: number; codeAnnual: number; energyAnnual: number; totalAnnual: number }[] {
  return prices.map((price) => {
    const r = calculateScenarioCost(scenario, vehicles, {
      ...baseCtx,
      adjustments: { ...baseCtx.adjustments, energyPrices: { ...baseCtx.adjustments?.energyPrices, [energyCode]: price } },
    });
    // coût de la seule énergie testée, part foyer
    const codeAnnual = r.vehicles.reduce(
      (s, v) => s + v.energy.parts.filter((p) => p.code === energyCode).reduce((a, p) => a + p.annualCost, 0) * (1 - v.energy.employerSharePct / 100),
      0,
    );
    return { price, codeAnnual, energyAnnual: r.totals.energyAnnual, totalAnnual: r.totals.annual };
  });
}

/** Génère une plage de prix régulière (bornes incluses). */
export function priceRange(min: number, max: number, steps: number): number[] {
  if (steps < 2 || max <= min) return [min];
  return Array.from({ length: steps }, (_, i) => Math.round((min + ((max - min) * i) / (steps - 1)) * 1000) / 1000);
}
