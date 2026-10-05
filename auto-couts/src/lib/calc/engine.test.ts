import { describe, expect, it } from "vitest";
import {
  calculateAnnualCost,
  calculateCostPerKm,
  calculateEnergyCost,
  calculateMonthlyCost,
  calculateScenarioCost,
  calculateVehicleCost,
  compareScenarios,
  energyPriceSensitivity,
  priceRange,
  simulateScenario,
} from "./engine";
import { amortizationAt, annuityPayment, impliedAnnualRate } from "./finance";
import type { CalcContext, VehicleInput } from "./types";

const prices = {
  GASOLINE: { code: "GASOLINE", label: "Essence", unit: "L", price: 1.8 },
  DIESEL: { code: "DIESEL", label: "Diesel", unit: "L", price: 1.7 },
  ELECTRICITY: { code: "ELECTRICITY", label: "Électricité", unit: "kWh", price: 0.25 },
  LPG: { code: "LPG", label: "GPL", unit: "L", price: 1.0 },
};

const ctx = (over: Partial<CalcContext> = {}): CalcContext => ({
  prices,
  method: "ECONOMIC",
  horizonYears: 5,
  defaultBenefitTaxRate: 41.2,
  ...over,
});

const vehicle = (over: Partial<VehicleInput> = {}): VehicleInput => ({
  id: 1,
  name: "Test",
  category: "NEW",
  powertrain: "GASOLINE",
  fuelEnergyCode: "GASOLINE",
  fuelConsumption: 6,
  annualKm: 15000,
  costLines: [],
  ...over,
});

const gasolineCompany = vehicle({ id: 1, name: "Fonction essence", category: "COMPANY", companyMonthlyFee: 450 });
const dieselCompany = vehicle({
  id: 2,
  name: "Fonction diesel",
  category: "COMPANY",
  powertrain: "DIESEL",
  fuelEnergyCode: "DIESEL",
  fuelConsumption: 5.5,
  annualKm: 20000,
  companyMonthlyFee: 500,
});
const usedEv = vehicle({
  id: 3,
  name: "EV occasion",
  category: "USED",
  powertrain: "ELECTRIC",
  fuelEnergyCode: null,
  fuelConsumption: null,
  elecConsumption: 17,
  annualKm: 18000,
  purchasePrice: 25000,
  residualValue: 13000,
  holdingYears: 4,
});

describe("coût énergétique", () => {
  it("essence : 15 000 km, 6 L/100, 1,80 €/L → 900 L, 1 620 €/an, 135 €/mois", () => {
    const e = calculateEnergyCost(vehicle(), 15000, ctx());
    expect(e.parts[0].annualQuantity).toBeCloseTo(900);
    expect(e.annualTotal).toBeCloseTo(1620);
    expect(e.annualTotal / 12).toBeCloseTo(135);
    expect(e.parts[0].costPerKm).toBeCloseTo(0.108);
  });

  it("exemple de l'énoncé : 15 000 km, 6,5 L/100, 1,85 €/L → 975 L, 1 803,75 €", () => {
    const e = calculateEnergyCost(vehicle({ fuelConsumption: 6.5 }), 15000, ctx({ prices: { ...prices, GASOLINE: { ...prices.GASOLINE, price: 1.85 } } }));
    expect(e.parts[0].annualQuantity).toBeCloseTo(975);
    expect(e.annualTotal).toBeCloseTo(1803.75);
    expect(e.annualTotal / 12).toBeCloseTo(150.3125);
  });

  it("diesel : 20 000 km, 5,5 L/100, 1,70 €/L → 1 100 L, 1 870 €/an", () => {
    const e = calculateEnergyCost(dieselCompany, 20000, ctx());
    expect(e.parts[0].annualQuantity).toBeCloseTo(1100);
    expect(e.annualTotal).toBeCloseTo(1870);
  });

  it("électrique : 18 000 km, 17 kWh/100, 0,25 €/kWh → 3 060 kWh, 765 €/an", () => {
    const e = calculateEnergyCost(usedEv, 18000, ctx());
    expect(e.parts).toHaveLength(1);
    expect(e.parts[0].code).toBe("ELECTRICITY");
    expect(e.parts[0].annualQuantity).toBeCloseTo(3060);
    expect(e.annualTotal).toBeCloseTo(765);
  });

  it("hybride rechargeable : répartition km électriques / thermiques", () => {
    const phev = vehicle({ powertrain: "PHEV", fuelConsumption: 6, elecConsumption: 18, electricKmShare: 40, annualKm: 20000 });
    const e = calculateEnergyCost(phev, 20000, ctx());
    const fuel = e.parts.find((p) => p.code === "GASOLINE")!;
    const elec = e.parts.find((p) => p.code === "ELECTRICITY")!;
    expect(fuel.km).toBeCloseTo(12000);
    expect(elec.km).toBeCloseTo(8000);
    expect(fuel.annualCost).toBeCloseTo(720 * 1.8); // 1 296 €
    expect(elec.annualCost).toBeCloseTo(1440 * 0.25); // 360 €
    expect(e.annualTotal).toBeCloseTo(1656);
  });

  it("hybride rechargeable sans répartition : 0 % électrique + avertissement", () => {
    const w: string[] = [];
    const e = calculateEnergyCost(vehicle({ powertrain: "PHEV", elecConsumption: 18 }), 10000, ctx(), w);
    expect(e.annualTotal).toBeCloseTo(10000 * 0.06 * 1.8);
    expect(w.some((x) => x.includes("part de km électriques"))).toBe(true);
  });

  it("hybride non rechargeable : carburant uniquement", () => {
    const e = calculateEnergyCost(vehicle({ powertrain: "HYBRID", fuelConsumption: 4.5 }), 10000, ctx());
    expect(e.annualTotal).toBeCloseTo(450 * 1.8);
  });

  it("la consommation réelle est prioritaire sur la consommation constructeur", () => {
    const e = calculateEnergyCost(vehicle({ fuelConsumption: 6, fuelConsumptionReal: 7 }), 10000, ctx());
    expect(e.parts[0].consumption).toBe(7);
    expect(e.parts[0].consumptionSource).toBe("réelle");
    expect(e.annualTotal).toBeCloseTo(700 * 1.8);
  });

  it("priorité des prix : simulation > scénario > véhicule > global", () => {
    const v = vehicle({ fuelPriceOverride: 1.5 });
    expect(calculateEnergyCost(v, 10000, ctx()).parts[0]).toMatchObject({ price: 1.5, priceSource: "véhicule" });
    expect(calculateEnergyCost(v, 10000, ctx({ scenarioPriceOverrides: { GASOLINE: 1.6 } })).parts[0]).toMatchObject({ price: 1.6, priceSource: "scénario" });
    expect(
      calculateEnergyCost(v, 10000, ctx({ scenarioPriceOverrides: { GASOLINE: 1.6 }, adjustments: { energyPrices: { GASOLINE: 2.2 } } })).parts[0],
    ).toMatchObject({ price: 2.2, priceSource: "simulation" });
  });

  it("consommation manquante : coût 0 et avertissement explicite", () => {
    const r = calculateVehicleCost(vehicle({ fuelConsumption: null }), ctx());
    expect(r.energy.annualTotal).toBe(0);
    expect(r.warnings.some((w) => w.includes("Consommation"))).toBe(true);
  });
});

describe("voiture de fonction", () => {
  it("redevance + énergie : 450 + 135 = 585 €/mois, 7 020 €/an, 0,468 €/km", () => {
    const c = ctx();
    expect(calculateMonthlyCost(gasolineCompany, c)).toBeCloseTo(585);
    expect(calculateAnnualCost(gasolineCompany, c)).toBeCloseTo(7020);
    expect(calculateCostPerKm(gasolineCompany, c)).toBeCloseTo(0.468);
  });

  it("énergie prise en charge par l'employeur : exclue du coût foyer, affichée en informatif", () => {
    const r = calculateVehicleCost({ ...gasolineCompany, employerEnergySharePct: 100 }, ctx());
    expect(r.totals.monthly).toBeCloseTo(450);
    expect(r.energy.annualTotal).toBeCloseTo(1620);
    expect(r.informativeItems.find((i) => i.key === "employerEnergy")?.annual).toBeCloseTo(1620);
  });

  it("prise en charge partielle (50 %)", () => {
    const r = calculateVehicleCost({ ...gasolineCompany, employerEnergySharePct: 50 }, ctx());
    expect(r.totals.energyAnnual).toBeCloseTo(810);
  });

  it("avantage en nature × taux par défaut / taux véhicule / surcoût saisi / simulation", () => {
    const base = { ...gasolineCompany, benefitInKindMonthly: 200, fuelConsumption: null };
    const tax = (v: VehicleInput, c = ctx()) => calculateVehicleCost(v, c).totals.byGroup.TAX / 12;
    expect(tax(base)).toBeCloseTo(82.4);
    expect(tax({ ...base, benefitTaxRate: 30 })).toBeCloseTo(60);
    expect(tax({ ...base, taxCostMonthlyOverride: 55 })).toBeCloseTo(55);
    expect(tax({ ...base, taxCostMonthlyOverride: 55 }, ctx({ adjustments: { benefitTaxRate: 50 } }))).toBeCloseTo(100);
  });

  it("le coût employeur est informatif et jamais additionné", () => {
    const r = calculateVehicleCost({ ...gasolineCompany, employerMonthlyCost: 900 }, ctx());
    expect(r.totals.monthly).toBeCloseTo(585);
    expect(r.informativeItems.some((i) => i.key === "employerCost")).toBe(true);
  });

  it("aucun coût d'achat n'est compté pour une voiture de fonction", () => {
    const r = calculateVehicleCost({ ...gasolineCompany, purchasePrice: 40000 }, ctx());
    expect(r.ownership).toBeNull();
    expect(r.totals.monthly).toBeCloseTo(585);
  });
});

describe("lignes de coûts", () => {
  it("mensuel, annuel et au km ; distinction fixe / variable", () => {
    const v = vehicle({
      fuelConsumption: null,
      purchasePrice: undefined,
      category: "COMPANY",
      companyMonthlyFee: 0,
      costLines: [
        { label: "Assurance", category: "INSURANCE", frequency: "MONTHLY", amount: 80 },
        { label: "Pneus", category: "TIRES", frequency: "PER_KM", amount: 0.02 },
        { label: "Entretien", category: "MAINTENANCE", frequency: "ANNUAL", amount: 400 },
      ],
    });
    const r = calculateVehicleCost(v, ctx());
    expect(r.totals.byGroup.INSURANCE).toBeCloseTo(960);
    expect(r.totals.byGroup.TIRES).toBeCloseTo(300);
    expect(r.totals.byGroup.MAINTENANCE).toBeCloseTo(400);
    expect(r.totals.fixedAnnual).toBeCloseTo(960);
    expect(r.totals.variableAnnual).toBeCloseTo(700);
    expect(r.totals.annual).toBeCloseTo(1660);
  });
});

describe("financement", () => {
  it("mensualité d'un crédit amortissable", () => {
    expect(annuityPayment(20000, 5, 48)).toBeCloseTo(460.59, 2);
    expect(annuityPayment(12000, 0, 24)).toBeCloseTo(500);
  });

  it("échéancier : capital soldé en fin de crédit, intérêts cohérents", () => {
    const p = annuityPayment(20000, 5, 48);
    const end = amortizationAt(20000, 5, 48, p, 48);
    expect(end.balance).toBeCloseTo(0, 6);
    expect(end.interestPaid).toBeCloseTo(p * 48 - 20000, 4);
    const mid = amortizationAt(20000, 5, 48, p, 24);
    expect(mid.balance).toBeGreaterThan(9000);
    expect(mid.balance).toBeLessThan(10500);
  });

  it("taux implicite à partir d'une mensualité", () => {
    expect(impliedAnnualRate(20000, annuityPayment(20000, 4.5, 60), 60)).toBeCloseTo(4.5, 4);
    expect(impliedAnnualRate(20000, 100, 60)).toBeNull();
  });
});

describe("possession : décote et méthodes", () => {
  const bought = vehicle({
    fuelConsumption: null,
    purchasePrice: 25000,
    downPayment: 5000,
    loanMonths: 48,
    loanRatePct: 5,
    residualValue: 13000,
    holdingYears: 4,
  });
  const payment = annuityPayment(20000, 5, 48);
  const interest = payment * 48 - 20000;

  it("décote seule : (25 000 − 13 000) / 4 ans = 3 000 €/an", () => {
    const r = calculateVehicleCost(usedEv, ctx());
    expect(r.ownership?.depreciationAnnual).toBeCloseTo(3000);
    expect(r.totals.byGroup.FINANCING).toBeCloseTo(3000);
    expect(r.totals.annual).toBeCloseTo(3000 + 765);
  });

  it("économique : décote + intérêts, mensualités non recomptées", () => {
    const r = calculateVehicleCost(bought, ctx());
    expect(r.ownership?.financing?.monthlyPayment).toBeCloseTo(payment);
    expect(r.ownership?.interestDuringHolding).toBeCloseTo(interest, 4);
    expect(r.totals.annual).toBeCloseTo(3000 + interest / 4, 4);
    // indépendant de l'horizon
    expect(calculateVehicleCost(bought, ctx({ horizonYears: 10 })).totals.annual).toBeCloseTo(r.totals.annual, 6);
  });

  it("trésorerie sur la durée de détention : apport + mensualités − revente", () => {
    const r = calculateVehicleCost(bought, ctx({ method: "CASH", horizonYears: 4 }));
    expect(r.totals.horizon).toBeCloseTo(5000 + payment * 48 - 13000, 4);
    // sur un cycle complet, trésorerie et coût économique coïncident
    const eco = calculateVehicleCost(bought, ctx({ horizonYears: 4 }));
    expect(r.totals.horizon).toBeCloseTo(eco.totals.horizon, 4);
  });

  it("trésorerie au-delà de la détention : renouvellement + véhicule encore détenu signalé", () => {
    const r = calculateVehicleCost(bought, ctx({ method: "CASH", horizonYears: 5 }));
    const secondCycle = 5000 + amortizationAt(20000, 5, 48, payment, 12).paymentsMade;
    expect(r.totals.horizon).toBeCloseTo(5000 + payment * 48 - 13000 + secondCycle, 4);
    expect(r.ownership?.remainingValueAtHorizon).toBeCloseTo(25000 - 12000 / 4, 4);
    expect(r.warnings.some((w) => w.includes("encore détenu"))).toBe(true);
  });

  it("trésorerie avec crédit plus long que la détention : solde du capital à la revente", () => {
    const v = { ...bought, loanMonths: 72 };
    const p = annuityPayment(20000, 5, 72);
    const balance = amortizationAt(20000, 5, 72, p, 48).balance;
    const r = calculateVehicleCost(v, ctx({ method: "CASH", horizonYears: 4 }));
    expect(r.totals.horizon).toBeCloseTo(5000 + p * 48 + balance - 13000, 4);
  });

  it("mensualité saisie prioritaire sur le calcul", () => {
    const r = calculateVehicleCost({ ...bought, monthlyPayment: 470 }, ctx());
    expect(r.ownership?.financing?.monthlyPaymentSource).toBe("saisie");
    expect(r.ownership?.financing?.totalInterest).toBeCloseTo(470 * 48 - 20000);
  });

  it("durée de détention et revente manquantes : valeurs par défaut signalées", () => {
    const r = calculateVehicleCost(vehicle({ fuelConsumption: null, purchasePrice: 10000 }), ctx());
    expect(r.ownership?.holdingYears).toBe(5);
    expect(r.ownership?.depreciationAnnual).toBeCloseTo(2000);
    expect(r.warnings.some((w) => w.includes("Durée de détention"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("Valeur de revente"))).toBe(true);
  });
});

describe("garde-fous", () => {
  it("kilométrage nul : pas de division par zéro, coût/km null", () => {
    const r = calculateVehicleCost(vehicle({ annualKm: 0 }), ctx());
    expect(r.totals.perKm).toBeNull();
    expect(r.warnings.some((w) => w.includes("Kilométrage annuel nul"))).toBe(true);
  });

  it("horizon invalide refusé", () => {
    expect(() => calculateVehicleCost(vehicle(), ctx({ horizonYears: 0 }))).toThrow();
  });
});

describe("scénarios et comparaison", () => {
  const vehicles = [gasolineCompany, dieselCompany, usedEv];
  const current = { id: 10, name: "Actuel", vehicleIds: [1, 2] };
  const alt = { id: 11, name: "Fonction + EV", vehicleIds: [1, 3] };

  it("coût d'un scénario = somme des véhicules ; coût/km sur km cumulés", () => {
    const r = calculateScenarioCost(current, vehicles, ctx());
    // (450 + 135) + (500 + 1870/12)
    const monthly = 585 + 500 + 1870 / 12;
    expect(r.totals.monthly).toBeCloseTo(monthly);
    expect(r.totals.annual).toBeCloseTo(monthly * 12);
    expect(r.totalKm).toBe(35000);
    expect(r.totals.perKm).toBeCloseTo((monthly * 12) / 35000);
    expect(r.horizonTotals[5]).toBeCloseTo(monthly * 12 * 5);
    expect(r.cumulativeByYear).toHaveLength(6);
  });

  it("km spécifique au scénario", () => {
    const r = calculateScenarioCost({ ...current, annualKmOverrides: { 1: 10000 } }, vehicles, ctx());
    expect(r.vehicles[0].annualKm).toBe(10000);
    expect(r.vehicles[0].annualKmSource).toBe("scénario");
  });

  it("comparaison : économies mensuelles, annuelles, horizons, pourcentage", () => {
    const c = ctx();
    const a = calculateScenarioCost(current, vehicles, c);
    const b = calculateScenarioCost(alt, vehicles, c);
    const cmp = compareScenarios([a, b], 10);
    const d = cmp.diffs.find((x) => x.scenarioId === 11)!;
    // Actuel : diesel 500 + 155,83 = 655,83 €/mois ; EV : (3000 + 765) / 12 = 313,75 €/mois
    expect(d.monthlySaving).toBeCloseTo(500 + 1870 / 12 - 3765 / 12);
    expect(d.annualSaving).toBeCloseTo(d.monthlySaving * 12);
    expect(d.horizonSavings[5]).toBeCloseTo(d.annualSaving * 5);
    expect(d.horizonSavings[10]).toBeCloseTo(d.annualSaving * 10);
    expect(d.pctChange).toBeCloseTo(((b.totals.annual - a.totals.annual) / a.totals.annual) * 100);
    expect(d.summary).toContain("économiser");
    expect(cmp.cheapestId).toBe(11);
  });

  it("besoin de deux véhicules signalé", () => {
    const r = calculateScenarioCost({ id: 1, name: "x", vehicleIds: [1], needsTwoCarsSimultaneously: true }, vehicles, ctx());
    expect(r.warnings.some((w) => w.includes("deux véhicules"))).toBe(true);
  });
});

describe("simulation « Et si… »", () => {
  const vehicles = [gasolineCompany, dieselCompany, usedEv];
  const scen = { id: 1, name: "Actuel", vehicleIds: [1, 2] };

  it("essence à 2,20 €/L : recalcul sans modifier les données", () => {
    const before = JSON.stringify(vehicles);
    const { base, simulated } = simulateScenario(scen, vehicles, ctx(), { energyPrices: { GASOLINE: 2.2 } });
    expect(simulated.vehicles[0].energy.annualTotal).toBeCloseTo(15000 * 0.06 * 2.2);
    expect(base.vehicles[0].energy.annualTotal).toBeCloseTo(1620);
    expect(JSON.stringify(vehicles)).toBe(before);
  });

  it("kilométrage, redevance et durée de détention", () => {
    const { simulated } = simulateScenario(scen, vehicles, ctx(), { annualKmByVehicle: { 1: 20000 }, companyFeeDelta: 50 });
    expect(simulated.vehicles[0].annualKm).toBe(20000);
    expect(simulated.vehicles[0].totals.monthly).toBeCloseTo(500 + (20000 * 0.06 * 1.8) / 12);
    const pct = simulateScenario(scen, vehicles, ctx(), { kmChangePct: 20 }).simulated;
    expect(pct.totalKm).toBeCloseTo(42000);
    const hold = simulateScenario({ id: 2, name: "EV", vehicleIds: [3] }, vehicles, ctx(), { holdingYears: 6 }).simulated;
    expect(hold.vehicles[0].ownership?.depreciationAnnual).toBeCloseTo(2000);
  });

  it("sensibilité : seule l'énergie testée varie, les autres restent dans le total", () => {
    const s = energyPriceSensitivity({ id: 4, name: "Mixte", vehicleIds: [1, 3] }, vehicles, ctx(), "ELECTRICITY", [0.1, 0.2]);
    expect(s[0].codeAnnual).toBeCloseTo(306);
    expect(s[0].energyAnnual).toBeCloseTo(306 + 1620);
    expect(s[1].totalAnnual - s[0].totalAnnual).toBeCloseTo(306);
  });

  it("sensibilité au prix de l'électricité", () => {
    const s = energyPriceSensitivity({ id: 3, name: "EV", vehicleIds: [3] }, vehicles, ctx(), "ELECTRICITY", priceRange(0.15, 0.3, 4));
    expect(s.map((x) => x.price)).toEqual([0.15, 0.2, 0.25, 0.3]);
    expect(s[0].energyAnnual).toBeCloseTo(3060 * 0.15);
    expect(s[0].codeAnnual).toBeCloseTo(3060 * 0.15);
    expect(s[3].energyAnnual).toBeCloseTo(3060 * 0.3);
    expect(s[1].totalAnnual - s[0].totalAnnual).toBeCloseTo(3060 * 0.05);
  });
});
