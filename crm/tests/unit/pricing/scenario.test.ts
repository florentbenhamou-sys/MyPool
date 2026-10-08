import { describe, expect, it } from "vitest";
import { calculateContractTotal, calculateScenarioSummary, toDecimal } from "@/domain/pricing";
import { line, money, scenario, service } from "./helpers";

describe("calculateScenarioSummary", () => {
  it("1. souscription sans remise", () => {
    const s = calculateScenarioSummary(scenario({ subscriptions: [line("S1", 1000)] }));
    expect(money(s.subscriptionTotal)).toBe("1000.00");
    expect(money(s.annualRecurringTotal)).toBe("1000.00");
    expect(money(s.oneShotTotal)).toBe("0.00");
    expect(money(s.discountTotal)).toBe("0.00");
  });

  it("2. souscription avec remise", () => {
    const s = calculateScenarioSummary(scenario({ subscriptions: [line("S1", 1000, 20)] }));
    expect(money(s.annualRecurringTotal)).toBe("800.00");
    expect(money(s.discountTotal)).toBe("200.00");
  });

  it("3. service (one shot)", () => {
    const s = calculateScenarioSummary(scenario({ services: [service("SVC1", 500, [], 10)] }));
    expect(money(s.serviceTotal)).toBe("450.00");
    expect(money(s.oneShotTotal)).toBe("450.00");
    expect(money(s.annualRecurringTotal)).toBe("0.00");
  });

  it("4. service + option", () => {
    const s = calculateScenarioSummary(
      scenario({ services: [service("SVC1", 500, [line("OPT", 100, 50)])] }),
    );
    expect(money(s.serviceTotal)).toBe("500.00");
    expect(money(s.serviceOptionTotal)).toBe("50.00");
    expect(money(s.oneShotTotal)).toBe("550.00");
  });

  it("5. maintenance (one shot)", () => {
    const s = calculateScenarioSummary(scenario({ maintenances: [line("MAINT", 300)] }));
    expect(money(s.maintenanceTotal)).toBe("300.00");
    expect(money(s.oneShotTotal)).toBe("300.00");
  });

  it("6. option additionnelle libre (one shot)", () => {
    const s = calculateScenarioSummary(
      scenario({ additionalOptions: [line("Formation", 200, 25)] }),
    );
    expect(money(s.additionalOptionTotal)).toBe("150.00");
    expect(money(s.oneShotTotal)).toBe("150.00");
  });

  it("7. scénario complet", () => {
    const s = calculateScenarioSummary(
      scenario({
        subscriptions: [line("S1", 1000)],
        services: [service("SVC1", 200, [line("OPT1", 100)])],
        maintenances: [line("M1", 50)],
        additionalOptions: [line("FREE", 0)],
      }),
    );
    expect(money(s.annualRecurringTotal)).toBe("1000.00");
    expect(money(s.oneShotTotal)).toBe("350.00");
    expect(money(s.firstYearTotal)).toBe("1350.00");
    expect(money(s.yearNTotal)).toBe("1000.00");
    expect({
      subscription: money(s.subscriptionTotal),
      service: money(s.serviceTotal),
      option: money(s.serviceOptionTotal),
      maintenance: money(s.maintenanceTotal),
      additional: money(s.additionalOptionTotal),
    }).toEqual({
      subscription: "1000.00",
      service: "200.00",
      option: "100.00",
      maintenance: "50.00",
      additional: "0.00",
    });
  });

  it("9. plusieurs souscriptions sont additionnées dans le total annuel", () => {
    const s = calculateScenarioSummary(
      scenario({ subscriptions: [line("S1", 100), line("S2", 150, 10)] }),
    );
    expect(money(s.annualRecurringTotal)).toBe("235.00");
  });

  it("10. plusieurs services sont additionnés dans le one shot", () => {
    const s = calculateScenarioSummary(
      scenario({ services: [service("SVC1", 25, [line("OPT", 10)]), service("SVC2", 30)] }),
    );
    expect(money(s.serviceTotal)).toBe("55.00");
    expect(money(s.serviceOptionTotal)).toBe("10.00");
    expect(money(s.oneShotTotal)).toBe("65.00");
  });

  it("11. total année 1 = annuel + one shot ; année N = annuel", () => {
    const s = calculateScenarioSummary(
      scenario({ subscriptions: [line("S1", 1250)], services: [service("SVC", 3500)] }),
    );
    expect(money(s.firstYearTotal)).toBe("4750.00");
    expect(money(s.yearNTotal)).toBe("1250.00");
  });

  it("12. scénario sans option", () => {
    const s = calculateScenarioSummary(
      scenario({ subscriptions: [line("S1", 100)], services: [service("SVC1", 25)] }),
    );
    expect(money(s.serviceOptionTotal)).toBe("0.00");
    expect(money(s.additionalOptionTotal)).toBe("0.00");
    expect(money(s.firstYearTotal)).toBe("125.00");
  });

  it("13. scénario sans service", () => {
    const s = calculateScenarioSummary(
      scenario({ subscriptions: [line("S1", 100)], maintenances: [line("M", 20)] }),
    );
    expect(money(s.serviceTotal)).toBe("0.00");
    expect(money(s.oneShotTotal)).toBe("20.00");
    expect(money(s.firstYearTotal)).toBe("120.00");
  });

  it("14. scénario sans souscription", () => {
    const s = calculateScenarioSummary(scenario({ services: [service("SVC1", 25)] }));
    expect(money(s.annualRecurringTotal)).toBe("0.00");
    expect(money(s.firstYearTotal)).toBe("25.00");
    expect(money(s.yearNTotal)).toBe("0.00");
  });

  it("scénario vide : tout à zéro", () => {
    const s = calculateScenarioSummary(scenario());
    expect(money(s.firstYearTotal)).toBe("0.00");
  });

  it("utilise le prix client STOCKÉ (historique), pas un recalcul", () => {
    const frozen = { ...line("S1", 1000, 20), customerPrice: toDecimal("777.77") };
    const s = calculateScenarioSummary(scenario({ subscriptions: [frozen] }));
    expect(money(s.annualRecurringTotal)).toBe("777.77");
  });

  it("total sur la durée du contrat (36 mois)", () => {
    expect(money(calculateContractTotal(toDecimal(1000), toDecimal(500), 36))).toBe("3500.00");
    expect(money(calculateContractTotal(toDecimal(1000), toDecimal(0), 18))).toBe("1500.00");
  });
});
