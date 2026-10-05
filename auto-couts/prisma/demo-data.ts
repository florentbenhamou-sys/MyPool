import type { Backup } from "../src/lib/backup";

/** Données de démonstration chargées au premier lancement (prix indicatifs, à ajuster). */
export const demoData: Backup = {
  version: 1,
  settings: { defaultBenefitTaxRate: 41.2, defaultHorizonYears: 5, costMethod: "ECONOMIC", referenceScenarioId: 1 },
  energyTypes: [
    { code: "GASOLINE", label: "Essence", unit: "L", price: 1.8, sortOrder: 1 },
    { code: "DIESEL", label: "Diesel", unit: "L", price: 1.7, sortOrder: 2 },
    { code: "ELECTRICITY", label: "Électricité", unit: "kWh", price: 0.25, isElectric: true, sortOrder: 3 },
    { code: "LPG", label: "GPL", unit: "L", price: 1.0, sortOrder: 4 },
    { code: "E85", label: "Superéthanol E85", unit: "L", price: 0.85, sortOrder: 5 },
  ],
  vehicles: [
    {
      id: 1, name: "Voiture de fonction 1", brand: "Peugeot", model: "308", version: "PureTech 130", year: 2024,
      category: "COMPANY", powertrain: "GASOLINE", fuelEnergyCode: "GASOLINE", fuelConsumption: 6.5,
      annualKm: 15000, currentMileage: 32000, companyMonthlyFee: 450, employerEnergySharePct: 0,
      notes: "Exemple : redevance prélevée sur salaire, carburant payé par le foyer.", costLines: [],
    },
    {
      id: 2, name: "Voiture de fonction 2", brand: "Skoda", model: "Octavia Combi", version: "2.0 TDI 150", year: 2023,
      category: "COMPANY", powertrain: "DIESEL", fuelEnergyCode: "DIESEL", fuelConsumption: 5.5,
      annualKm: 20000, currentMileage: 54000, companyMonthlyFee: 500, employerEnergySharePct: 0, costLines: [],
    },
    {
      id: 3, name: "Électrique d'occasion", brand: "Tesla", model: "Model 3", version: "Propulsion", year: 2021,
      category: "USED", powertrain: "ELECTRIC", elecConsumption: 15, elecConsumptionReal: 17,
      annualKm: 18000, mileageAtPurchase: 60000, purchasePrice: 25000, residualValue: 15000, holdingYears: 5,
      costLines: [
        { label: "Assurance tous risques", category: "INSURANCE", frequency: "MONTHLY", amount: 70, isEstimate: true },
        { label: "Entretien annuel", category: "MAINTENANCE", frequency: "ANNUAL", amount: 350, isEstimate: true },
        { label: "Pneus", category: "TIRES", frequency: "PER_KM", amount: 0.012, isEstimate: true },
        { label: "Provision réparations (occasion)", category: "REPAIRS", frequency: "ANNUAL", amount: 300, isEstimate: true },
      ],
    },
    {
      id: 4, name: "SUV hybride neuf", brand: "Peugeot", model: "3008", version: "Hybrid 145", year: 2026,
      category: "NEW", powertrain: "HYBRID", fuelEnergyCode: "GASOLINE", fuelConsumption: 5.5, fuelConsumptionReal: 6,
      annualKm: 20000, purchasePrice: 38000, downPayment: 8000, loanMonths: 60, loanRatePct: 4.9, residualValue: 19000, holdingYears: 5,
      costLines: [
        { label: "Assurance", category: "INSURANCE", frequency: "MONTHLY", amount: 90, isEstimate: true },
        { label: "Entretien constructeur", category: "MAINTENANCE", frequency: "ANNUAL", amount: 300, isEstimate: true },
        { label: "Pneus", category: "TIRES", frequency: "PER_KM", amount: 0.015, isEstimate: true },
      ],
    },
    {
      id: 5, name: "Citadine électrique d'occasion", brand: "Renault", model: "Zoé", version: "R110", year: 2020,
      category: "USED", powertrain: "ELECTRIC", elecConsumption: 15,
      annualKm: 15000, mileageAtPurchase: 45000, purchasePrice: 11000, residualValue: 6000, holdingYears: 4,
      costLines: [
        { label: "Assurance", category: "INSURANCE", frequency: "MONTHLY", amount: 45, isEstimate: true },
        { label: "Entretien", category: "MAINTENANCE", frequency: "ANNUAL", amount: 250, isEstimate: true },
        { label: "Pneus", category: "TIRES", frequency: "PER_KM", amount: 0.01, isEstimate: true },
      ],
    },
  ],
  scenarios: [
    {
      id: 1, name: "Situation actuelle", description: "Deux voitures de fonction.", color: "#2a78d6",
      adults: 2, children: 2, needsTwoCarsSimultaneously: true,
      vehicles: [{ vehicleId: 1 }, { vehicleId: 2 }], priceOverrides: [],
    },
    {
      id: 2, name: "Fonction + électrique d'occasion", color: "#eb6834",
      description: "La voiture de fonction diesel est remplacée par une Tesla d'occasion rechargée en heures creuses.",
      adults: 2, children: 2, needsTwoCarsSimultaneously: true,
      vehicles: [{ vehicleId: 1 }, { vehicleId: 3, annualKmOverride: 20000 }],
      priceOverrides: [{ energyCode: "ELECTRICITY", price: 0.2 }],
    },
    {
      id: 3, name: "Deux voitures personnelles", color: "#1baf7a",
      description: "SUV hybride neuf à crédit + citadine électrique d'occasion.",
      adults: 2, children: 2, needsTwoCarsSimultaneously: true,
      vehicles: [{ vehicleId: 4 }, { vehicleId: 5, annualKmOverride: 15000 }], priceOverrides: [],
    },
  ],
  simulations: [],
};
