import { describe, expect, it } from "vitest";
import {
  combinationLabelParts,
  generateScenarioCombinations,
  isCombinationValid,
} from "@/domain/pricing";
import { line, money, scenario, service } from "./helpers";

/** Exemple de la spécification. */
function specExample() {
  return scenario({
    subscriptions: [line("S1", 100), line("S2", 150)],
    services: [service("Service 1", 25, [line("Option", 10)]), service("Service 2", 30)],
  });
}

describe("generateScenarioCombinations", () => {
  it("produit cartésien souscriptions × packages de services (exemple de la spec)", () => {
    const combos = generateScenarioCombinations(specExample());
    expect(combos.map((c) => combinationLabelParts(c).join(" + "))).toEqual([
      "S1 + Service 1 + Option",
      "S1 + Service 2",
      "S2 + Service 1 + Option",
      "S2 + Service 2",
    ]);
    expect(
      combos.map((c) => [money(c.annualTotal), money(c.oneShotTotal), money(c.firstYearTotal)]),
    ).toEqual([
      ["100.00", "35.00", "135.00"],
      ["100.00", "30.00", "130.00"],
      ["150.00", "35.00", "185.00"],
      ["150.00", "30.00", "180.00"],
    ]);
  });

  it("8. combinaison S1 + Service1", () => {
    const [combo] = generateScenarioCombinations(
      scenario({ subscriptions: [line("S1", 100)], services: [service("Service1", 25)] }),
    );
    expect(combo).toBeDefined();
    expect(combo!.subscription?.code).toBe("S1");
    expect(combo!.services.map((s) => s.code)).toEqual(["Service1"]);
    expect(money(combo!.firstYearTotal)).toBe("125.00");
  });

  it("maintenances et options additionnelles sont communes à toutes les combinaisons", () => {
    const combos = generateScenarioCombinations(
      scenario({
        subscriptions: [line("S1", 100), line("S2", 200)],
        services: [service("SVC", 50)],
        maintenances: [line("M", 20)],
        additionalOptions: [line("Free", 5)],
      }),
    );
    expect(combos).toHaveLength(2);
    for (const c of combos) {
      expect(money(c.oneShotTotal)).toBe("75.00");
      expect(c.maintenance).toHaveLength(1);
      expect(c.additionalOptions).toHaveLength(1);
    }
  });

  it("sans service : une combinaison par souscription", () => {
    const combos = generateScenarioCombinations(
      scenario({ subscriptions: [line("S1", 100), line("S2", 150)] }),
    );
    expect(combos.map((c) => money(c.firstYearTotal))).toEqual(["100.00", "150.00"]);
  });

  it("sans souscription : une combinaison par package de services", () => {
    const combos = generateScenarioCombinations(
      scenario({ services: [service("A", 10), service("B", 20)] }),
    );
    expect(combos.map((c) => money(c.annualTotal))).toEqual(["0.00", "0.00"]);
    expect(combos.map((c) => money(c.oneShotTotal))).toEqual(["10.00", "20.00"]);
  });

  it("scénario vide : aucune combinaison", () => {
    expect(generateScenarioCombinations(scenario())).toEqual([]);
  });

  it("les clés de combinaison sont stables et uniques", () => {
    const s = specExample();
    const a = generateScenarioCombinations(s).map((c) => c.key);
    const b = generateScenarioCombinations(s).map((c) => c.key);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(4);
  });

  it("un validateur de compatibilité peut filtrer les combinaisons (point d'extension)", () => {
    const combos = generateScenarioCombinations(specExample(), {
      isValid: (c) => !(c.subscription?.code === "S1" && c.services[0]?.code === "Service 2"),
    });
    expect(combos).toHaveLength(3);
  });

  it("V1 : isCombinationValid retourne toujours true", () => {
    for (const c of generateScenarioCombinations(specExample())) {
      expect(isCombinationValid(c)).toBe(true);
    }
  });
});
