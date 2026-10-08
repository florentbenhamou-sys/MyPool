import { describe, expect, it } from "vitest";
import {
  calculateProductSummary,
  calculateProposalSummary,
  generateScenarioCombinations,
} from "@/domain/pricing";
import { line, money, scenario, service } from "./helpers";

describe("calculateProductSummary", () => {
  it("les scénarios sont des alternatives, jamais additionnés", () => {
    const summary = calculateProductSummary({
      id: "p1",
      name: "Produit",
      scenarios: [
        scenario({ name: "Standard", subscriptions: [line("S", 1000)] }),
        scenario({
          name: "Premium",
          subscriptions: [line("P", 2000)],
          services: [service("X", 500)],
        }),
      ],
    });
    expect(summary.scenarios).toHaveLength(2);
    expect(summary.alternatives).toHaveLength(2);
    expect(money(summary.range!.min.firstYearTotal)).toBe("1000.00");
    expect(money(summary.range!.max.firstYearTotal)).toBe("2500.00");
  });

  it("un scénario à plusieurs combinaisons donne plusieurs alternatives", () => {
    const summary = calculateProductSummary({
      id: "p1",
      name: "Produit",
      scenarios: [
        scenario({
          subscriptions: [line("S1", 100), line("S2", 150)],
          services: [service("Service 1", 25, [line("Option", 10)]), service("Service 2", 30)],
        }),
      ],
    });
    expect(summary.scenarios[0]!.hasAlternatives).toBe(true);
    expect(summary.alternatives).toHaveLength(4);
    expect(money(summary.range!.min.firstYearTotal)).toBe("130.00");
    expect(money(summary.range!.max.firstYearTotal)).toBe("185.00");
  });

  it("une combinaison retenue remplace les alternatives du scénario", () => {
    const s = scenario({
      subscriptions: [line("S1", 100), line("S2", 150)],
      services: [service("Service 1", 25)],
    });
    const key = generateScenarioCombinations(s)[1]!.key;
    const summary = calculateProductSummary({
      id: "p1",
      name: "Produit",
      scenarios: [{ ...s, selectedCombinationKey: key }],
    });
    expect(summary.alternatives).toHaveLength(1);
    expect(money(summary.alternatives[0]!.firstYearTotal)).toBe("175.00");
  });
});

describe("calculateProposalSummary", () => {
  it("proposition vide", () => {
    const s = calculateProposalSummary({ id: "x", products: [] });
    expect(s.total.kind).toBe("EMPTY");
    expect(s.productCount).toBe(0);
  });

  it("une alternative par produit : les produits s'additionnent (total sans ambiguïté)", () => {
    const s = calculateProposalSummary({
      id: "x",
      contractDurationMonths: 36,
      products: [
        {
          id: "a",
          name: "A",
          scenarios: [
            scenario({ subscriptions: [line("S", 1000)], services: [service("X", 500)] }),
          ],
        },
        { id: "b", name: "B", scenarios: [scenario({ subscriptions: [line("T", 200)] })] },
      ],
    });
    expect(s.productCount).toBe(2);
    expect(s.scenarioCount).toBe(2);
    expect(s.total.kind).toBe("SINGLE");
    if (s.total.kind !== "SINGLE") return;
    expect(money(s.total.totals.annualTotal)).toBe("1200.00");
    expect(money(s.total.totals.oneShotTotal)).toBe("500.00");
    expect(money(s.total.totals.firstYearTotal)).toBe("1700.00");
    expect(money(s.total.contractTotal!)).toBe("4100.00");
  });

  it("plusieurs scénarios : fourchette, jamais la somme des alternatives", () => {
    const s = calculateProposalSummary({
      id: "x",
      products: [
        {
          id: "a",
          name: "A",
          scenarios: [
            scenario({ subscriptions: [line("S", 1000)] }),
            scenario({ subscriptions: [line("P", 3000)] }),
          ],
        },
        { id: "b", name: "B", scenarios: [scenario({ services: [service("X", 100)] })] },
      ],
    });
    expect(s.total.kind).toBe("RANGE");
    if (s.total.kind !== "RANGE") return;
    expect(money(s.total.range.min.firstYearTotal)).toBe("1100.00");
    expect(money(s.total.range.max.firstYearTotal)).toBe("3100.00");
    // La somme aveugle (4100) ne doit apparaître nulle part.
    expect(money(s.total.range.max.firstYearTotal)).not.toBe("4100.00");
  });

  it("fourchette sur la durée du contrat calculée alternative par alternative", () => {
    const s = calculateProposalSummary({
      id: "x",
      contractDurationMonths: 36,
      products: [
        {
          id: "a",
          name: "A",
          scenarios: [
            // Année 1 : 1000 + 2000 = 3000 ; 3 ans : 2000 + 3000 = 5000
            scenario({ subscriptions: [line("S", 1000)], services: [service("X", 2000)] }),
            // Année 1 : 2500 ; 3 ans : 7500
            scenario({ subscriptions: [line("P", 2500)] }),
          ],
        },
      ],
    });
    if (s.total.kind !== "RANGE") throw new Error("RANGE attendu");
    expect(money(s.total.range.min.firstYearTotal)).toBe("2500.00");
    expect(money(s.total.contractRange!.min)).toBe("5000.00");
    expect(money(s.total.contractRange!.max)).toBe("7500.00");
  });
});
